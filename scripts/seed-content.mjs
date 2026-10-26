import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from '@sanity/client';

// Safe by default: no API requests or writes occur without --write.
// Never replaces existing published content or a draft. Rerunning after success is a no-op.
const defaults = JSON.parse(await readFile(new URL('../content/default-content.json', import.meta.url), 'utf8'));
const writeRequested = process.argv.includes('--write');
const projectId = process.env.SANITY_API_PROJECT_ID;
const dataset = process.env.SANITY_API_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
const stableKey = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

function cmsValue(value, path) {
  if (Array.isArray(value)) return value.map((item, index) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const identifier = item.id || item.route || item.priceKey || String(index);
      return {...cmsValue(item, [...path, 'item']), _type: `${path.join('_')}_item`, _key: stableKey(`${path.join('.')}:${identifier}`)};
    }
    return item;
  });
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cmsValue(item, [...path, key])]));
  return value;
}

function imageMime(buffer) {
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buffer[0] === 0x89 && buffer.subarray(1, 4).toString() === 'PNG') return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  throw new Error('An unsupported image format was found.');
}

async function main() {
  const assets = [];
  for (const photo of defaults.photos) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(photo.file)) throw new Error('Unsafe asset filename.');
    const path = new URL(`../public/assets/${photo.file}`, import.meta.url);
    const buffer = await readFile(path);
    assets.push({photo, buffer, contentType: imageMime(buffer), sha1: createHash('sha1').update(buffer).digest('hex')});
  }
  if (!writeRequested) {
    console.log(`Dry run complete: ${assets.length} images and ${defaults.copy.testimonials.length} reviews are ready for singleton ${defaults._id}.`);
    console.log('No API requests were made. After review, run: npm run seed -- --write');
    return;
  }
  if (!projectId || !dataset || !token) throw new Error('The server-side Sanity write configuration is incomplete.');
  if (process.env.SANITY_STUDIO_PROJECT_ID && process.env.SANITY_STUDIO_PROJECT_ID !== projectId) throw new Error('Server and Studio project identifiers do not match.');
  if (process.env.SANITY_STUDIO_DATASET && process.env.SANITY_STUDIO_DATASET !== dataset) throw new Error('Server and Studio datasets do not match.');
  const client = createClient({projectId, dataset, token, apiVersion: '2026-10-01', perspective: 'raw', useCdn: false});
  const ids = [defaults._id, `drafts.${defaults._id}`];
  const exists = () => client.fetch('count(*[_id in $ids]) > 0', {ids}, {perspective: 'raw'});
  if (await exists()) {
    console.log('The photography singleton or its draft already exists. All existing content was left unchanged.');
    return;
  }
  const photos = [];
  for (const {photo, buffer, contentType, sha1} of assets) {
    let asset = await client.fetch('*[_type == "sanity.imageAsset" && sha1hash == $sha1][0]{_id}', {sha1});
    if (!asset) asset = await client.assets.upload('image', buffer, {filename: photo.file, contentType, label: photo.title});
    photos.push({_type: 'photographyPhoto', _key: photo.key, key: photo.key, title: photo.title, alt: photo.alt, category: photo.category,
      image: {_type: 'image', asset: {_type: 'reference', _ref: asset._id}},
    });
    console.log(`Image ready: ${photo.key}`);
  }
  if (await exists()) {
    console.log('Content was created during image preparation. Existing content was left unchanged.');
    return;
  }
  const document = {
    _id: defaults._id, _type: defaults._type,
    copy: cmsValue(defaults.copy, ['copy']), settings: defaults.settings, prices: defaults.prices, photos,
    featuredPhotos: defaults.featuredPhotos.map((frame, index) => ({...frame, _type: 'heroFrame', _key: `frame-${index + 1}`})),
    portfolioOrder: defaults.portfolioOrder,
  };
  await client.createIfNotExists(document);
  console.log(`Published ${defaults._id} with ${photos.length} images. No existing documents were replaced.`);
}

main().catch((error) => {
  // Never dump request objects, headers, environment values, or provider error bodies.
  const safeMessage = error instanceof Error && !error.request && !error.response
    ? error.message.replace(/(?:sk|token|secret)[-_][a-zA-Z0-9_-]+/gi, '[redacted]')
    : 'The seed could not finish. Check the configured project, dataset, and write permissions.';
  console.error(`Content seed stopped: ${safeMessage}`);
  process.exitCode = 1;
});
