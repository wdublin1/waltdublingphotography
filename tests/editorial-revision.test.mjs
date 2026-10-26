import test from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultContent, normalizeContent} from '../lib/content.mjs';
import {renderPage} from '../lib/render.mjs';
import {documentHtml, SITE_ORIGIN, sitemapXml} from '../lib/html.mjs';
import {featuredSessionForRoute, isPageRoute, sitemapRoutes, validGallerySlug} from '../lib/routes.mjs';

// These fixtures use bundled photographs only. No content loader, API, or
// network client is called, and no account credentials are required.
function gallery(overrides = {}) {
  return {
    id: 'test_family_gallery',
    slug: 'test-family-gallery',
    title: 'My selected family photographs',
    category: 'families',
    type: 'collection',
    description: 'I selected these photographs to show my approach.',
    location: '',
    coverKey: 'family',
    photoKeys: ['family', 'mother'],
    enabled: true,
    ...overrides,
  };
}

function contentWith(galleries = [gallery()], fields = {}) {
  return normalizeContent({...fields, featuredSessions: galleries});
}

function featuredCards(html) {
  return [...html.matchAll(/<a\b[^>]*class="featured-card"[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
}

test('new index routes and valid enabled gallery routes are recognized without accepting arbitrary paths', () => {
  const content = contentWith([
    gallery(),
    gallery({slug: 'not-ready', enabled: false}),
  ]);
  for (const route of ['experience', 'featured', 'featured/test-family-gallery']) {
    assert.equal(isPageRoute(route, content), true, route);
    assert.match(renderPage(route, content).body, /<main id="main-content">/);
  }
  assert.equal(featuredSessionForRoute('featured/test-family-gallery', content).slug, 'test-family-gallery');
  for (const route of ['featured/not-ready', 'featured/missing', 'featured/../about', 'featured/a/b', 'featured/%2e%2e']) {
    assert.equal(isPageRoute(route, content), false, route);
    assert.throws(() => renderPage(route, content), RangeError, route);
  }
  for (const slug of ['Uppercase', '-leading', 'trailing-', 'double--hyphen', 'a'.repeat(101), '<script>']) {
    assert.equal(validGallerySlug(slug), false, slug);
  }
});

test('gallery normalization keeps valid ordered photos, rejects unsafe records, and does not restore a cleared array', () => {
  const content = contentWith([
    gallery({photoKeys: ['mother', 'missing-photo', 'family', 'mother', null], coverKey: 'missing-cover'}),
    gallery({title: 'Duplicate slug must not replace the first gallery'}),
    gallery({slug: 'disabled-gallery', enabled: false}),
    gallery({slug: 'truthy-string-is-not-enabled', enabled: 'true'}),
    gallery({slug: 'invalid-category', category: 'unknown'}),
    gallery({slug: 'no-valid-photographs', photoKeys: ['missing-photo']}),
    gallery({slug: '../unsafe'}),
    gallery({slug: 'untitled', title: '   '}),
  ]);
  assert.deepEqual(content.featuredSessions.map(item => item.slug), [
    'test-family-gallery', 'disabled-gallery', 'truthy-string-is-not-enabled',
  ]);
  assert.deepEqual(content.featuredSessions[0].photoKeys, ['mother', 'family']);
  assert.equal(content.featuredSessions[0].coverKey, 'mother');
  assert.equal(content.featuredSessions[0].title, 'My selected family photographs');
  assert.equal(content.featuredSessions[1].enabled, false);
  assert.equal(content.featuredSessions[2].enabled, false);
  const cleared = contentWith([]);
  assert.deepEqual(cleared.featuredSessions, []);
  assert.deepEqual(featuredCards(renderPage('featured', cleared).body), []);
  assert.ok(renderPage('featured', cleared).body.includes(cleared.copy.featured.emptyMessage));
});

test('only enabled galleries render and service pages show only their related category', () => {
  const content = contentWith([
    gallery(),
    gallery({slug: 'test-graduates', title: 'My graduate collection', category: 'seniors', coverKey: 'graduate', photoKeys: ['graduate']}),
    gallery({slug: 'test-athletes', title: 'My athlete collection', category: 'athletes', coverKey: 'football', photoKeys: ['football']}),
    gallery({slug: 'private-preview', title: 'A hidden gallery', enabled: false}),
  ]);
  for (const route of ['home', 'featured', 'portfolio']) {
    const cards = featuredCards(renderPage(route, content).body);
    assert.equal(cards.length, 3, route);
    assert.ok(cards.every(card => !card.includes('private-preview')), route);
  }
  for (const [route, slug] of [['families', 'test-family-gallery'], ['seniors', 'test-graduates'], ['athletes', 'test-athletes']]) {
    const cards = featuredCards(renderPage(route, content).body);
    assert.equal(cards.length, 1, route);
    assert.ok(cards[0].includes(`href="/featured/${slug}"`), route);
  }
});

test('sitemaps include the new routes and active galleries but omit unavailable galleries and client access', () => {
  const content = contentWith([
    gallery(),
    gallery({slug: 'not-ready', enabled: false}),
    gallery({slug: 'no-photos', photoKeys: []}),
  ]);
  const routes = sitemapRoutes(content);
  for (const route of ['experience', 'featured', 'featured/test-family-gallery']) assert.ok(routes.includes(route));
  for (const route of ['clients', 'featured/not-ready', 'featured/no-photos']) assert.ok(!routes.includes(route));
  assert.equal(routes.filter(route => route === 'featured/test-family-gallery').length, 1);
  const xml = sitemapXml(content);
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/experience</loc>`));
  assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/featured/test-family-gallery</loc>`));
  assert.doesNotMatch(xml, /not-ready|no-photos|\/clients<\/loc>/);
});

test('gallery metadata uses the gallery title, description, canonical path, and selected cover safely', () => {
  const content = contentWith([gallery({
    title: 'My portraits of <people> & families',
    description: 'I photograph "you" & your family.',
    coverKey: 'mother',
  })]);
  const route = 'featured/test-family-gallery';
  const page = renderPage(route, content);
  assert.equal(page.title, `My portraits of <people> & families | ${content.settings.brandName}`);
  assert.equal(page.description, 'I photograph "you" & your family.');
  assert.equal(page.coverKey, 'mother');
  const html = documentHtml(page, {route, content, indexable: true});
  assert.ok(html.includes('<title>My portraits of &lt;people&gt; &amp; families |'));
  assert.ok(html.includes('name="description" content="I photograph &quot;you&quot; &amp; your family."'));
  assert.ok(html.includes(`rel="canonical" href="${SITE_ORIGIN}/${route}"`));
  assert.ok(html.includes(`property="og:url" content="${SITE_ORIGIN}/${route}"`));
  assert.ok(html.includes(`property="og:image" content="${new URL(content.photos.mother.src, SITE_ORIGIN).href}"`));
  assert.ok(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
  assert.doesNotMatch(html, /<people>/);
});

test('gallery cards flatten supported inline links without nesting anchors or exposing HTML', () => {
  const content = contentWith([gallery({
    description: 'See [the location](https://example.test/place?a=1&b=2) and [my approach](/experience). Keep <em>literal text</em>.',
  })]);
  const cards = featuredCards(renderPage('featured', content).body);
  assert.equal(cards.length, 1);
  assert.equal((cards[0].match(/<a\b/g) || []).length, 1);
  assert.ok(cards[0].includes('See the location and my approach. Keep &lt;em&gt;literal text&lt;/em&gt;.'));
  assert.doesNotMatch(cards[0], /\[the location\]|href="https:\/\/example\.test|<em>/);
  const detail = renderPage('featured/test-family-gallery', content).body;
  assert.ok(detail.includes('<a href="https://example.test/place?a=1&amp;b=2">the location</a>'));
  assert.ok(detail.includes('<a href="/experience">my approach</a>'));
  assert.doesNotMatch(detail, /<em>/);
});

test('unconfirmed session facts stay hidden and confirmed editable details render without invented values', () => {
  const content = getDefaultContent();
  content.copy.families.sessionDetails = [{
    title: 'A session planned for my visitors', priceKey: 'family', inclusions: [],
    duration: '', imageCount: null, delivery: '   ', linkLabel: '', linkHref: '',
  }];
  const empty = renderPage('families', content).body;
  assert.doesNotMatch(empty, /class="session-facts"|class="session-inclusions"/);
  Object.assign(content.copy.families.sessionDetails[0], {
    inclusions: ['I will help you [plan your session](/experience).'],
    duration: 'My confirmed session length',
    imageCount: 'My confirmed image selection',
    delivery: 'My confirmed delivery arrangement',
  });
  const confirmed = renderPage('families', content).body;
  assert.ok(confirmed.includes('<ul class="session-inclusions"><li>I will help you <a href="/experience">plan your session</a>.</li></ul>'));
  assert.ok(confirmed.includes('<dl class="session-facts">'));
  for (const value of ['My confirmed session length', 'My confirmed image selection', 'My confirmed delivery arrangement']) {
    assert.ok(confirmed.includes(`<dd>${value}</dd>`));
  }
  content.copy.contact.responseTime = '   ';
  assert.doesNotMatch(renderPage('contact', content).body, /class="response-time"/);
  content.copy.contact.responseTime = 'I will reply within my stated response window.';
  assert.ok(renderPage('contact', content).body.includes('<p class="response-time">I will reply within my stated response window.</p>'));
});

test('gallery inquiry controls honor per-gallery overrides, shared wording, fallback order, and safe link rendering', () => {
  const content = contentWith([gallery()], {
    copy: {featured: {inquiryLink: {label: 'Discuss the work you saw', href: 'https://example.test/inquire?from=gallery&kind=portrait', newTab: true}}},
  });
  const route = 'featured/test-family-gallery';
  const shared = renderPage(route, content).body;
  assert.ok(shared.includes('href="https://example.test/inquire?from=gallery&amp;kind=portrait" target="_blank" rel="noopener noreferrer">Discuss the work you saw'));
  content.featuredSessions[0].inquiryLink = {label: 'Ask about this gallery', href: '/contact?source=one-gallery', newTab: false};
  const override = renderPage(route, content).body;
  assert.equal((override.match(/>Ask about this gallery<\/a>/g) || []).length, 2);
  assert.doesNotMatch(override, /Discuss the work you saw/);
  content.featuredSessions[0].inquiryLink = null;
  delete content.copy.featured.inquiryLink;
  content.copy.families.familyLink = {label: 'Ask about my family sessions', href: '/contact?source=family-fallback', newTab: false};
  assert.ok(renderPage(route, content).body.includes('href="/contact?source=family-fallback">Ask about my family sessions</a>'));
  delete content.copy.families.familyLink;
  content.settings.bookingLabel = 'Write to me about your plans';
  content.settings.bookingHref = '/contact?source=main-inquiry';
  assert.ok(renderPage(route, content).body.includes('href="/contact?source=main-inquiry">Write to me about your plans</a>'));
  content.featuredSessions[0].inquiryLink = {label: 'An unsafe gallery link', href: 'javascript:alert(1)', newTab: true};
  const unsafe = renderPage(route, content).body;
  assert.doesNotMatch(unsafe, /href="javascript:|An unsafe gallery link/);
});

test('dedicated experience and gallery indexes use h2 titles while embedded sections retain h3', () => {
  const content = contentWith();
  content.copy.experience.steps = [{title: 'I will help you plan', copy: 'I will ask what you would like from the photographs.'}];
  const experience = renderPage('experience', content).body;
  assert.match(experience, /class="experience-step">[\s\S]*?<h2>I will help you plan<\/h2>/);
  assert.doesNotMatch(experience, /<h3>I will help you plan<\/h3>/);
  const indexCard = featuredCards(renderPage('featured', content).body)[0];
  assert.ok(indexCard.includes('<h2>My selected family photographs</h2>'));
  assert.doesNotMatch(indexCard, /<h3>/);
  const home = renderPage('home', content).body;
  assert.match(home, /class="experience-step">[\s\S]*?<h3>I will help you plan<\/h3>/);
  assert.ok(featuredCards(home)[0].includes('<h3>My selected family photographs</h3>'));
});
