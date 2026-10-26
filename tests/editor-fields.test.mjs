import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {computeEditorFieldPatches, prepareEditorFields, CONTENT_ID, CONTENT_TYPE} from '../scripts/prepare-editor-fields.mjs';

const defaults = JSON.parse(await readFile(new URL('../content/default-content.json', import.meta.url), 'utf8'));
const draftId = `drafts.${CONTENT_ID}`;
const clone = (value) => structuredClone(value);
const draft = () => ({
  _id: draftId, _type: CONTENT_TYPE, _rev: 'draft-1', _createdAt: '2026-10-20T00:00:00Z',
  copy: {
    home: {headline: 'My edited headline', services: [
      {_key: 'athlete-original-key', _type: 'copy_home_services_item', route: 'athletes', title: 'My sports heading', copy: 'My sports prose'},
      {_key: 'family-original-key', _type: 'copy_home_services_item', route: 'families', title: 'My family heading', href: '/my-custom-family-link', newTab: true},
    ]},
    families: {headline: 'A page I already edited', closingButton: 'My existing invitation'},
    pricing: {sessions: [
      {_key: 'family-session-key', _type: 'copy_pricing_sessions_item', priceKey: 'family', type: 'Family portraits', title: 'My family session'},
      {_key: 'individual-session-key', _type: 'copy_pricing_sessions_item', priceKey: 'individual', type: 'Individual portraits', title: 'My personal session'},
    ]},
    testimonials: [{_key: 'review-kept', name: 'Existing client', quote: 'Do not replace my review', rating: 0}],
  },
  settings: {email: 'owner@example.test', bookingLabel: 'My invitation', socialLinks: {instagram: 'https://example.test/owner'}},
  prices: {individual: 125, family: 225},
  photos: [{_key: 'photo-kept', key: 'photo-kept', title: 'My uploaded photograph', image: {asset: {_ref: 'image-owner-123'}, crop: {top: 0.2}, hotspot: {x: 0.45, y: 0.5}}}],
  featuredPhotos: [{_key: 'frame-kept', photoKeys: ['photo-kept']}],
  portfolioOrder: ['photo-kept'],
  ownerOnly: {note: 'Unrecognized fields also belong to the owner'},
});

function applySetIfMissing(document, patches) {
  for (const [path, value] of Object.entries(patches)) {
    const parts = [];
    path.replace(/([A-Za-z_][\w]*)|\[_key==("(?:\\.|[^"\\])*")\]/g, (_, field, key) => {
      parts.push(field || {_key: JSON.parse(key)});
      return '';
    });
    let current = document;
    for (const part of parts.slice(0, -1)) {
      if (typeof part === 'string') current = current[part];
      else {
        assert.ok(Array.isArray(current));
        const matching = current.filter((item) => item._key === part._key);
        assert.equal(matching.length, 1);
        current = matching[0];
      }
      assert.ok(current && typeof current === 'object');
    }
    const field = parts.at(-1);
    assert.equal(typeof field, 'string');
    if (!Object.hasOwn(current, field)) current[field] = clone(value);
  }
  return document;
}

function mockClient({existingDraft = draft(), published, onCommit, onRead} = {}) {
  const state = {draft: clone(existingDraft), published: clone(published), calls: [], reads: 0};
  const client = {
    async fetch(_query, params, options) {
      assert.deepEqual(params.ids, [CONTENT_ID, draftId]);
      assert.equal(options.perspective, 'raw');
      state.reads += 1;
      await onRead?.(state);
      return clone([state.published, state.draft].filter(Boolean));
    },
    async action(action) {
      state.calls.push({kind: 'action', action: clone(action)});
      assert.deepEqual(action, {actionType: 'sanity.action.document.edit', publishedId: CONTENT_ID, draftId,
        patch: {setIfMissing: {copy: {}}}});
      if (!state.draft) {
        assert.ok(state.published);
        state.draft = {...clone(state.published), _id: draftId, _rev: 'created-draft-1'};
      }
      if (!Object.hasOwn(state.draft, 'copy')) state.draft.copy = {};
    },
    patch(id) {
      assert.equal(id, draftId, 'Published content must never be a patch target');
      let revision;
      let values;
      const patch = {
        ifRevisionId(value) {revision = value; return patch;},
        setIfMissing(value) {values = clone(value); return patch;},
        async commit(options = {}) {
          const dryRun = options.dryRun === true;
          state.calls.push({kind: dryRun ? 'dryRun' : 'commit', revision, values: clone(values)});
          await onCommit?.({state, dryRun, revision, values});
          if (state.draft?._rev !== revision) throw Object.assign(new Error('Conflict'), {statusCode: 409});
          if (!dryRun) {
            applySetIfMissing(state.draft, values);
            state.draft._rev = `written-${state.calls.length}`;
          }
          return clone(state.draft);
        },
      };
      return patch;
    },
  };
  return {client, state};
}

test('planner only adds introduced fields and does not mutate inputs or existing content', () => {
  const original = draft();
  const before = clone(original);
  const defaultsBefore = clone(defaults);
  const plan = computeEditorFieldPatches(original, defaults);
  assert.deepEqual(original, before);
  assert.deepEqual(defaults, defaultsBefore);
  const result = applySetIfMissing(clone(original), plan.setIfMissing);
  assert.equal(result.copy.home.headline, before.copy.home.headline);
  assert.equal(result.copy.families.closingButton, 'My existing invitation');
  assert.deepEqual(result.copy.testimonials, before.copy.testimonials);
  assert.deepEqual(result.photos, before.photos);
  assert.deepEqual(result.featuredPhotos, before.featuredPhotos);
  assert.deepEqual(result.portfolioOrder, before.portfolioOrder);
  assert.deepEqual(result.prices, before.prices);
  assert.deepEqual(result.ownerOnly, before.ownerOnly);
  assert.equal(result.settings.email, before.settings.email);
  assert.deepEqual(result.settings.socialLinks, before.settings.socialLinks);
  assert.equal(Object.hasOwn(result.copy.families, 'intro'), false, 'A missing legacy field must not be seeded');
  assert.equal(Object.hasOwn(result.copy.seniors, 'headline'), false, 'A missing legacy page only receives introduced fields');
  assert.equal(Object.hasOwn(result.copy.seniors, 'closingButton'), false, 'A missing legacy closingButton must not be seeded');
  assert.ok(result.interfaceCopy.apiMessages);
  assert.equal(computeEditorFieldPatches(result, defaults).paths.length, 0, 'Rerunning is a no-op');
});

test('reordered and shortened legacy arrays match by route and priceKey/type, never by index', () => {
  const original = draft();
  const result = applySetIfMissing(clone(original), computeEditorFieldPatches(original, defaults).setIfMissing);
  assert.deepEqual(result.copy.home.services.map((item) => item._key), ['athlete-original-key', 'family-original-key']);
  assert.equal(result.copy.home.services[0].href, '/athletes');
  assert.equal(result.copy.home.services[1].href, '/my-custom-family-link');
  assert.equal(result.copy.home.services[1].newTab, true);
  assert.equal(result.copy.home.services.length, 2, 'The omitted default service is not inserted');
  assert.deepEqual(result.copy.pricing.sessions.map((item) => item._key), ['family-session-key', 'individual-session-key']);
  assert.equal(result.copy.pricing.sessions[0].linkHref, '/contact?session=Family%20portraits');
  assert.equal(result.copy.pricing.sessions[1].linkHref, '/contact?session=Individual%20portraits');
  assert.equal(result.copy.pricing.sessions.length, 2);
  assert.equal(result.copy.pricing.sessions[0].title, 'My family session');
});

test('missing, empty, null and malformed legacy arrays are not restored', () => {
  for (const services of [undefined, [], null, 'Do not replace']) {
    const original = draft();
    if (services === undefined) delete original.copy.home.services;
    else original.copy.home.services = services;
    const result = applySetIfMissing(clone(original), computeEditorFieldPatches(original, defaults).setIfMissing);
    assert.deepEqual(result.copy.home.services, services);
    assert.equal(Object.hasOwn(result.copy.home, 'services'), services !== undefined);
  }
});

test('all explicit empty and falsy values survive, including partial new objects and arrays', () => {
  const original = draft();
  Object.assign(original.copy.home, {closingButton: '', closingHref: null, closingNewTab: false, personalEyebrow: 0,
    aboutLink: {label: 'My link', href: '', newTab: false}, inquiryLink: null});
  original.settings.areaServed = [];
  original.navigation = {headerLinks: [], menuLabel: ''};
  original.interfaceCopy = {apiMessages: {requiredName: ''}};
  const result = applySetIfMissing(clone(original), computeEditorFieldPatches(original, defaults).setIfMissing);
  for (const field of ['closingButton', 'closingHref', 'closingNewTab', 'personalEyebrow', 'aboutLink', 'inquiryLink']) {
    assert.deepEqual(result.copy.home[field], original.copy.home[field]);
  }
  assert.deepEqual(result.settings.areaServed, []);
  assert.deepEqual(result.navigation.headerLinks, []);
  assert.equal(result.navigation.menuLabel, '');
  assert.equal(result.interfaceCopy.apiMessages.requiredName, '');
  assert.equal(result.interfaceCopy.apiMessages.invalidEmail, defaults.interfaceCopy.apiMessages.invalidEmail);
});

test('new object arrays get deterministic unique schema keys without altering source defaults', () => {
  const first = computeEditorFieldPatches(draft(), defaults).setIfMissing.navigation;
  const second = computeEditorFieldPatches(draft(), defaults).setIfMissing.navigation;
  assert.deepEqual(first, second);
  for (const [field, values] of Object.entries(first)) {
    if (!Array.isArray(values)) continue;
    assert.equal(new Set(values.map((value) => value._key)).size, values.length);
    for (const value of values) {
      assert.match(value._key, /^editor_[a-f0-9]{16}$/);
      assert.equal(value._type, `navigation_${field}_item`);
    }
  }
  assert.equal(Object.hasOwn(defaults.navigation.headerLinks[0], '_key'), false);
});

test('existing new navigation arrays use unique destinations and retain custom members and order', () => {
  const original = draft();
  original.navigation = {headerLinks: [
    {_key: 'about-edited', href: '/about', label: 'My own words'},
    {_key: 'new-owner-link', href: 'https://example.test/custom', label: 'A custom page'},
  ]};
  const plan = computeEditorFieldPatches(original, defaults);
  const result = applySetIfMissing(clone(original), plan.setIfMissing);
  assert.deepEqual(result.navigation.headerLinks, [
    {_key: 'about-edited', href: '/about', label: 'My own words', newTab: false},
    {_key: 'new-owner-link', href: 'https://example.test/custom', label: 'A custom page'},
  ]);
  assert.ok(plan.skipped.some(({path}) => path.includes('new-owner-link')));
});

test('ambiguous identities, conflicting identities, missing keys and duplicate keys are skipped safely', () => {
  const original = draft();
  original.copy.home.services = [
    {_key: 'same-key', route: 'families'}, {_key: 'same-key', route: 'athletes'},
    {route: 'seniors'}, {_key: 'unknown', route: 'custom-service'},
  ];
  original.copy.pricing.sessions = [
    {_key: 'duplicate-a', priceKey: 'family', type: 'Family portraits'},
    {_key: 'duplicate-b', priceKey: 'family', type: 'Family portraits'},
    {_key: 'conflict', priceKey: 'individual', type: 'Family portraits'},
  ];
  const plan = computeEditorFieldPatches(original, defaults);
  assert.equal(plan.paths.some((path) => path.includes('services[') || path.includes('sessions[')), false);
  assert.ok(plan.skipped.length >= 7);
  const result = applySetIfMissing(clone(original), plan.setIfMissing);
  assert.deepEqual(result.copy.home.services, original.copy.home.services);
  assert.deepEqual(result.copy.pricing.sessions, original.copy.pricing.sessions);
});

test('legacy stable seed keys may identify a member when the technical field is absent', () => {
  const original = draft();
  const key = createHash('sha256').update('copy.home.services:athletes').digest('hex').slice(0, 16);
  original.copy.home.services = [{_key: key, title: 'My custom words'}];
  const result = applySetIfMissing(clone(original), computeEditorFieldPatches(original, defaults).setIfMissing);
  assert.deepEqual(result.copy.home.services, [{_key: key, title: 'My custom words', href: '/athletes', newTab: false}]);
});

test('default preparation is read-only and prints no content values in its result', async () => {
  const {client, state} = mockClient();
  const result = await prepareEditorFields({client, defaults});
  assert.equal(result.status, 'plan-only');
  assert.equal(state.calls.length, 0);
  assert.equal(state.reads, 1);
  assert.ok(result.fieldCount > 0);
  assert.equal(JSON.stringify(result).includes('My edited headline'), false);
  assert.equal(JSON.stringify(result).includes('owner@example.test'), false);
});

test('apply preserves a current unpublished draft and never changes published content', async () => {
  const published = {...draft(), _id: CONTENT_ID, _rev: 'published-1'};
  published.copy.home.headline = 'Older published wording';
  const {client, state} = mockClient({published});
  const result = await prepareEditorFields({client, defaults, apply: true});
  assert.equal(result.status, 'draft-updated');
  assert.equal(result.createdDraft, false);
  assert.equal(result.publishedUnchanged, true);
  assert.equal(result.existingDraftContentPreserved, true);
  assert.equal(result.newFieldsVerified, true);
  assert.deepEqual(state.published, published);
  assert.equal(state.draft.copy.home.headline, 'My edited headline');
  assert.deepEqual(state.calls.map(({kind}) => kind), ['dryRun', 'commit']);
  assert.equal(state.calls[1].revision, 'draft-1');
  assert.equal((await prepareEditorFields({client, defaults, apply: true})).status, 'no-changes');
  assert.equal(state.calls.length, 2);
});

test('a missing draft is established from current published content, then re-read before the guarded patch', async () => {
  const published = {...draft(), _id: CONTENT_ID, _rev: 'published-1'};
  const {client, state} = mockClient({existingDraft: undefined, published});
  // Explicitly remove the default fixture, as undefined otherwise selects it.
  state.draft = undefined;
  const result = await prepareEditorFields({client, defaults, apply: true});
  assert.equal(result.status, 'draft-updated');
  assert.equal(result.createdDraft, true);
  assert.deepEqual(state.calls.map(({kind}) => kind), ['action', 'dryRun', 'commit']);
  assert.equal(state.calls[2].revision, 'created-draft-1');
  assert.ok(state.reads >= 4);
  assert.deepEqual(state.published, published);
  assert.deepEqual(state.draft.photos, published.photos);
});

test('409 conflicts are retried only after a fresh read and a recomputed missing-field plan', async () => {
  let conflict = true;
  const {client, state} = mockClient({onCommit({state, dryRun}) {
    if (dryRun || !conflict) return;
    conflict = false;
    state.draft.copy.home.locationLabel = 'An owner edit made during migration';
    state.draft.copy.home.headline = 'Another live draft edit';
    state.draft._rev = 'concurrent-draft';
    throw Object.assign(new Error('Conflict'), {statusCode: 409});
  }});
  const result = await prepareEditorFields({client, defaults, apply: true});
  assert.equal(result.status, 'draft-updated');
  assert.equal(result.attempts, 2);
  const commits = state.calls.filter(({kind}) => kind === 'commit');
  assert.equal(commits.length, 2);
  assert.equal(commits[1].revision, 'concurrent-draft');
  assert.equal(Object.hasOwn(commits[0].values, 'copy.home.locationLabel'), true);
  assert.equal(Object.hasOwn(commits[1].values, 'copy.home.locationLabel'), false);
  assert.equal(state.draft.copy.home.locationLabel, 'An owner edit made during migration');
  assert.equal(state.draft.copy.home.headline, 'Another live draft edit');
});

test('ambiguous failures are not blindly replayed and can be inspected with a later read-only plan', async () => {
  const {client, state} = mockClient({onCommit({state, dryRun, values}) {
    if (dryRun) return;
    applySetIfMissing(state.draft, values);
    state.draft._rev = 'success-before-timeout';
    throw Object.assign(new Error('Network response lost'), {statusCode: 503});
  }});
  await assert.rejects(prepareEditorFields({client, defaults, apply: true}), {statusCode: 503});
  assert.equal(state.calls.filter(({kind}) => kind === 'commit').length, 1);
  const plan = await prepareEditorFields({client, defaults});
  assert.equal(plan.fieldCount, 0);
  assert.equal(state.calls.length, 2, 'A subsequent plan must not perform another write');
});

test('missing documents are not seeded and changed published content stops application', async () => {
  const absent = mockClient();
  absent.state.draft = undefined;
  await assert.rejects(prepareEditorFields({client: absent.client, defaults, apply: true}), /will not seed/);
  assert.equal(absent.state.calls.length, 0);
  const published = {...draft(), _id: CONTENT_ID, _rev: 'published-1'};
  const changing = mockClient({published, onRead(state) {
    if (state.reads === 2) state.published._rev = 'published-concurrently';
  }});
  await assert.rejects(prepareEditorFields({client: changing.client, defaults, apply: true}), /Published content changed/);
  assert.equal(changing.state.calls.length, 0);
});

test('verification reports needs-review rather than success if old content changes during the write', async () => {
  const {client} = mockClient({onRead(state) {
    if (state.calls.some(({kind}) => kind === 'commit')) state.draft.photos = [];
  }});
  const result = await prepareEditorFields({client, defaults, apply: true});
  assert.equal(result.status, 'needs-review');
  assert.equal(result.existingDraftContentPreserved, false);
  assert.equal(result.publishedUnchanged, true);
});
