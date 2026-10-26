import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeEditorialChanges, revisionSet} from '../scripts/apply-editorial-revision.mjs';

const clone = value => structuredClone(value);

// Deliberately independent of live CMS documents and repository content snapshots.
function fixture() {
  const previous = {
    _id: 'walt-photography-site',
    copy: {
      home: {
        headline: 'The previous home headline', intro: 'The previous introduction',
        personalParagraphs: ['The first previous paragraph', 'The second previous paragraph'],
        services: [
          {route: 'families', title: 'Individuals and families', copy: 'Family summary', href: '/families', newTab: false},
          {route: 'seniors', title: 'Seniors and graduates', copy: 'Graduate summary', href: '/seniors', newTab: false},
          {route: 'athletes', title: 'Athletes and teams', copy: 'Athlete summary', href: '/athletes', newTab: false},
        ],
      },
      families: {
        headline: 'The previous family headline', intro: 'The previous family introduction',
        sections: [{headline: 'Original section', paragraphs: ['Original paragraph']}],
        closingCopy: 'Original closing paragraph',
      },
      pricing: {
        headline: 'Starting prices',
        sessions: [
          {name: 'Individual portraits', priceKey: 'individual', type: 'Individual portraits', text: 'Original individual text', linkHref: '/contact?session=Individual%20portraits'},
          {name: 'Family portraits', priceKey: 'family', type: 'Family portraits', text: 'Original family text', linkHref: '/contact?session=Family%20portraits'},
        ],
      },
      contact: {headline: 'Contact me', nextCopy: 'The original next step'},
      testimonials: [{id: 'original-review', name: 'A client', quote: 'The original exact quote', rating: 5}],
    },
    navigation: {
      headerLinks: [{label: 'Sessions', href: '/investment', newTab: false}, {label: 'About me', href: '/about', newTab: false}],
      collectionLinks: [{label: 'Families', href: '/families', newTab: false}],
      location: 'Original location wording',
    },
    prices: {individual: 250, family: 295, senior: 350, athlete: 395},
    settings: {email: 'default@example.test'},
    photos: [{key: 'default-photo', alt: 'Default photograph'}],
    portfolioOrder: ['default-photo'],
    featuredPhotos: [{main: 'default-photo', left: 'default-photo', right: 'default-photo'}],
    interfaceCopy: {inquiry: {successMessage: 'Original feedback'}},
  };
  const desired = clone(previous);
  desired.copy.home.headline = 'The approved home headline';
  desired.copy.home.personalParagraphs = ['The approved shorter personal introduction'];
  for (const service of desired.copy.home.services) service.photoKey = `cover-${service.route}`;
  desired.copy.home.experienceLink = {label: 'How I work', href: '/experience', newTab: false};
  desired.copy.home.faqItems = [
    {id: 'location', question: 'Do I need a location?', answer: 'I can help choose one.'},
    {id: 'quote', question: 'How will I know the price?', answer: 'I will send a written quote.'},
  ];
  desired.copy.families.headline = 'The approved family headline';
  desired.copy.families.sessionDetails = [{
    id: 'family', title: 'Family portraits', priceKey: 'family',
    inclusions: ['I help with planning.', 'I give direction.'], duration: '', imageCount: '', delivery: '',
    linkLabel: 'Tell me about your family', linkHref: '/contact?session=Family%20portraits', linkNewTab: false,
  }];
  desired.copy.pricing.sessions[0].text = 'The approved individual description';
  for (const session of desired.copy.pricing.sessions) Object.assign(session, {
    inclusions: ['I help with location and clothing choices.'], duration: '', imageCount: '', delivery: '',
  });
  desired.copy.contact.responseTime = '';
  desired.copy.experience = {
    headline: 'How I plan your session',
    steps: [{id: 'planning', title: 'We discuss your plans.', copy: 'Tell me what you want.'}, {id: 'quote', title: 'I send a quote.', copy: 'You can review the details.'}],
  };
  desired.copy.featured = {headline: 'My featured galleries', inquiryLink: {label: 'Ask me about a session', href: '/contact', newTab: false}};
  desired.navigation.headerLinks.splice(1, 0, {label: 'How I work', href: '/experience', newTab: false});
  desired.navigation.collectionLinks.push({label: 'Featured galleries', href: '/featured', newTab: false});
  desired.featuredSessions = [{
    id: 'selected-families', slug: 'selected-families', type: 'collection', title: 'Selected family photographs',
    category: 'families', description: 'I selected photographs from different shoots.', location: '',
    coverKey: 'owner-photo', photoKeys: ['owner-photo', 'another-owner-photo'], enabled: true,
    inquiryLink: {label: 'Ask me about family portraits', href: '/contact?session=Family%20portraits', newTab: false},
  }, {
    id: 'selected-athletes', slug: 'selected-athletes', type: 'collection', title: 'Selected athlete photographs',
    category: 'athletes', description: 'I selected athlete photographs.', location: '',
    coverKey: 'athlete-photo', photoKeys: ['athlete-photo'], enabled: true,
    inquiryLink: {label: 'Ask me about athlete portraits', href: '/contact', newTab: false},
  }];

  const current = clone(previous);
  Object.assign(current, {
    _id: 'drafts.walt-photography-site', _type: 'photographySite', _rev: 'owner-draft-revision',
    _createdAt: '2026-01-01T00:00:00Z', _updatedAt: '2026-02-01T00:00:00Z',
    settings: {email: 'draft-owner@example.test', bookingLabel: 'My draft-only invitation', socialLinks: {instagram: 'https://example.test/my-profile'}, ownerSetting: true},
    prices: {individual: 275, family: 325, senior: 400, athlete: 425},
    photos: [{_key: 'owner-photo-key', _type: 'photographyPhoto', key: 'owner-photo', title: 'An owner-uploaded photograph', alt: 'Owner alt text', image: {asset: {_ref: 'image-owner'}, crop: {top: 0.1, bottom: 0.15, left: 0.2, right: 0.05}, hotspot: {x: 0.35, y: 0.4, width: 0.5, height: 0.6}}}],
    featuredPhotos: [{_key: 'owner-frame', main: 'owner-photo', left: 'another-owner-photo', right: 'athlete-photo'}],
    portfolioOrder: ['athlete-photo', 'owner-photo', 'another-owner-photo'],
    interfaceCopy: {inquiry: {successMessage: 'My draft-only feedback'}},
    ownerOnly: {notes: ['Keep this unknown owner content'], flag: false},
  });
  Object.assign(current.copy.home, {headline: 'An owner headline at an approved replacement path', intro: 'My unrelated edited introduction', ownerNote: 'My own extra home copy'});
  current.copy.home.services = [
    {_key: 'athlete-key', _type: 'copy_home_services_item', ...clone(previous.copy.home.services[2]), title: 'My custom athlete label'},
    {_key: 'owner-service-key', _type: 'copy_home_services_item', route: 'owner-service', title: 'My extra service', copy: 'My extra service copy', href: '/owner-service', newTab: true},
    {_key: 'family-key', _type: 'copy_home_services_item', ...clone(previous.copy.home.services[0]), copy: 'My custom family summary', href: '/my-family-destination'},
  ];
  current.copy.families.intro = 'My edited family introduction';
  current.copy.families.sections = [{_key: 'owner-section', _type: 'copy_families_sections_item', headline: 'My own section heading', paragraphs: ['My own paragraph', 'My extra paragraph']}];
  current.copy.families.closingCopy = 'My edited closing paragraph';
  current.copy.pricing.sessions = [
    {_key: 'family-session-key', _type: 'copy_pricing_sessions_item', ...clone(previous.copy.pricing.sessions[1]), name: 'My family session name', text: 'My family wording', linkHref: ''},
    {_key: 'owner-session-key', _type: 'copy_pricing_sessions_item', name: 'My extra session', priceKey: 'owner-custom', type: 'Something else', text: 'Keep this extra session exactly'},
    {_key: 'individual-session-key', _type: 'copy_pricing_sessions_item', ...clone(previous.copy.pricing.sessions[0]), text: 'An owner edit at an approved replacement path'},
  ];
  current.copy.testimonials = [
    {_key: 'owner-review-a', _type: 'copy_testimonials_item', id: 'original-review', name: 'Owner attribution', quote: 'Keep my exact edited review', rating: null},
    {_key: 'owner-review-b', _type: 'copy_testimonials_item', id: 'owner-added-review', name: 'Another client', quote: 'Keep this added review too', rating: 5},
  ];
  current.copy.ownerPage = {headline: 'An extra owner page', paragraphs: ['My added page text']};
  current.navigation.headerLinks = [
    {_key: 'owner-menu-key', _type: 'navigation_headerLinks_item', label: 'My custom page', href: 'https://example.test/custom', newTab: true},
    {_key: 'about-menu-key', _type: 'navigation_headerLinks_item', label: 'My own about wording', href: '/about', newTab: false},
    {_key: 'pricing-menu-key', _type: 'navigation_headerLinks_item', label: 'My prices wording', href: '/investment', newTab: false},
  ];
  current.navigation.location = 'My location wording';
  current.navigation.ownerFooter = {label: 'My extra footer link', href: '/owner-footer'};
  return {previous, desired, current};
}

const applySet = (document, set) => Object.assign(clone(document), clone(set));

test('revisionSet touches only its approved roots and preserves unrelated owner data without mutating inputs', () => {
  const {previous, desired, current} = fixture();
  // Even differences at these roots must not become mutation targets.
  desired.settings.email = 'must-not-be-applied@example.test';
  desired.prices.family = 9999;
  desired.photos = [];
  desired.interfaceCopy.inquiry.successMessage = 'Must not replace owner feedback';
  const before = clone({previous, desired, current});
  const set = revisionSet(current, previous, desired);
  assert.deepEqual(Object.keys(set).sort(), ['copy', 'featuredSessions', 'navigation']);
  const after = applySet(current, set);
  for (const key of ['_id', '_type', '_rev', '_createdAt', '_updatedAt', 'photos', 'prices', 'settings', 'featuredPhotos', 'portfolioOrder', 'interfaceCopy', 'ownerOnly']) {
    assert.deepEqual(after[key], current[key], `${key} must remain unchanged`);
  }
  assert.deepEqual(after.copy.testimonials, current.copy.testimonials);
  assert.deepEqual(after.copy.ownerPage, current.copy.ownerPage);
  assert.deepEqual({previous, desired, current}, before);
  set.copy.home.intro = 'Editing the returned plan must not mutate inputs';
  assert.equal(current.copy.home.intro, before.current.copy.home.intro);
});

test('approved copy differences change while unrelated owner-written copy remains exact', () => {
  const {previous, desired, current} = fixture();
  const after = applySet(current, revisionSet(current, previous, desired));
  assert.equal(after.copy.home.headline, desired.copy.home.headline);
  assert.deepEqual(after.copy.home.personalParagraphs, desired.copy.home.personalParagraphs);
  assert.equal(after.copy.families.headline, desired.copy.families.headline);
  assert.equal(after.copy.home.intro, current.copy.home.intro);
  assert.equal(after.copy.home.ownerNote, current.copy.home.ownerNote);
  assert.equal(after.copy.families.intro, current.copy.families.intro);
  assert.deepEqual(after.copy.families.sections, current.copy.families.sections);
  assert.equal(after.copy.families.closingCopy, current.copy.families.closingCopy);
  assert.equal(after.copy.pricing.sessions.find(row => row.priceKey === 'individual').text, desired.copy.pricing.sessions[0].text);
  assert.equal(after.copy.pricing.sessions.find(row => row.priceKey === 'family').text, 'My family wording');
});

test('existing service and pricing rows retain owner order, extra rows, custom values, Sanity keys, and types', () => {
  const {previous, desired, current} = fixture();
  const after = applySet(current, revisionSet(current, previous, desired));
  for (const [beforeRows, afterRows] of [[current.copy.home.services, after.copy.home.services], [current.copy.pricing.sessions, after.copy.pricing.sessions]]) {
    assert.deepEqual(afterRows.map(row => row._key), beforeRows.map(row => row._key));
    assert.deepEqual(afterRows.map(row => row._type), beforeRows.map(row => row._type));
  }
  assert.deepEqual(after.copy.home.services[1], current.copy.home.services[1]);
  assert.deepEqual(after.copy.pricing.sessions[1], current.copy.pricing.sessions[1]);
  assert.equal(after.copy.home.services[0].photoKey, 'cover-athletes');
  assert.equal(after.copy.home.services[2].photoKey, 'cover-families');
  assert.equal(after.copy.home.services[0].title, 'My custom athlete label');
  assert.equal(after.copy.home.services[2].copy, 'My custom family summary');
  assert.equal(after.copy.home.services[2].href, '/my-family-destination');
  assert.equal(after.copy.pricing.sessions[0].name, 'My family session name');
  assert.equal(after.copy.pricing.sessions[0].linkHref, '');
  assert.deepEqual(after.copy.pricing.sessions[0].inclusions, desired.copy.pricing.sessions[1].inclusions);
});

test('owner-removed legacy rows and intentionally empty existing arrays are not reinserted', () => {
  const {previous, desired, current} = fixture();
  let after = applySet(current, revisionSet(current, previous, desired));
  assert.equal(after.copy.home.services.some(row => row.route === 'seniors'), false);
  current.copy.home.services = [];
  current.copy.pricing.sessions = [];
  after = applySet(current, revisionSet(current, previous, desired));
  assert.deepEqual(after.copy.home.services, []);
  assert.deepEqual(after.copy.pricing.sessions, []);
});

test('new nested arrays receive schema-compatible object types and deterministic unique Sanity keys', () => {
  const {previous, desired, current} = fixture();
  const first = revisionSet(current, previous, desired);
  const second = revisionSet(current, previous, desired);
  assert.deepEqual(first, second);
  for (const [rows, expectedType] of [
    [first.copy.home.faqItems, 'copy_home_faqItems_item'],
    [first.copy.families.sessionDetails, 'copy_families_sessionDetails_item'],
    [first.copy.experience.steps, 'copy_experience_steps_item'],
    [first.featuredSessions, 'featuredPhotographyGallery'],
  ]) {
    assert.equal(new Set(rows.map(row => row._key)).size, rows.length);
    for (const row of rows) {
      assert.match(row._key, /^[a-f0-9]{16}$/);
      assert.equal(row._type, expectedType);
    }
  }
  assert.deepEqual(first.featuredSessions[0].photoKeys, desired.featuredSessions[0].photoKeys);
  assert.deepEqual(first.featuredSessions[0].inquiryLink, desired.featuredSessions[0].inquiryLink);
  assert.equal(first.featuredSessions[0].type, 'collection');
  assert.equal(first.featuredSessions[0].enabled, true);
  assert.equal(first.featuredSessions[0].location, '');
  assert.equal(first.copy.contact.responseTime, '');
  for (const field of ['duration', 'imageCount', 'delivery']) assert.equal(first.copy.families.sessionDetails[0][field], '');
});

test('new navigation links append without reordering or rewriting existing owner links', () => {
  const {previous, desired, current} = fixture();
  const after = applySet(current, revisionSet(current, previous, desired));
  assert.deepEqual(after.navigation.headerLinks.slice(0, 3), current.navigation.headerLinks);
  assert.equal(after.navigation.headerLinks[3].href, '/experience');
  assert.equal(after.navigation.headerLinks[3]._type, 'navigation_headerLinks_item');
  assert.equal(after.navigation.collectionLinks.at(-1).href, '/featured');
  assert.equal(after.navigation.collectionLinks.at(-1)._type, 'navigation_collectionLinks_item');
  assert.equal(after.navigation.location, current.navigation.location);
  assert.deepEqual(after.navigation.ownerFooter, current.navigation.ownerFooter);
});

test('a newly introduced menu destination already owned by the user is neither duplicated nor rewritten', () => {
  const {previous, desired, current} = fixture();
  const customExperience = {_key: 'owner-existing-experience', _type: 'navigation_headerLinks_item', href: '/experience', label: 'My own experience wording', newTab: true};
  current.navigation.headerLinks.splice(1, 0, customExperience);
  const after = applySet(current, revisionSet(current, previous, desired));
  assert.deepEqual(after.navigation.headerLinks, current.navigation.headerLinks);
  assert.equal(after.navigation.headerLinks.filter(row => row.href === '/experience').length, 1);
});

test('existing owner values at newly introduced paths remain untouched, including deliberate empty values', () => {
  const {previous, desired, current} = fixture();
  current.copy.home.experienceLink = {label: 'My own invitation', href: '/my-experience', newTab: true, ownerNote: 'Keep this'};
  current.copy.home.faqItems = [];
  current.copy.contact.responseTime = 'My owner-confirmed response wording';
  current.copy.pricing.sessions[0].duration = 'My owner-confirmed duration';
  current.copy.pricing.sessions[0].inclusions = [];
  current.featuredSessions = [{_key: 'owner-gallery', _type: 'featuredPhotographyGallery', id: 'owner-gallery', slug: 'owner-gallery', title: 'My own gallery', enabled: false, photoKeys: []}];
  const after = applySet(current, revisionSet(current, previous, desired));
  assert.deepEqual(after.copy.home.experienceLink, current.copy.home.experienceLink);
  assert.deepEqual(after.copy.home.faqItems, []);
  assert.equal(after.copy.contact.responseTime, current.copy.contact.responseTime);
  assert.equal(after.copy.pricing.sessions[0].duration, current.copy.pricing.sessions[0].duration);
  assert.deepEqual(after.copy.pricing.sessions[0].inclusions, []);
  assert.deepEqual(after.featuredSessions, current.featuredSessions);
});

test('a second application is a no-op, including Sanity keys and added navigation entries', () => {
  const {previous, desired, current} = fixture();
  const after = applySet(current, revisionSet(current, previous, desired));
  assert.deepEqual(revisionSet(after, previous, desired), {});
});

test('ambiguous changed-array identities fail closed without changing any input', () => {
  const {previous, desired, current} = fixture();
  current.copy.home.services.push({...clone(current.copy.home.services[0]), _key: 'duplicate-athlete-key'});
  const before = clone({previous, desired, current});
  assert.throws(() => revisionSet(current, previous, desired), /array identity is ambiguous/i);
  assert.deepEqual({previous, desired, current}, before);
  assert.throws(() => mergeEditorialChanges([{headline: 'Before'}], [{headline: 'After'}], [{_key: 'owner-key', headline: 'Before'}], ['copy', 'families', 'sections']), /array identity is ambiguous/i);
});

test('a pricing row whose owner cleared the starting-price selector still matches its stable session type', () => {
  const {previous, desired, current} = fixture();
  current.copy.pricing.sessions[0].priceKey = '';
  const after = applySet(current, revisionSet(current, previous, desired));
  const family = after.copy.pricing.sessions.find(row => row._key === 'family-session-key');
  assert.equal(family.priceKey, '', 'The owner’s custom-quote choice must survive');
  assert.equal(family.type, 'Family portraits');
  assert.equal(family.name, 'My family session name');
  assert.deepEqual(family.inclusions, desired.copy.pricing.sessions[1].inclusions, 'New fields should match the unchanged session type when priceKey was cleared');
});
