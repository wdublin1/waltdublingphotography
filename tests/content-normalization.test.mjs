import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {SanityClient} from '@sanity/client';
import {getDefaultContent, loadContent, normalizeContent} from '../lib/content.mjs';
import {documentHtml, SITE_ORIGIN, systemDocumentHtml} from '../lib/html.mjs';
import {handleRequest} from '../api/index.mjs';
import {renderPage} from '../lib/render.mjs';

const rawDefaults = JSON.parse(readFileSync(new URL('../content/default-content.json', import.meta.url), 'utf8'));
const ENV_NAMES = ['SANITY_API_PROJECT_ID', 'SANITY_API_DATASET', 'SANITY_API_READ_TOKEN', 'INQUIRY_FORM_SECRET'];

function mockPublishedContent(t, read) {
  const previous = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {SANITY_API_PROJECT_ID:'testproj', SANITY_API_DATASET:'production', SANITY_API_READ_TOKEN:'test-only-not-a-real-token'});
  t.after(() => {
    for (const name of ENV_NAMES) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
  const fetchMock = t.mock.method(SanityClient.prototype, 'fetch', read);
  const networkMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No external requests are allowed in these tests.'); });
  t.mock.method(console, 'warn', () => {});
  return {fetchMock, networkMock};
}

test('legacy published content gains navigation, interface, and metadata defaults without replacing supplied copy', () => {
  const content = normalizeContent({copy:{home:{headline:'My published introduction'}}, settings:{bookingLabel:'Ask me about a session'}, prices:{family:325}});
  assert.equal(content.copy.home.headline, 'My published introduction');
  assert.equal(content.settings.bookingLabel, 'Ask me about a session');
  assert.equal(content.settings.bookingHref, '/contact');
  assert.equal(content.settings.bookingNewTab, false);
  assert.equal(content.settings.brandName, rawDefaults.settings.brandName);
  assert.deepEqual(content.settings.areaServed, rawDefaults.settings.areaServed);
  assert.deepEqual(content.navigation, rawDefaults.navigation);
  assert.deepEqual(content.interfaceCopy, rawDefaults.interfaceCopy);
  assert.equal(content.prices.family, 325);
  assert.equal(content.copy.home.closingHeadline, '');
  assert.equal(content.copy.home.closingCopy, '');
});

test('legacy reordered services retain their copy and derive links from their own routes', () => {
  const content = normalizeContent({copy:{home:{services:[
    {route:'athletes', title:'My sports sessions', copy:'My existing athlete description'},
    {route:'families', title:'My family sessions', copy:'My existing family description'},
  ]}}});
  assert.deepEqual(content.copy.home.services.map((item) => item.href), ['/athletes', '/families']);
  assert.deepEqual(content.copy.home.services.map((item) => item.newTab), [false, false]);
  assert.equal(content.copy.home.services[0].copy, 'My existing athlete description');
  assert.equal(content.copy.home.services[1].title, 'My family sessions');
  assert.equal(content.copy.home.services.length, 2);
});

test('legacy session additions match identity, but inquiry links always follow the stored session type', () => {
  const content = normalizeContent({copy:{pricing:{sessions:[
    {priceKey:'athlete', type:'Individual athlete portraits', name:'Athlete offering', text:'Published athlete copy'},
    {priceKey:'individual', type:'Family portraits', name:'A custom family offering', text:'Published family copy'},
  ]}}});
  const [athlete, family] = content.copy.pricing.sessions;
  assert.equal(athlete.linkHref, '/contact?session=Individual%20athlete%20portraits');
  assert.equal(family.linkHref, '/contact?session=Family%20portraits');
  assert.equal(athlete.linkLabel, rawDefaults.copy.pricing.sessions[0].linkLabel);
  assert.equal(athlete.photo, rawDefaults.copy.pricing.sessions.find((item) => item.priceKey === 'athlete').photo);
  assert.equal(family.text, 'Published family copy');
});

test('explicit empty links and arrays, false flags, and nullable values survive normalization', () => {
  const content = normalizeContent({
    navigation:{headerLinks:[], mobileContactLink:{label:'', href:'', newTab:false}},
    copy:{home:{services:[{route:'families', title:'Custom title', copy:null, href:'', newTab:false}], closingButton:''}, pricing:{sessions:[]}},
  });
  assert.deepEqual(content.navigation.headerLinks, []);
  assert.deepEqual(content.copy.pricing.sessions, []);
  assert.equal(content.navigation.mobileContactLink.href, '');
  assert.equal(content.copy.home.services[0].href, '');
  assert.equal(content.copy.home.services[0].newTab, false);
  assert.equal(content.copy.home.services[0].copy, null);
  assert.equal(content.copy.home.closingButton, '');
});

test('Sanity-unset standalone links, invitations, pricing keys, and session types remain cleared', () => {
  const content = normalizeContent({
    navigation:{mobileContactLink:{}, headerLinks:[{label:'A link without a destination'}]},
    copy:{home:{headline:'Published home'}, shared:{invitationHeadline:'My invitation'}, pricing:{sessions:[{type:'Family portraits', name:'Custom quote'}, {priceKey:'athlete', name:'Undecided inquiry'}]}},
    interfaceCopy:{lightbox:{closeLabel:'Close the image'}},
  });
  assert.equal(content.navigation.mobileContactLink.label, '');
  assert.equal(content.navigation.mobileContactLink.href, '');
  assert.equal(content.navigation.headerLinks[0].href, '');
  assert.equal(content.copy.home.closingButton, '');
  assert.equal(content.copy.home.closingHeadline, '');
  assert.equal(content.copy.home.closingCopy, '');
  assert.equal(content.copy.pricing.sessions[0].priceKey, '');
  assert.equal(content.copy.pricing.sessions[1].type, '');
  assert.equal(content.copy.pricing.sessions[1].linkHref, '/contact');
  assert.equal(content.interfaceCopy.lightbox.counterTemplate, '');
  assert.equal(normalizeContent({interfaceCopy:{lightbox:{counterTemplate:''}}}).interfaceCopy.lightbox.counterTemplate, '');
  assert.equal(normalizeContent({}).interfaceCopy.lightbox.counterTemplate, rawDefaults.interfaceCopy.lightbox.counterTemplate);
});

test('unknown array rows never inherit another service, quote, reviewer, or review provenance', () => {
  const content = normalizeContent({copy:{pricing:{sessions:[{name:'My custom session', type:'Something else', text:'Only my supplied words'}]}, testimonials:[{name:'A new client', quote:'Their own words'}]}});
  const session = content.copy.pricing.sessions[0];
  assert.equal(session.text, 'Only my supplied words');
  assert.equal(session.linkHref, '/contact?session=Something%20else');
  assert.equal(Object.hasOwn(session, 'photo'), false);
  assert.equal(Object.hasOwn(session, 'note'), false);
  assert.equal(Object.hasOwn(content.copy.testimonials[0], 'context'), false);
  assert.equal(content.copy.testimonials[0].rating, null);
});

test('clearing a matched testimonial rating never restores the default five stars', () => {
  const original = rawDefaults.copy.testimonials.find((review) => review.rating === 5);
  const content = normalizeContent({copy:{testimonials:[{id:original.id, name:original.name, quote:'Preserved supplied words'}, {...original, rating:null}]}});
  assert.deepEqual(content.copy.testimonials.map((review) => review.rating), [null, null]);
  assert.equal(content.copy.testimonials[0].quote, 'Preserved supplied words');
  const unrated = rawDefaults.copy.testimonials.find((review) => review.rating === null);
  assert.equal(normalizeContent({copy:{testimonials:[{...unrated, rating:4}]}}).copy.testimonials[0].rating, 4);
});

test('settings accept editable metadata and safe booking links while preserving hidden social links', () => {
  const content = normalizeContent({settings:{email:'contact@example.net', bookingHref:'mailto:{email}', bookingNewTab:true, brandName:'My photography studio', businessDescription:'My own description', areaServed:['Charlotte', 'Charlotte', ' Lake Norman ', ''], socialLinks:{facebook:'javascript:alert(1)'}}});
  assert.equal(content.settings.bookingHref, 'mailto:contact@example.net');
  assert.equal(content.settings.bookingNewTab, true);
  assert.equal(content.settings.brandName, 'My photography studio');
  assert.equal(content.settings.businessDescription, 'My own description');
  assert.deepEqual(content.settings.areaServed, ['Charlotte', 'Lake Norman']);
  assert.equal(content.settings.socialLinks.facebook, '');
  assert.equal(content.settings.socialLinks.instagram, '');
  assert.equal(content.settings.socialLinks.email, 'mailto:contact@example.net');
  assert.equal(normalizeContent({settings:{bookingHref:'javascript:alert(1)'}}).settings.bookingHref, '');
  assert.equal(normalizeContent({settings:{email:'bad\u0000@example.net'}}).settings.email, rawDefaults.settings.email);
  assert.deepEqual(normalizeContent({settings:{areaServed:[]}}).settings.areaServed, []);
});

test('required interface labels fall back when blank, without hiding optional body copy or counters', () => {
  const content = normalizeContent({interfaceCopy:{lightbox:{closeLabel:' ', counterTemplate:''}, inquiry:{submitLabel:null}, system:{notFoundHeadline:'', notFoundCopy:''}}});
  assert.equal(content.interfaceCopy.lightbox.closeLabel, rawDefaults.interfaceCopy.lightbox.closeLabel);
  assert.equal(content.interfaceCopy.inquiry.submitLabel, rawDefaults.interfaceCopy.inquiry.submitLabel);
  assert.equal(content.interfaceCopy.system.notFoundHeadline, rawDefaults.interfaceCopy.system.notFoundHeadline);
  assert.equal(content.interfaceCopy.system.notFoundCopy, '');
  assert.equal(content.interfaceCopy.lightbox.counterTemplate, '');
});

test('existing photograph selections and Sanity crop/hotspot geometry are preserved', () => {
  const key = rawDefaults.photos[0].key;
  const image = {asset:{_id:'image-test-2000x1000-webp', metadata:{dimensions:{width:2000, height:1000}}}, crop:{left:0.25, right:0.25, top:0.1, bottom:0.1}, hotspot:{x:0.75, y:0.6}};
  const images = [];
  const builder = {image(value) { images.push(value); return {width(){return this;}, fit(){return this;}, auto(){return this;}, quality(){return this;}, url(){return 'https://cdn.sanity.io/images/testproj/production/replacement.webp';}};}};
  const content = normalizeContent({photos:[{key, image, alt:'My updated photograph description', category:'athletes'}], featuredPhotos:rawDefaults.featuredPhotos, portfolioOrder:rawDefaults.portfolioOrder}, builder);
  assert.deepEqual(images, [image]);
  assert.equal(content.photos[key].src, 'https://cdn.sanity.io/images/testproj/production/replacement.webp');
  assert.equal(content.photos[key].width, 1000);
  assert.equal(content.photos[key].height, 800);
  assert.equal(content.photos[key].objectPosition, '100.00% 62.50%');
  assert.equal(content.photos[key].alt, 'My updated photograph description');
  assert.deepEqual(content.featuredPhotos, rawDefaults.featuredPhotos);
  assert.deepEqual(content.portfolioOrder, rawDefaults.portfolioOrder);
  assert.equal(Object.keys(content.photos).length, Object.keys(normalizeContent().photos).length);
});

test('metadata and dialog labels are editable, escaped, and keep the canonical origin fixed', () => {
  const content = normalizeContent({settings:{brandName:'My <studio>', businessDescription:'Description </script><script>bad()</script>', areaServed:['A <place>']}, interfaceCopy:{lightbox:{dialogLabel:'View "my" photo'}, inquiry:{dialogLabel:'Ask <me>'}}});
  const html = documentHtml({title:'My <title>', description:'My <description>', body:'<main></main>', clientData:{}}, {route:'contact', content, indexable:true});
  assert.ok(html.includes('<title>My &lt;title&gt;</title>'));
  assert.ok(html.includes('property="og:site_name" content="My &lt;studio&gt;"'));
  assert.ok(html.includes('aria-label="View &quot;my&quot; photo"'));
  assert.ok(renderPage('contact', content).body.includes('method="post" aria-label="Ask &lt;me&gt;"'));
  assert.ok(html.includes(`rel="canonical" href="${SITE_ORIGIN}/contact"`));
  const metadata = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(metadata.name, 'My <studio>');
  assert.equal(metadata.description, content.settings.businessDescription);
  assert.deepEqual(metadata.areaServed, ['A <place>']);
  assert.doesNotMatch(html, /<script>bad\(\)<\/script>/);
});

test('editable system messages interpolate email and render only safe inline and error links', () => {
  const content = normalizeContent({settings:{email:'contact@example.net'}, interfaceCopy:{system:{notFoundTitle:'My missing page', notFoundHeadline:'I cannot find this.', notFoundCopy:'Please [email me](mailto:{email}) or [unsafe](javascript:alert(1)). <img src=x onerror=bad()>', notFoundLink:{label:'My help page', href:'https://example.net/help', newTab:true}, unavailableCopy:'Please [reach me](mailto:{email}).', methodNotAllowed:'Please use a normal page request.'}}});
  const html = systemDocumentHtml(404, content);
  assert.ok(html.includes('href="mailto:contact@example.net"'));
  assert.ok(html.includes('href="https://example.net/help" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('&lt;img src=x onerror=bad()&gt;'));
  assert.doesNotMatch(html, /href="javascript:|<img/);
  assert.ok(systemDocumentHtml(503, content).includes('href="mailto:contact@example.net"'));
  assert.ok(systemDocumentHtml(405, content).includes('Please use a normal page request.'));
  content.interfaceCopy.system.notFoundLink.href = 'javascript:bad()';
  assert.doesNotMatch(systemDocumentHtml(404, content), /My help page/);
});

test('published query includes new public fields and content outages retain the last successful snapshot', async (t) => {
  let unavailable = false;
  const {fetchMock, networkMock} = mockPublishedContent(t, async () => {
    if (unavailable) throw new Error('Simulated content outage');
    return {copy:{home:{headline:'Published and approved'}}, settings:{brandName:'Published studio'}, navigation:{collectionsLabel:'Published collection label'}, interfaceCopy:{inquiry:{successMessage:'My published confirmation'}}};
  });
  const first = await loadContent();
  assert.equal(first.settings.brandName, 'Published studio');
  assert.equal(first.navigation.collectionsLabel, 'Published collection label');
  assert.equal(first.interfaceCopy.inquiry.successMessage, 'My published confirmation');
  assert.match(fetchMock.mock.calls[0].arguments[0], /navigation,interfaceCopy/);
  assert.equal(fetchMock.mock.calls[0].arguments[2].perspective, 'published');
  first.copy.home.headline = 'Caller mutation must not leak';
  unavailable = true;
  const fallback = await loadContent();
  assert.equal(fallback.copy.home.headline, 'Published and approved');
  assert.equal(fallback.settings.brandName, 'Published studio');
  assert.equal(fallback.navigation.collectionsLabel, 'Published collection label');
  await assert.rejects(() => loadContent({strict:true}), /could not be loaded/);
  delete process.env.SANITY_API_READ_TOKEN;
  assert.equal((await loadContent()).settings.brandName, 'Published studio');
  assert.equal(networkMock.mock.callCount(), 0);
});

test('API 404/405 use published system text and inquiry errors receive only the public message/email options', async (t) => {
  const {networkMock} = mockPublishedContent(t, async () => ({settings:{email:'hello@example.net'}, interfaceCopy:{system:{notFoundHeadline:'My custom missing-page wording', methodNotAllowed:'My custom method wording'}, apiMessages:{formUnavailable:'Please reach me at {email} while the form is unavailable.'}}}));
  delete process.env.INQUIRY_FORM_SECRET;
  const missing = await handleRequest(new Request('https://photography.example/no-such-page'));
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /My custom missing-page wording/);
  const method = await handleRequest(new Request('https://photography.example/about', {method:'POST'}));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, HEAD');
  assert.match(await method.text(), /My custom method wording/);
  const inquiry = await handleRequest(new Request('https://photography.example/api/inquiry'));
  assert.equal(inquiry.status, 503);
  assert.deepEqual(await inquiry.json(), {ok:false, code:'UNAVAILABLE', message:'Please reach me at hello@example.net while the form is unavailable.'});
  assert.equal(networkMock.mock.callCount(), 0);
  assert.equal(getDefaultContent().settings.brandName, rawDefaults.settings.brandName);
});
