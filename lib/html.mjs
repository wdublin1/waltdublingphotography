import {interpolate, renderInline, safeHref} from './content-text.mjs';
import {pageRoutes, sitemapRoutes} from './routes.mjs';

export const SITE_ORIGIN = 'https://waltdublinphotography.com';
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
  const firstPhoto = content.photos[page.coverKey] || content.photos[content.featuredPhotos?.[0]?.main] || content.photos.family;
  const image = firstPhoto?.src ? new URL(firstPhoto.src, SITE_ORIGIN).href : `${SITE_ORIGIN}/assets/wdp-signature.png`;
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'ProfessionalService',
    name: settings.brandName, url: SITE_ORIGIN, image,
    logo: `${SITE_ORIGIN}/assets/wdp-signature.png`,
    description: settings.businessDescription,
    email: settings.email,
    areaServed: settings.areaServed,
    sameAs: [settings.socialLinks?.facebook, settings.socialLinks?.instagram].filter(Boolean)
  };
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#fdfcf8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${escapeHtml(settings.brandName)}">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
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
