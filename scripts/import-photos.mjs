import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, basename, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createClient} from '@sanity/client';

// Validates locally by default. --write uploads original binaries and appends
// photographs to the existing draft only. It never publishes or changes placement.
// Stable hashes and asset-reference checks make interrupted imports resumable.
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const allowedCategories = new Set(['families', 'seniors', 'athletes', 'couples', 'events', 'about']);
const sha1 = (bytes) => createHash('sha1').update(bytes).digest('hex');
const assetFields = '{_id,sha1hash,originalFilename,url,size,metadata{dimensions}}';
const withoutSystemAndPhotos = (document) => Object.fromEntries(
  Object.entries(document || {}).filter(([key]) => key !== 'photos' && !['_id', '_rev', '_createdAt', '_updatedAt', '_system'].includes(key)),
);

async function main() {
  const manifestPath = option('--manifest');
  const directory = option('--directory');
  const reportPath = option('--report');
  if (!manifestPath || !directory) throw new Error('Provide --manifest <JSON file> and --directory <original image folder>.');
  if (args.includes('--write') && !reportPath) throw new Error('A --report path is required for writes.');
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  if (!manifest.projectId || !manifest.dataset || !manifest.documentId || !Array.isArray(manifest.photos) || !manifest.photos.length) {
    throw new Error('The import manifest is incomplete.');
  }
  if (manifest.documentId.startsWith('drafts.')) throw new Error('The manifest must name the published document ID.');
  const files = [];
  const names = new Set();
  const hashes = new Set();
  for (const photo of manifest.photos) {
    if (typeof photo.filename !== 'string' || basename(photo.filename) !== photo.filename || !/^[a-zA-Z0-9][a-zA-Z0-9_. -]*\.(?:webp|jpe?g)$/i.test(photo.filename)) {
      throw new Error('An unsafe or unsupported image filename was supplied.');
    }
    if (names.has(photo.filename) || hashes.has(photo.sha1)) throw new Error('The manifest contains duplicate names or image hashes.');
    if (!photo.title?.includes(photo.filename) || !photo.alt?.trim() || photo.alt.length > 500 || !allowedCategories.has(photo.category)) {
      throw new Error(`Incomplete photograph metadata: ${photo.filename}`);
    }
    const bytes = await readFile(resolve(directory, photo.filename));
    const isWebp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const contentType = isWebp ? 'image/webp' : isJpeg ? 'image/jpeg' : null;
    if (!contentType || (/\.webp$/i.test(photo.filename) ? !isWebp : !isJpeg)) throw new Error(`Image contents do not match the filename: ${photo.filename}`);
    if (sha1(bytes) !== photo.sha1 || bytes.length !== photo.bytes) throw new Error(`Original file does not match the manifest: ${photo.filename}`);
    names.add(photo.filename);
    hashes.add(photo.sha1);
    files.push({photo, bytes, contentType});
  }
  console.log(`Validated ${files.length} unique original photographs (${files.reduce((sum, {bytes}) => sum + bytes.length, 0)} bytes).`);
  if (!args.includes('--write')) {
    console.log('Local validation complete. No API requests or changes were made.');
    return;
  }
  const projectId = process.env.SANITY_API_PROJECT_ID;
  const dataset = process.env.SANITY_API_DATASET;
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token || projectId !== manifest.projectId || dataset !== manifest.dataset) throw new Error('Configured Sanity credentials do not match the import destination.');
  const client = createClient({projectId, dataset, token, apiVersion: '2026-10-01', perspective: 'raw', useCdn: false, maxRetries: 0});
  const publishedId = manifest.documentId;
  const draftId = `drafts.${publishedId}`;
  const readDocuments = () => client.fetch('*[_id in $ids]', {ids: [publishedId, draftId]}, {perspective: 'raw'});
  const initialDocuments = await readDocuments();
  const initialPublished = initialDocuments.find((document) => document._id === publishedId);
  const initialDraft = initialDocuments.find((document) => document._id === draftId);
  if (!(initialDraft || initialPublished)) throw new Error('The existing photography website document could not be found.');
  let report = {
    importId: manifest.importId, projectId, dataset, publishedId, draftId,
    startedAt: new Date().toISOString(), status: 'uploading', originals: files.length,
    publishedRevisionBefore: initialPublished?._rev || null,
    draftRevisionBefore: initialDraft?._rev || null,
    initialDraftPhotoCount: (initialDraft || initialPublished).photos?.length || 0,
    assetUploads: 0, reusedAssets: 0, photos: [],
  };
  const appendOnly = args.includes('--append-only');
  if (appendOnly) {
    const saved = JSON.parse(await readFile(resolve(reportPath), 'utf8'));
    const byName = new Map(files.map(({photo}) => [photo.filename, photo]));
    if (saved.importId !== manifest.importId || saved.projectId !== projectId || saved.dataset !== dataset || saved.publishedId !== publishedId || saved.draftId !== draftId ||
        !Array.isArray(saved.photos) || saved.photos.length !== files.length || new Set(saved.photos.map((photo) => photo.filename)).size !== files.length ||
        saved.photos.some((photo) => !photo.assetId || byName.get(photo.filename)?.sha1 !== photo.sha1)) {
      throw new Error('The saved report does not contain every original uploaded asset; append-only resume was cancelled.');
    }
    report = {...saved, status: 'verifying-uploaded-assets', resumedAt: new Date().toISOString()};
  }
  const saveReport = async () => {
    await mkdir(dirname(resolve(reportPath)), {recursive: true});
    await writeFile(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`);
  };
  await saveReport();
  const existingAssets = await client.fetch(`*[_type == "sanity.imageAsset" && sha1hash in $hashes]${assetFields}`, {hashes: [...hashes]});
  const assetsByHash = new Map(existingAssets.map((asset) => [asset.sha1hash, asset]));
  for (const {photo, bytes, contentType} of files) {
    let asset = assetsByHash.get(photo.sha1);
    if (appendOnly) {
      const saved = report.photos.find((entry) => entry.filename === photo.filename);
      if (!asset || asset._id !== saved.assetId || asset.sha1hash !== photo.sha1 || asset.size !== photo.bytes) throw new Error(`Saved asset failed verification: ${photo.filename}`);
      continue;
    }
    if (asset) {
      report.reusedAssets += 1;
    } else {
      asset = await client.assets.upload('image', bytes, {filename: photo.filename, contentType, label: photo.title});
      assetsByHash.set(photo.sha1, asset);
      report.assetUploads += 1;
    }
    if (asset.sha1hash !== photo.sha1 || asset.size !== photo.bytes) throw new Error(`Uploaded bytes failed verification: ${photo.filename}`);
    report.photos.push({...photo, assetId: asset._id, url: asset.url});
    await saveReport();
    if (report.photos.length % 10 === 0 || report.photos.length === files.length) console.log(`Original assets ready: ${report.photos.length}/${files.length}`);
  }

  const desiredPhotos = report.photos.map((photo) => ({
    _type: 'photographyPhoto', _key: `photo_${photo.sha1}`, key: `photo_${photo.sha1}`,
    title: photo.title, alt: photo.alt, category: photo.category,
    image: {_type: 'image', asset: {_type: 'reference', _ref: photo.assetId}},
  }));
  let patchBase;
  let addedPhotos = [];
  let reconciled = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const currentDocuments = await readDocuments();
    const currentDraft = currentDocuments.find((document) => document._id === draftId);
    const base = currentDraft || currentDocuments.find((document) => document._id === publishedId);
    if (!base || (base.photos !== undefined && !Array.isArray(base.photos))) throw new Error('The current photograph library is missing or malformed; it was left unchanged.');
    const currentPhotos = base.photos || [];
    const existingRefs = new Set(currentPhotos.map((photo) => photo?.image?.asset?._ref).filter(Boolean));
    const keys = new Set(currentPhotos.flatMap((photo) => [photo?._key, photo?.key]).filter(Boolean));
    const missingPhotos = desiredPhotos.filter((photo) => !existingRefs.has(photo.image.asset._ref));
    if (missingPhotos.some((photo) => keys.has(photo._key) || keys.has(photo.key))) throw new Error('A photograph key conflicts with existing content; no draft edit was made.');
    if (!missingPhotos.length) {
      patchBase ||= base;
      reconciled = true;
      break;
    }
    if (!currentDraft) {
      // Establish a draft with an idempotent operation, then re-read it. Never
      // append without a draft revision, even if publication happened mid-import.
      await client.action({actionType: 'sanity.action.document.edit', publishedId, draftId,
        patch: {setIfMissing: {photos: []}}});
      continue;
    }
    // Ordinary draft mutations support ifRevisionID. The Actions API rejects
    // that field despite the installed SDK's broader PatchOperations type.
    const patch = client.patch(draftId).ifRevisionId(currentDraft._rev)
      .setIfMissing({photos: []}).insert('after', 'photos[-1]', missingPhotos);
    patchBase = structuredClone(base);
    addedPhotos = missingPhotos;
    report.status = 'appending-to-draft';
    report.appendBaseRevision = base._rev;
    report.intendedNewEntries = missingPhotos.length;
    await saveReport();
    try {
      await patch.commit({dryRun: true});
      await patch.commit();
      reconciled = true;
      break;
    } catch (error) {
      // A revision conflict or an ambiguous network error requires a fresh read,
      // never an automatic replay of the same array insertion.
      const status = error?.statusCode || error?.response?.statusCode;
      if (status && status < 500 && status !== 409) throw error;
      console.log('Re-reading the draft before reconciling the pending photograph entries.');
    }
  }
  if (!reconciled) throw new Error('The draft is still changing; assets are uploaded, but the append must be reconciled before retrying.');

  const finalDocuments = await readDocuments();
  const finalDraft = finalDocuments.find((document) => document._id === draftId);
  const finalPublished = finalDocuments.find((document) => document._id === publishedId);
  const finalLibrary = finalDraft || finalPublished;
  const verifiedAssets = await client.fetch(`*[_type == "sanity.imageAsset" && sha1hash in $hashes]${assetFields}`, {hashes: [...hashes]});
  const verifiedById = new Map(verifiedAssets.map((asset) => [asset._id, asset]));
  for (const photo of report.photos) {
    const asset = verifiedById.get(photo.assetId);
    const entries = finalLibrary?.photos?.filter((entry) => entry?.image?.asset?._ref === photo.assetId) || [];
    if (!asset || asset.sha1hash !== photo.sha1 || asset.size !== photo.bytes || !entries.some((entry) => entry.key && entry.title && entry.alt && entry.category)) {
      throw new Error(`Asset or editor selection verification failed: ${photo.filename}`);
    }
    photo.photoKeys = entries.map((entry) => entry.key).filter(Boolean);
  }
  const originalEntries = patchBase.photos || [];
  const sameExistingEntries = originalEntries.every((photo) => finalLibrary.photos.some((candidate) => isDeepStrictEqual(candidate, photo)));
  const sameOtherFields = isDeepStrictEqual(withoutSystemAndPhotos(patchBase), withoutSystemAndPhotos(finalLibrary));
  report.completedAt = new Date().toISOString();
  report.draftRevisionAfter = finalDraft?._rev || null;
  report.finalDraftPhotoCount = finalLibrary.photos.length;
  report.newEntries = addedPhotos.length;
  report.verifiedAssets = verifiedAssets.length;
  report.verifiedSelectablePhotos = report.photos.length;
  report.publishedUnchanged = (initialPublished?._rev || null) === report.publishedRevisionBefore && isDeepStrictEqual(initialPublished, finalPublished);
  report.existingDraftEntriesUnchanged = sameExistingEntries;
  report.otherDraftFieldsUnchanged = sameOtherFields;
  report.incompleteExistingEntries = originalEntries.filter((photo) => !photo?.key || !photo?.title || !photo?.alt || !photo?.category || !photo?.image?.asset?._ref).map((photo) => ({key: photo?.key || null, title: photo?.title || null}));
  report.status = sameExistingEntries && sameOtherFields && report.publishedUnchanged ? 'complete' : 'needs-review';
  await saveReport();
  console.log(JSON.stringify({status: report.status, uploaded: report.assetUploads, reused: report.reusedAssets, selectable: report.verifiedSelectablePhotos, draftTotal: report.finalDraftPhotoCount, publishedUnchanged: report.publishedUnchanged, existingDraftEntriesUnchanged: sameExistingEntries, otherDraftFieldsUnchanged: sameOtherFields, incompleteExistingEntries: report.incompleteExistingEntries.length}));
  if (report.status === 'needs-review') {
    console.log('Concurrent website edits were detected. The importer only appended photograph entries; review the report before any follow-up edits.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // Provider errors can contain headers and request credentials. Never print them.
  const providerError = error?.request || error?.response || error?.statusCode;
  console.error(providerError ? `Photo import stopped with provider status ${error?.statusCode || error?.response?.statusCode || 'unavailable'}. Inspect the saved progress report before retrying.` : `Photo import stopped: ${error?.message || 'Unknown local error.'}`);
  process.exitCode = 1;
});
