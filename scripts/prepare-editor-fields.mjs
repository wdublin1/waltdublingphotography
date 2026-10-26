import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

// A draft-only, additive migration, not a seed or a content synchronizer.
// The allowlist below records only fields introduced by the editor expansion.
// Baseline: default-content-before.json, SHA-256
// d2e714f8e0c81703b08f0d61b604e4319b8ecfaf4640c5749786efb6c7c3b858.
// The baseline file is not needed at runtime. New migrations must explicitly
// extend this specification rather than copying every missing default field.
export const MIGRATION_ID = 'editor-fields-v1';
export const CONTENT_ID = 'walt-photography-site';
export const CONTENT_TYPE = 'photographySite';
const DRAFT_ID = `drafts.${CONTENT_ID}`;

const objectFields = {
  '': ['navigation', 'interfaceCopy'],
  'settings': ['bookingHref', 'bookingNewTab', 'brandName', 'businessDescription', 'areaServed'],
  'copy.home': ['closingButton', 'closingHref', 'closingNewTab', 'locationLabel', 'personalEyebrow', 'directoryEyebrow', 'reviewEyebrow', 'inquiryLink', 'aboutLink', 'pricingLink', 'reviewsLink'],
  'copy.about': ['closingButton', 'closingHref', 'closingNewTab', 'eyebrow', 'location', 'signature', 'portfolioLink'],
  'copy.families': ['closingHref', 'closingNewTab', 'eyebrow', 'heroLink', 'familyPriceCopy', 'individualPriceCopy', 'familyLink', 'individualLink', 'pricingLink'],
  'copy.seniors': ['closingHref', 'closingNewTab', 'eyebrow', 'heroLink', 'priceCopy', 'quoteExplanation', 'inquiryLink'],
  'copy.athletes': ['closingHref', 'closingNewTab', 'eyebrow', 'priceCopy', 'heroLink', 'teamLink'],
  'copy.pricing': ['closingButton', 'closingHref', 'closingNewTab', 'priceTemplate', 'customPriceLabel', 'teamLink'],
  'copy.contact': ['eyebrow', 'personName', 'location', 'emailLink', 'priceCopy', 'pricingLink', 'form'],
  'copy.reviews': ['closingButton', 'closingHref', 'closingNewTab'],
  'copy.portfolio': ['closingButton', 'closingHref', 'closingNewTab', 'filterLabels'],
  'copy.clients': ['emailHref', 'emailNewTab'],
  'copy.shared': ['graduationLinkHref', 'graduationLinkNewTab', 'sportLinkHref', 'sportLinkNewTab'],
};
const arrayFields = [
  {path: ['copy', 'home', 'services'], fields: ['href', 'newTab'], identities: ['route']},
  {path: ['copy', 'pricing', 'sessions'], fields: ['linkLabel', 'linkHref', 'linkNewTab'], identities: ['priceKey', 'type']},
];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => isRecord(value) && Object.hasOwn(value, key);
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);
const keyFields = ['key', 'id', 'route', 'priceKey', 'type', 'href'];
const identityValue = (value) => typeof value === 'string' && value.length > 0;
const readPath = (object, path) => path.reduce((value, key) => own(value, key) ? value[key] : undefined, object);
const pathText = (path) => path.map((part, index) => typeof part === 'string'
  ? `${index ? '.' : ''}${part}` : `[_key==${JSON.stringify(part._key)}]`).join('');

// Only called for entirely new values. Existing array keys and order are never
// regenerated. New object-array members use the same _type names as the schema.
function cmsValue(value, path) {
  if (Array.isArray(value)) {
    const used = new Set();
    return value.map((item) => {
      if (!isRecord(item)) return structuredClone(item);
      const identityField = keyFields.find((field) => identityValue(item[field]));
      const identity = identityField ? `${identityField}:${item[identityField]}` : JSON.stringify(item);
      let key = identityValue(item._key) ? item._key : `editor_${hash(`${MIGRATION_ID}:${path.join('.')}:${identity}`)}`;
      let occurrence = 1;
      while (used.has(key)) {
        if (identityValue(item._key)) throw new MigrationError('The defaults contain duplicate array keys. No changes were made.');
        key = `editor_${hash(`${MIGRATION_ID}:${path.join('.')}:${identity}:${occurrence++}`)}`;
      }
      used.add(key);
      return {...cmsValue(item, [...path, 'item']), _type: item._type || `${path.join('_')}_item`, _key: key};
    });
  }
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cmsValue(item, [...path, key])]));
  return structuredClone(value);
}

function additionsFromDefaults(defaults) {
  const selected = {};
  for (const [parent, fields] of Object.entries(objectFields)) {
    const path = parent ? parent.split('.') : [];
    const source = readPath(defaults, path);
    if (!isRecord(source)) continue;
    const values = Object.fromEntries(fields.filter((field) => own(source, field)).map((field) => [field, source[field]]));
    if (!Object.keys(values).length) continue;
    let target = selected;
    for (const key of path) target = target[key] ||= {};
    Object.assign(target, values);
  }
  return selected;
}

function matchingDefault(item, defaults, identities, schemaPath) {
  let matches = defaults.map((candidate, index) => ({candidate, index})).filter(({candidate}) => isRecord(candidate));
  let hasIdentity = false;
  for (const field of identities) {
    if (!identityValue(item[field]) || !defaults.some((candidate) => identityValue(candidate?.[field]))) continue;
    hasIdentity = true;
    matches = matches.filter(({candidate}) => candidate[field] === item[field]);
  }
  if (!hasIdentity && identityValue(item._key)) {
    // Exact stable keys are a fallback when technical identity fields are absent.
    // The legacy seed used a path + route/priceKey hash; no positional key is used.
    const keyed = cmsValue(defaults, schemaPath);
    matches = matches.filter(({candidate, index}) => {
      const legacyIdentity = candidate.id || candidate.route || candidate.priceKey;
      const legacyKey = legacyIdentity ? hash(`${schemaPath.join('.')}:${legacyIdentity}`) : null;
      return candidate._key === item._key || keyed[index]._key === item._key || legacyKey === item._key;
    });
    hasIdentity = true;
  }
  return hasIdentity && matches.length === 1 ? matches[0].index : null;
}

/**
 * Return setIfMissing operations for introduced editor fields only.
 * Inputs are not changed. Explicit null/empty/false values are preserved.
 * Existing arrays are never filled, reordered, replaced, or matched by index.
 * A missing whole NEW object/array may be added; missing legacy arrays may not.
 */
export function computeEditorFieldPatches(document, defaults) {
  if (!isRecord(document) || !isRecord(defaults)) throw new MigrationError('The document and defaults must be JSON objects.');
  const operations = [];
  const skipped = [];
  const add = (segments, value, schemaPath) => operations.push({path: pathText(segments), segments, value: cmsValue(value, schemaPath)});
  const skip = (segments, reason) => skipped.push({path: pathText(segments), reason});

  function visit(current, desired, segments, schemaPath) {
    for (const [field, value] of Object.entries(desired)) {
      if (field.startsWith('_')) continue;
      const next = [...segments, field];
      const nextSchema = [...schemaPath, field];
      if (!own(current, field)) add(next, value, nextSchema);
      else if (isRecord(value)) {
        if (isRecord(current[field])) visit(current[field], value, next, nextSchema);
        else skip(next, 'An explicit existing non-object value was preserved.');
      } else if (Array.isArray(value)) {
        if (Array.isArray(current[field])) visitArray(current[field], value, next, nextSchema);
        else skip(next, 'An explicit existing non-array value was preserved.');
      }
    }
  }

  function visitArray(current, desired, segments, schemaPath, fields, identities = keyFields) {
    if (!desired.some(isRecord)) return; // Preserve existing primitive arrays exactly.
    const matches = current.map((item) => isRecord(item) ? matchingDefault(item, desired, identities, schemaPath) : null);
    const keyCounts = new Map();
    const matchCounts = new Map();
    for (let index = 0; index < current.length; index += 1) {
      const key = current[index]?._key;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      if (matches[index] !== null) matchCounts.set(matches[index], (matchCounts.get(matches[index]) || 0) + 1);
    }
    current.forEach((item, index) => {
      if (!isRecord(item) || !identityValue(item._key) || keyCounts.get(item._key) !== 1) {
        skip(segments, 'An existing array member has no unique _key; it was not addressed by position.');
        return;
      }
      const next = [...segments, {_key: item._key}];
      const matched = matches[index];
      if (matched === null || matchCounts.get(matched) !== 1) {
        skip(next, 'No unique technical-identity match exists in the defaults; this member was preserved.');
        return;
      }
      const source = desired[matched];
      const selected = fields ? Object.fromEntries(fields.filter((field) => own(source, field)).map((field) => [field, source[field]])) : source;
      visit(item, selected, next, [...schemaPath, 'item']);
    });
  }

  visit(document, additionsFromDefaults(defaults), [], []);
  for (const {path, fields, identities} of arrayFields) {
    const current = readPath(document, path);
    const desired = readPath(defaults, path);
    if (!Array.isArray(desired)) continue;
    if (!Array.isArray(current)) {
      skip(path, 'A legacy array is absent or not an array; no default members were inserted.');
      continue;
    }
    visitArray(current, desired, path, path, fields, identities);
  }
  return {
    migrationId: MIGRATION_ID,
    setIfMissing: Object.fromEntries(operations.map(({path, value}) => [path, value])),
    operations,
    paths: operations.map(({path}) => path),
    skipped,
  };
}

class MigrationError extends Error {}
const statusOf = (error) => error?.statusCode || error?.response?.statusCode || error?.response?.status;
const planSummary = (plan) => ({fieldCount: plan.paths.length, fieldPaths: plan.paths, skipped: plan.skipped});

function preservesExisting(before, after, root = true) {
  if (Array.isArray(before)) return Array.isArray(after) && before.length === after.length && before.every((item, index) => preservesExisting(item, after[index], false));
  if (isRecord(before)) return isRecord(after) && Object.entries(before).every(([key, value]) => root && ['_rev', '_updatedAt'].includes(key)
    || own(after, key) && preservesExisting(value, after[key], false));
  return isDeepStrictEqual(before, after);
}

function valueAtSegments(document, segments) {
  let value = document;
  for (const part of segments) {
    if (typeof part === 'string') {
      if (!own(value, part)) return undefined;
      value = value[part];
    } else {
      const matches = Array.isArray(value) ? value.filter((item) => item?._key === part._key) : [];
      if (matches.length !== 1) return undefined;
      value = matches[0];
    }
  }
  return value;
}

/** Inject a Sanity client. The default mode makes read requests only. */
export async function prepareEditorFields({client, defaults, apply = false, maxAttempts = 4}) {
  if (defaults?._id !== CONTENT_ID || defaults?._type !== CONTENT_TYPE) throw new MigrationError('The defaults do not describe the photography singleton.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new MigrationError('Use between one and ten revision-conflict attempts.');
  const read = async () => {
    const docs = await client.fetch('*[_id in $ids]', {ids: [CONTENT_ID, DRAFT_ID]}, {perspective: 'raw'});
    if (!Array.isArray(docs) || docs.some((doc) => ![CONTENT_ID, DRAFT_ID].includes(doc?._id) || doc._type !== CONTENT_TYPE || !doc._rev)
      || new Set(docs.map((doc) => doc._id)).size !== docs.length) throw new MigrationError('The fresh singleton response was unexpected; no content replacement was attempted.');
    const published = docs.find((doc) => doc._id === CONTENT_ID);
    const draft = docs.find((doc) => doc._id === DRAFT_ID);
    if (!published && !draft) throw new MigrationError('No existing photography document was found. This utility will not seed one.');
    return {published, draft};
  };
  const initial = await read();
  const initialPlan = computeEditorFieldPatches(initial.draft || initial.published, defaults);
  const summary = {
    migrationId: MIGRATION_ID, mode: apply ? 'apply' : 'plan', documentId: CONTENT_ID,
    publishedRevisionBefore: initial.published?._rev || null, draftRevisionBefore: initial.draft?._rev || null,
  };
  if (!apply) return {...summary, status: 'plan-only', needsDraft: !initial.draft && initialPlan.paths.length > 0, ...planSummary(initialPlan)};

  let createdDraft = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // A new read is mandatory after every 409, including a draft-creation race.
    let current = await read();
    if (!isDeepStrictEqual(initial.published, current.published)) throw new MigrationError('Published content changed during preparation. Stop and review a fresh plan before applying.');
    let plan = computeEditorFieldPatches(current.draft || current.published, defaults);
    if (!plan.paths.length) return {...summary, status: 'no-changes', createdDraft, attempts: attempt, ...planSummary(plan), publishedUnchanged: true};
    try {
      if (!current.draft) {
        // The Actions endpoint copies the CURRENT published document on the
        // server when a draft is missing. It cannot enforce ifRevisionID, so it
        // is used only for this harmless setIfMissing, never the backfill.
        await client.action({actionType: 'sanity.action.document.edit', publishedId: CONTENT_ID, draftId: DRAFT_ID, patch: {setIfMissing: {copy: {}}}});
        createdDraft = true;
        current = await read();
        if (!current.draft) throw new MigrationError('A draft was not available after preparation. No backfill was attempted.');
        if (!isDeepStrictEqual(initial.published, current.published)) throw new MigrationError('Published content changed while the draft was being prepared. Review the new draft before continuing.');
        plan = computeEditorFieldPatches(current.draft, defaults);
        if (!plan.paths.length) return {...summary, status: 'no-changes', createdDraft, attempts: attempt, ...planSummary(plan), publishedUnchanged: true};
      }
      const base = structuredClone(current.draft);
      // Ordinary mutations support the revision guard; Actions patches do not.
      const patch = client.patch(DRAFT_ID).ifRevisionId(base._rev).setIfMissing(plan.setIfMissing);
      await patch.commit({dryRun: true});
      await patch.commit();
      const final = await read();
      const publishedUnchanged = isDeepStrictEqual(initial.published, final.published);
      const existingDraftContentPreserved = !!final.draft && preservesExisting(base, final.draft);
      const newFieldsVerified = !!final.draft && plan.operations.every(({segments, value}) => isDeepStrictEqual(valueAtSegments(final.draft, segments), value));
      // If the content was already complete, no additional mutations are used
      // just to add a migration marker. Re-running remains an ordinary no-op.
      const status = publishedUnchanged && existingDraftContentPreserved && newFieldsVerified ? 'draft-updated' : 'needs-review';
      return {...summary, status, createdDraft, attempts: attempt, ...planSummary(plan), draftRevisionAfter: final.draft?._rev || null,
        publishedUnchanged, existingDraftContentPreserved, newFieldsVerified};
    } catch (error) {
      if (statusOf(error) === 409 && attempt < maxAttempts) continue;
      // A timeout or 5xx can be an ambiguous success. Do not replay it. A fresh
      // invocation will re-read and produce a new idempotent plan for review.
      throw error;
    }
  }
  throw new MigrationError('The draft is still changing. Review a fresh plan before retrying.');
}

async function main(args) {
  let apply = false;
  let documentPath;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--help' || args[index] === '-h') {
      console.log('Usage: node scripts/prepare-editor-fields.mjs [--document <fresh-document.json> | --apply]');
      console.log('Default: read Sanity and print a path-only plan. --document plans offline. --apply edits only a draft after fresh reads and revision checks. Deploy the expanded schema first.');
      return;
    }
    if (args[index] === '--apply' && !apply) apply = true;
    else if (args[index] === '--document' && !documentPath && args[index + 1] && !args[index + 1].startsWith('--')) documentPath = args[++index];
    else throw new MigrationError('Unknown, repeated, or incomplete argument. Use --help.');
  }
  if (apply && documentPath) throw new MigrationError('An offline document may only be used for a plan, not an apply.');
  const defaults = JSON.parse(await readFile(new URL('../content/default-content.json', import.meta.url), 'utf8'));
  if (documentPath) {
    const document = JSON.parse(await readFile(resolve(documentPath), 'utf8'));
    const plan = computeEditorFieldPatches(document, defaults);
    console.log(JSON.stringify({migrationId: MIGRATION_ID, mode: 'offline-plan', status: 'plan-only', ...planSummary(plan)}, null, 2));
    return;
  }
  const projectId = process.env.SANITY_API_PROJECT_ID;
  const dataset = process.env.SANITY_API_DATASET;
  const token = apply ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId || !dataset || !token) throw new MigrationError('Set the Sanity project, dataset, and a read token for planning or a write token for --apply. No content was seeded.');
  if (process.env.SANITY_STUDIO_PROJECT_ID && process.env.SANITY_STUDIO_PROJECT_ID !== projectId
    || process.env.SANITY_STUDIO_DATASET && process.env.SANITY_STUDIO_DATASET !== dataset) throw new MigrationError('The server and Studio destinations do not match.');
  const {createClient} = await import('@sanity/client');
  const client = createClient({projectId, dataset, token, apiVersion: '2026-10-01', perspective: 'raw', useCdn: false, maxRetries: 0});
  const result = await prepareEditorFields({client, defaults, apply});
  console.log(JSON.stringify({projectId, dataset, ...result}, null, 2));
  if (result.status === 'needs-review') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    // Provider errors may contain request headers, tokens, or user content.
    // Never print them, their stack, or an entire request/document.
    const status = Number(statusOf(error));
    const detail = error instanceof MigrationError ? error.message
      : Number.isInteger(status) && status > 0 ? `The provider returned status ${status}. Re-run a plan and review it before another apply.`
        : 'An unexpected local or network error occurred. Re-run a plan and review it before another apply.';
    console.error(`Editor preparation stopped. ${detail}`);
    process.exitCode = 1;
  });
}
