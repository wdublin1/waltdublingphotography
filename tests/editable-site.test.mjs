import test from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultContent, normalizeContent} from '../lib/content.mjs';
import {renderPage, pageRoutes} from '../lib/render.mjs';
import {documentHtml} from '../lib/html.mjs';

test('page-specific headings, body copy and closing buttons reach every public page', () => {
  const content = getDefaultContent();
  for (const route of pageRoutes) {
    const copy = content.copy[route === 'investment' ? 'pricing' : route];
    copy.headline = `An updated heading for ${route}`;
    if (Array.isArray(copy.intro)) copy.intro = [`Updated body for ${route}`];
    else if (route === 'contact') copy.paragraphs = [`Updated body for ${route}`];
    else copy.intro = `Updated body for ${route}`;
    if (Object.hasOwn(copy, 'closingHeadline')) {
      copy.closingHeadline = `Closing heading for ${route}`;
      copy.closingCopy = `Closing body for ${route}`;
      copy.closingButton = `Plan my ${route} session`;
      copy.closingHref = `/contact?source=${route}`;
    }
    const html = renderPage(route, content).body;
    assert.ok(html.includes(`<h1>An updated heading for ${route}</h1>`), route);
    assert.ok(html.includes(`Updated body for ${route}`), route);
    if (Object.hasOwn(copy, 'closingHeadline')) {
      assert.ok(html.includes(`Closing heading for ${route}`), route);
      assert.ok(html.includes(`Closing body for ${route}`), route);
      assert.ok(html.includes(`href="/contact?source=${route}">Plan my ${route} session</a>`), route);
    }
    assert.ok(!html.includes('undefined'), route);
  }
});

test('editable menus, footer and links honor destinations, new tabs and safe inline links', () => {
  const content = getDefaultContent();
  content.settings.bookingLabel = 'Start a conversation';
  content.settings.bookingHref = '/contact?source=header';
  content.navigation.collectionsLabel = 'Explore my work';
  content.navigation.menuLabel = 'Browse';
  content.navigation.headerLinks = [{label: 'My journal', href: 'https://example.com/journal?view=all&sort=new', newTab: true}];
  content.navigation.footerInformationLinks = [{label: 'Call me', href: 'tel:+17045550100', newTab: false}];
  content.navigation.copyrightText = 'My custom footer';
  content.copy.home.personalParagraphs = ['Read [my story](/about#my-story), or [write to me](mailto:{email}). <script>alert(1)</script>'];
  content.copy.home.aboutLink = {label: 'An unsafe destination', href: 'javascript:alert(1)', newTab: true};
  content.copy.home.pricingLink = {label: 'Intentionally removed', href: '', newTab: false};
  const html = renderPage('home', content).body;
  assert.ok(html.includes('Explore my work'));
  assert.ok(html.includes('Browse'));
  assert.ok(html.includes('href="/contact?source=header"'));
  assert.ok(html.includes('Start a conversation'));
  assert.ok(html.includes('href="https://example.com/journal?view=all&amp;sort=new" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('href="tel:+17045550100">Call me</a>'));
  assert.ok(html.includes('My custom footer'));
  assert.ok(html.includes('<a href="/about#my-story">my story</a>'));
  assert.ok(html.includes('<a href="mailto:walt@waltdublinphotography.com">write to me</a>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('Intentionally removed'));
  assert.ok(!html.includes('<script>'));
});

test('section copy, pricing templates, service links and added sections use content values', () => {
  const content = getDefaultContent();
  content.prices.family = 310;
  content.copy.families.familyPriceCopy = 'Family sessions begin at {familyPrice}; [ask me](/contact?source=family).';
  content.copy.families.familyLink = {label: 'Plan our family portraits', href: '/contact?session=Family%20portraits', newTab: false};
  content.copy.families.sections.push({headline: 'A new section', paragraphs: ['A new paragraph with [a link](/investment).']});
  const family = renderPage('families', content).body;
  assert.ok(family.includes('Family sessions begin at $310; <a href="/contact?source=family">ask me</a>.'));
  assert.ok(family.includes('Plan our family portraits'));
  assert.ok(family.includes('<h2>A new section</h2><p>A new paragraph with <a href="/investment">a link</a>.</p>'));
  content.copy.pricing.priceTemplate = 'Sessions from {price}';
  content.copy.pricing.sessions[1].linkLabel = 'Ask about my family session';
  content.copy.pricing.sessions[1].linkHref = 'https://example.com/book?family=1';
  const pricing = renderPage('investment', content).body;
  assert.ok(pricing.includes('Sessions from $310'));
  assert.ok(pricing.includes('href="https://example.com/book?family=1">Ask about my family session</a>'));
  content.copy.clients.emailHref = 'mailto:{email}?subject=Gallery%20help';
  assert.ok(renderPage('clients', content).body.includes('href="mailto:walt@waltdublinphotography.com?subject=Gallery%20help"'));
});

test('form display text is editable while submitted session values and API endpoint stay valid', () => {
  const content = getDefaultContent();
  content.copy.contact.form.nameLabel = 'How should I address you?';
  content.copy.contact.form.sessionLabels.family = 'Photographs of my family';
  content.copy.contact.form.timingPlaceholder = 'Tell me your preferred month';
  content.copy.contact.form.disclosure = 'I will confirm availability with you.';
  content.interfaceCopy.inquiry.submitLabel = 'Send Walt my plans';
  content.interfaceCopy.inquiry.successMessage = 'I received your note.';
  const page = renderPage('contact', content, new URLSearchParams({session: 'Family portraits'}));
  assert.ok(page.body.includes('How should I address you?'));
  assert.ok(page.body.includes('<option value="Family portraits" selected>Photographs of my family</option>'));
  assert.ok(page.body.includes('placeholder="Tell me your preferred month"'));
  assert.ok(page.body.includes('I will confirm availability with you.'));
  assert.ok(page.body.includes('Send Walt my plans'));
  assert.ok(page.body.includes('action="/api/inquiry" method="post"'));
  assert.equal(page.clientData.ui.inquiry.successMessage, 'I received your note.');
});

test('editable search metadata and viewer text reach the HTML shell without leaking executable markup', () => {
  const content = normalizeContent({settings: {brandName: 'My photography studio', businessDescription: 'My updated description', areaServed: ['Charlotte']}, copy: {meta: {home: {title: 'My updated title', description: 'My search description'}}}, interfaceCopy: {lightbox: {dialogLabel: 'My photo viewer'}}});
  const page = renderPage('home', content);
  const html = documentHtml(page, {route: 'home', content, indexable: false});
  assert.ok(html.includes('<title>My updated title</title>'));
  assert.ok(html.includes('content="My search description"'));
  assert.ok(html.includes('content="My photography studio"'));
  assert.ok(html.includes('aria-label="My photo viewer"'));
  assert.ok(html.includes('"description":"My updated description"'));
  assert.ok(html.includes('"areaServed":["Charlotte"]'));
  assert.ok(!html.includes('SANITY_API_READ_TOKEN'));
});
