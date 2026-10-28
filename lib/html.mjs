import {interpolate, renderInline, safeHref} from './content-text.mjs';
import {pageRoutes, sitemapRoutes} from './routes.mjs';

export const SITE_ORIGIN = 'https://waltdublinphotography.com';
// Google Analytics (GA4) measurement ID. Set GA_MEASUREMENT_ID in Vercel to override; empty string disables the tag.
const GA_MEASUREMENT_ID = (process.env.GA_MEASUREMENT_ID ?? 'G-BSX73JDLWG').trim();
const googleTag = GA_MEASUREMENT_ID && /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)
  ? `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`
  : '';
export const ROUTES = pageRoutes;

export function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function documentHtml(page, {route, content, indexable = false}) {
  const settings = content.settings;
  const interfaceCopy = content.interfaceCopy;
  const tokens = {email: settings.email, brandName: settings.brandName};
  const title = page.title || settings.brandName;
  const description = page.description || settings.businessDescription;
  const path = route === 'home' ? '/' : `/${route}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const social = content.photos[content.copy?.placements?.socialShare?.photoKey];
  const firstPhoto = content.photos[page.coverKey] || social || content.photos[content.featuredPhotos?.[0]?.main] || content.photos.family;
  const shareSource = page.coverKey && content.photos[page.coverKey] ? content.photos[page.coverKey] : (social || firstPhoto);
  const image = shareSource?.social || (shareSource?.src ? new URL(shareSource.src, SITE_ORIGIN).href : `${SITE_ORIGIN}/assets/wdp-signature.png`);
  const imageIsSocial = Boolean(shareSource?.social);
  const imageAlt = shareSource?.alt || settings.brandName;
  const areas = (settings.areaServed || []).map((name) => ({'@type': 'City', name}));
  const structuredData = {
    '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${SITE_ORIGIN}/#business`,
    name: settings.brandName, url: SITE_ORIGIN, image,
    logo: `${SITE_ORIGIN}/assets/wdp-signature.png`,
    description: settings.businessDescription,
    email: settings.email,
    priceRange: '$$',
    address: {'@type': 'PostalAddress', addressLocality: 'Charlotte', addressRegion: 'NC', addressCountry: 'US'},
    areaServed: areas,
    knowsAbout: ['Family portraits', 'Senior portraits', 'Graduation portraits', 'Athlete portraits', 'Team photography', 'Wedding photography'],
    hasOfferCatalog: {'@type': 'OfferCatalog', name: 'Portrait sessions', itemListElement: [
      {'@type': 'Offer', itemOffered: {'@type': 'Service', name: 'Individual portraits', areaServed: areas}},
      {'@type': 'Offer', itemOffered: {'@type': 'Service', name: 'Family portraits', areaServed: areas}},
      {'@type': 'Offer', itemOffered: {'@type': 'Service', name: 'Senior and graduation portraits', areaServed: areas}},
      {'@type': 'Offer', itemOffered: {'@type': 'Service', name: 'Athlete and team photography', areaServed: areas}},
      {'@type': 'Offer', itemOffered: {'@type': 'Service', name: 'Wedding photography', areaServed: areas}}
    ]},
    sameAs: [settings.socialLinks?.facebook, settings.socialLinks?.instagram].filter(Boolean)
  };
  return `<!doctype html>
<html lang="en"><head>${googleTag}
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#fdfcf8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${escapeHtml(settings.brandName)}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:secure_url" content="${escapeHtml(image)}"><meta property="og:image:alt" content="${escapeHtml(imageAlt)}">${imageIsSocial ? '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : ''}<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
<meta name="geo.region" content="US-NC"><meta name="geo.placename" content="Charlotte, North Carolina">
<link rel="icon" href="/assets/wdp-signature.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.sanity.io">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/editorial.css">
<script type="application/ld+json">${safeJson(structuredData)}</script>
</head><body><div id="app">${page.body}</div>
<dialog id="image-dialog" class="image-dialog" aria-label="${escapeHtml(interpolate(interfaceCopy.lightbox.dialogLabel, tokens))}"></dialog>
<script id="site-data" type="application/json">${safeJson(page.clientData)}</script>
<script src="/site.js" defer></script></body></html>`;
}

/** Render editable error copy without interpreting HTML or trusting link protocols. */
export function systemDocumentHtml(status, content) {
  const copy = content.interfaceCopy.system;
  const tokens = {email: content.settings.email, brandName: content.settings.brandName};
  const title = status === 404 ? copy.notFoundTitle : status === 405 ? copy.methodNotAllowed : copy.unavailableTitle;
  const headline = status === 404 ? copy.notFoundHeadline : status === 405 ? copy.methodNotAllowed : copy.unavailableHeadline;
  const body = status === 404 ? copy.notFoundCopy : status === 405 ? '' : copy.unavailableCopy;
  const link = status === 404 ? copy.notFoundLink : null;
  const href = link && safeHref(interpolate(link.href, tokens));
  const label = link && interpolate(link.label, tokens);
  const newTab = link?.newTab === true;
  const linkHtml = href && label?.trim() ? `<p><a href="${escapeHtml(href)}"${newTab ? ` target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label + content.interfaceCopy.accessibility.newTabDescription)}"` : ''}>${escapeHtml(label)}</a></p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(interpolate(title, tokens))}</title></head><body style="font:18px system-ui;padding:8vw;max-width:42rem"><main><h1>${renderInline(headline, tokens)}</h1>${body ? `<p>${renderInline(body, tokens)}</p>` : ''}${linkHtml}</main></body></html>`;
}

export function sitemapXml(content) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes(content).map(route => `<url><loc>${SITE_ORIGIN}${route === 'home' ? '/' : `/${route}`}</loc></url>`).join('')}</urlset>`;
}
