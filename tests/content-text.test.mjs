import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml, safeHref, interpolate, renderInline} from '../lib/content-text.mjs';

test('escapeHtml escapes markup, ampersands, and both quote types', () => {
  assert.equal(escapeHtml('<p title="Walt\'s">A & B</p>'), '&lt;p title=&quot;Walt&#39;s&quot;&gt;A &amp; B&lt;/p&gt;');
  assert.equal(escapeHtml(null), '');
});

test('safeHref accepts explicit local, fragment, web, email, and telephone links', () => {
  const allowed = [
    ['/', '/'],
    ['/contact?session=Family%20portraits&source=home#inquiry', '/contact?session=Family%20portraits&source=home#inquiry'],
    ['#session-details', '#session-details'],
    ['/my photographs', '/my%20photographs'],
    [' https://example.com/work?q=1&view=full ', 'https://example.com/work?q=1&view=full'],
    ['HTTP://example.com', 'http://example.com/'],
    ['mailto:walt@example.com?subject=Portrait%20inquiry', 'mailto:walt@example.com?subject=Portrait%20inquiry'],
    ['tel:+17045550100', 'tel:+17045550100'],
  ];
  for (const [input, expected] of allowed) assert.equal(safeHref(input), expected, input);
});

test('safeHref rejects unsafe schemes, controls, ambiguous URLs, and credentials', () => {
  const disallowed = [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', 'file:///etc/passwd', 'ftp://example.com', '//evil.example/path',
    '///evil.example/path', 'about', 'example.com', 'https://user:secret@example.com',
    'https://user@example.com', 'https://user%40name:secret@example.com',
    'https:\\evil.example', '/\\evil.example', '/safe\npath', '\thttps://example.com',
    'java\nscript:alert(1)', '/%5cevil.example', '/%0apath',
    'mailto:walt@example.com?subject=Hello%0D%0ABcc:someone@example.com',
    'mailto://user:secret@example.com', 'tel://example.com', 'mailto:', 'tel:',
    '', null, {},
  ];
  for (const input of disallowed) assert.equal(safeHref(input), '', String(input));
});

test('interpolate only replaces supplied scalar tokens without recursive expansion', () => {
  const tokens = Object.assign(Object.create({inherited: 'not supplied'}), {
    price: '$295', count: 0, enabled: false, optional: null, next: '{price}', object: {},
  });
  assert.equal(
    interpolate('From {price}; {count}; {enabled}; {optional}; {missing}; {inherited}; {next}; {object}.', tokens),
    'From $295; 0; false; ; {missing}; {inherited}; {price}; {object}.',
  );
  assert.equal(interpolate('{constructor} {toString}'), '{constructor} {toString}');
});

test('renderInline renders safe links and escapes text and query ampersands', () => {
  assert.equal(
    renderInline('Ask about [Walt\'s "family" sessions](/contact?session=Family%20portraits&source=home) from {price}.', {price: '$295 & up'}),
    'Ask about <a href="/contact?session=Family%20portraits&amp;source=home">Walt&#39;s &quot;family&quot; sessions</a> from $295 &amp; up.',
  );
  assert.equal(renderInline('[Details](#details) and [website](https://example.com).'), '<a href="#details">Details</a> and <a href="https://example.com/">website</a>.');
});

test('renderInline handles balanced parentheses in destinations and adjacent links', () => {
  assert.equal(
    renderInline('[Reference](https://example.com/Portrait_(photography))[Contact](/contact)'),
    '<a href="https://example.com/Portrait_(photography)">Reference</a><a href="/contact">Contact</a>',
  );
});

test('renderInline never renders unsafe links, raw HTML, or images', () => {
  assert.equal(renderInline('[Click](javascript:alert(1))'), 'Click');
  assert.equal(renderInline('[Click](//evil.example)'), 'Click');
  assert.equal(renderInline('[Click](data:text/html,<svg/onload=alert(1)>)'), 'Click');
  assert.equal(renderInline('[<img src=x onerror="alert(1)">](/contact)'), '<a href="/contact">&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</a>');
  assert.equal(renderInline('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(renderInline('![portrait](https://example.com/photo.webp)'), '![portrait](https://example.com/photo.webp)');
});

test('renderInline treats tokens as text but validates tokens in explicit link destinations', () => {
  assert.equal(renderInline('Hello {name}', {name: '<b>[click](https://evil.example)</b>'}), 'Hello &lt;b&gt;[click](https://evil.example)&lt;/b&gt;');
  assert.equal(renderInline('[{label}](mailto:{email})', {label: 'Email & ask', email: 'walt@example.com'}), '<a href="mailto:walt@example.com">Email &amp; ask</a>');
  assert.equal(renderInline('[Ask]({destination})', {destination: 'javascript:alert(1)'}), 'Ask');
  assert.equal(renderInline('[{label}](/contact)', {label: '" onclick="alert(1)'}), '<a href="/contact">&quot; onclick=&quot;alert(1)</a>');
});

test('renderInline leaves malformed and escaped link syntax as ordinary text', () => {
  assert.equal(renderInline('Read [this] later.'), 'Read [this] later.');
  assert.equal(renderInline('Read [this](/contact'), 'Read [this](/contact');
  assert.equal(renderInline('\\[this](/contact)'), '\\[this](/contact)');
  assert.equal(renderInline('[](/contact)'), '[](/contact)');
});
