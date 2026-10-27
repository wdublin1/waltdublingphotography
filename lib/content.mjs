import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import {safeHref, interpolate} from './content-text.mjs';
import {validGallerySlug} from './routes.mjs';

// Server module only. Never import this module or a configured client into the browser.
if (typeof window !== 'undefined') throw new Error('The content loader is server-only.');

export const CONTENT_ID = 'walt-photography-site';
export const CONTENT_TYPE = 'photographySite';
const API_VERSION = '2026-10-01';
const defaults = JSON.parse(readFileSync(new URL('../content/default-content.json', import.meta.url), 'utf8'));
const galleryFallbackPhotos = JSON.parse(readFileSync(new URL('../content/gallery-fallback-photos.json', import.meta.url), 'utf8'));
const photoDefaults = [...defaults.photos, ...galleryFallbackPhotos];
const clone = (value) => structuredClone(value);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeKeys = (object) => Object.keys(object).filter((key) => !key.startsWith('_') && !['__proto__', 'constructor', 'prototype'].includes(key));

function sanitizeArrayItem(value, examples) {
  const records = examples.filter(isObject);
  if (!records.length) return value === null || examples.some((example) => typeof example === typeof value) && ['string', 'number', 'boolean'].includes(typeof value) ? value : undefined;
  if (!isObject(value)) return undefined;
  const template = Object.assign({}, ...records);
  // A reordered service must inherit its own new fields, never the row at its old index.
  let matched;
  for (const key of ['id', 'key', 'route', 'priceKey', 'type']) {
    if (!Object.hasOwn(value, key) || !['string', 'number'].includes(typeof value[key])) continue;
    const matches = records.filter((record) => Object.hasOwn(record, key) && record[key] === value[key]);
    if (matches.length === 1) { matched = matches[0]; break; }
  }
  // New rows can inherit shared controls, but not a different person's quote or service copy.
  const fallback = matched || Object.fromEntries(safeKeys(template).filter((key) => /^(?:newTab|.*NewTab|.*Label)$/.test(key) && records.every((record) => Object.hasOwn(record, key) && JSON.stringify(record[key]) === JSON.stringify(records[0][key]))).map((key) => [key, records[0][key]]));
  const result = {};
  for (const key of safeKeys(template)) {
    const next = Object.hasOwn(value, key) ? value[key] : undefined;
    const previous = fallback[key];
    if (next === undefined) {
      if (['priceKey', 'type'].includes(key) || Object.hasOwn(template, 'label') && Object.hasOwn(template, 'href') && ['label', 'href'].includes(key)) result[key] = '';
      else if (previous !== undefined) result[key] = clone(previous);
      continue;
    }
    if (Array.isArray(template[key])) {
      result[key] = Array.isArray(next) ? next.map((item) => sanitizeArrayItem(item, template[key])).filter((item) => item !== undefined) : clone(previous || []);
    } else if (isObject(template[key])) {
      result[key] = mergeKnown(isObject(previous) ? previous : template[key], next);
    } else if (next === null || typeof next === typeof template[key] || template[key] === null && ['string', 'number', 'boolean'].includes(typeof next)) {
      result[key] = next;
    } else if (previous !== undefined) {
      result[key] = clone(previous);
    }
  }
  if (Object.hasOwn(template, 'rating') && (!Object.hasOwn(value, 'rating') || value.rating === undefined)) result.rating = null;
  if (Object.hasOwn(template, 'route') && Object.hasOwn(template, 'href') && (!Object.hasOwn(value, 'href') || value.href === undefined) && typeof result.route === 'string') {
    const route = result.route.replace(/^#\//, '').replace(/^\//, '');
    result.href = safeHref(route === 'home' ? '/' : `/${route}`);
  }
  if (Object.hasOwn(template, 'type') && Object.hasOwn(template, 'linkHref') && (!Object.hasOwn(value, 'linkHref') || value.linkHref === undefined)) {
    result.linkHref = typeof result.type === 'string' && result.type ? `/contact?session=${encodeURIComponent(result.type)}` : '/contact';
  }
  return result;
}

function mergeKnown(base, candidate) {
  if (!isObject(base)) return clone(base);
  const result = {};
  for (const key of safeKeys(base)) {
    const previous = base[key];
    const next = isObject(candidate) && Object.hasOwn(candidate, key) ? candidate[key] : undefined;
    if (next === undefined) {
      const clearedLink = isObject(candidate) && Object.hasOwn(base, 'label') && Object.hasOwn(base, 'href') && ['label', 'href'].includes(key);
      const clearedInvitation = isObject(candidate) && ['closingButton', 'closingHeadline', 'closingCopy'].includes(key);
      result[key] = clearedLink || clearedInvitation ? '' : clone(previous);
    }
    else if (Array.isArray(previous)) result[key] = Array.isArray(next) ? next.map((item) => sanitizeArrayItem(item, previous)).filter((item) => item !== undefined) : clone(previous);
    else if (isObject(previous)) result[key] = isObject(next) ? mergeKnown(previous, next) : clone(previous);
    else result[key] = typeof next === typeof previous || next === null || previous === null && ['string', 'number', 'boolean'].includes(typeof next) ? next : clone(previous);
  }
  return result;
}

function safeUrl(value, fallback = '') {
  if (!value) return '';
  const href = safeHref(value);
  return /^https?:\/\//.test(href) ? href : fallback;
}

function safeEmail(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(candidate) && safeHref(`mailto:${candidate}`) ? candidate : defaults.settings.email;
}

const nonblank = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;

function normalizeInterfaceCopy(candidate) {
  const result = mergeKnown(defaults.interfaceCopy, candidate);
  // Controls and status announcements must retain an accessible, useful label when cleared.
  for (const group of ['accessibility', 'social', 'lightbox', 'slideshow', 'portfolio', 'inquiry', 'apiMessages']) {
    for (const [key, fallback] of Object.entries(defaults.interfaceCopy[group] || {})) {
      if (group === 'lightbox' && key === 'counterTemplate') {
        if (isObject(candidate?.lightbox) && candidate.lightbox.counterTemplate === undefined) result.lightbox.counterTemplate = '';
        continue;
      }
      if (typeof fallback === 'string') result[group][key] = nonblank(result[group][key], fallback);
    }
  }
  for (const key of ['notFoundTitle', 'notFoundHeadline', 'unavailableTitle', 'unavailableHeadline', 'methodNotAllowed']) {
    result.system[key] = nonblank(result.system[key], defaults.interfaceCopy.system[key]);
  }
  return result;
}

function dimension(value, fallback) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value)) : fallback;
}

function normalizedPhoto(photo, fallback, imageBuilder) {
  const base = fallback || {src: '', width: 1500, height: 1000, alt: '', category: 'families', objectPosition: ''};
  const image = photo?.image;
  const asset = image?.asset;
  const dimensions = asset?.metadata?.dimensions;
  let width = dimension(dimensions?.width, dimension(photo?.width, base.width));
  let height = dimension(dimensions?.height, dimension(photo?.height, base.height));
  let src = base.src;
  let srcset = base.srcset || '';
  let portraitSrcset = base.portraitSrcset || '';
  // Empty means no hotspot: the stylesheet decides the crop for that position on the page.
  let objectPosition = base.objectPosition || '';
  if (imageBuilder && (asset?._id || asset?._ref)) {
    try {
      const base = () => imageBuilder.image(image).fit('max').auto('format').quality(85);
      src = base().width(1800).url();
      const crop = image.crop || {};
      const left = Number(crop.left) || 0;
      const right = Number(crop.right) || 0;
      const top = Number(crop.top) || 0;
      const bottom = Number(crop.bottom) || 0;
      const retainedWidth = Math.max(0.001, 1 - left - right);
      const retainedHeight = Math.max(0.001, 1 - top - bottom);
      width = Math.max(1, Math.round(width * retainedWidth));
      height = Math.max(1, Math.round(height * retainedHeight));
      if (image.hotspot && Number.isFinite(image.hotspot.x) && Number.isFinite(image.hotspot.y)) {
        const clamp = (value) => Math.min(100, Math.max(0, value));
        objectPosition = `${clamp((image.hotspot.x - left) / retainedWidth * 100).toFixed(2)}% ${clamp((image.hotspot.y - top) / retainedHeight * 100).toFixed(2)}%`;
      }
      // Responsive candidates stop at the asset's own pixels: the CDN never upscales, so a larger request is a wasted byte.
      const widths = [480, 768, 1080, 1440, 1800, 2400].filter((w) => w < width);
      srcset = [...widths, width].map((w) => `${base().width(w).url()} ${w}w`).join(', ');
      // Phones show the hero as a tall frame; a 4:5 crop around the hotspot keeps every served pixel on screen instead of cropping two thirds away in the browser.
      const portraitHeight = height;
      const portraitWidth = Math.min(width, Math.round(portraitHeight * 0.8));
      const portrait = (h) => imageBuilder.image(image).fit('crop').auto('format').quality(88).width(Math.round(portraitWidth * h / portraitHeight)).height(h).url();
      const heights = [900, 1200, 1600, 2000].filter((h) => h < portraitHeight);
      portraitSrcset = [...heights, portraitHeight].map((h) => `${portrait(h)} ${Math.round(portraitWidth * h / portraitHeight)}w`).join(', ');
    } catch {
      // An invalid replacement must not break the existing page photograph.
      src = base.src;
      srcset = base.srcset || '';
      portraitSrcset = base.portraitSrcset || '';
      width = base.width;
      height = base.height;
    }
  }
  const categories = ['families', 'seniors', 'athletes', 'couples', 'events', 'about'];
  return {
    src,
    srcset,
    portraitSrcset,
    width,
    height,
    alt: typeof photo?.alt === 'string' ? photo.alt : base.alt,
    category: categories.includes(photo?.category) ? photo.category : base.category,
    objectPosition,
  };
}

/** Returns only the public fields used by the renderer, never credentials or drafts. */
export function normalizeContent(document = defaults, imageBuilder = null) {
  const copy = mergeKnown(defaults.copy, document?.copy);
  // Clearing a testimonial's rating means unrated; never infer stars from its text.
  copy.testimonials = copy.testimonials.map((review) => ({...review, rating: Number.isInteger(review?.rating) && review.rating >= 1 && review.rating <= 5 ? review.rating : null}));
  const navigation = mergeKnown(defaults.navigation, document?.navigation);
  const interfaceCopy = normalizeInterfaceCopy(document?.interfaceCopy);
  const suppliedSettings = mergeKnown(defaults.settings, document?.settings);
  const email = safeEmail(suppliedSettings.email);
  const suppliedSocials = isObject(document?.settings?.socialLinks) ? document.settings.socialLinks : defaults.settings.socialLinks;
  const settings = {
    bookingLabel: nonblank(suppliedSettings.bookingLabel, defaults.settings.bookingLabel),
    bookingHref: safeHref(interpolate(suppliedSettings.bookingHref, {email})),
    bookingNewTab: suppliedSettings.bookingNewTab === true,
    brandName: nonblank(suppliedSettings.brandName, defaults.settings.brandName),
    businessDescription: nonblank(suppliedSettings.businessDescription, defaults.settings.businessDescription),
    areaServed: [...new Set(suppliedSettings.areaServed.filter((area) => typeof area === 'string' && area.trim()).map((area) => area.trim()))],
    email,
    socialLinks: {
      email: `mailto:${email}`,
      facebook: safeUrl(suppliedSocials.facebook),
      instagram: safeUrl(suppliedSocials.instagram),
    },
  };
  const prices = Object.fromEntries(Object.entries(defaults.prices).map(([key, value]) => {
    const candidate = document?.prices?.[key];
    return [key, Number.isFinite(candidate) && candidate >= 0 && candidate <= 250000 ? candidate : value];
  }));
  const photos = Object.fromEntries(photoDefaults.map((photo) => [photo.key, normalizedPhoto(photo, photo, imageBuilder)]));
  for (const photo of Array.isArray(document?.photos) ? document.photos : []) {
    if (!photo || typeof photo.key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(photo.key) || ['constructor', 'prototype', '__proto__'].includes(photo.key)) continue;
    const normalized = normalizedPhoto(photo, photoDefaults.find((item) => item.key === photo.key), imageBuilder);
    if (normalized.src) photos[photo.key] = normalized;
  }
  const requestedFrames = Array.isArray(document?.featuredPhotos) ? document.featuredPhotos : defaults.featuredPhotos;
  // A frame needs its hero (main) photograph; the legacy supporting portraits fall back to it when blank.
  const frames = requestedFrames.filter((frame) => frame && photos[frame.main]).map(({main, left, right}) => ({main, left: photos[left] ? left : main, right: photos[right] ? right : main}));
  const featuredPhotos = frames.length ? frames : clone(defaults.featuredPhotos);
  const requestedOrder = Array.isArray(document?.portfolioOrder) ? document.portfolioOrder : defaults.portfolioOrder;
  const pinnedOrder = [...new Set(requestedOrder.filter((key) => typeof key === 'string' && photos[key]))];
  // Every photograph in the library (other than the About Walt portraits) follows the pinned order, so new uploads show up on the all-photographs page without being listed by hand.
  const libraryKeys = (Array.isArray(document?.photos) ? document.photos : []).map((photo) => photo?.key).filter((key) => typeof key === 'string' && photos[key] && photos[key].category !== 'about');
  const portfolioOrder = [...new Set([...pinnedOrder, ...libraryKeys])];
  const gallerySource = Array.isArray(document?.featuredSessions) ? document.featuredSessions : defaults.featuredSessions || [];
  const gallerySlugs = new Set();
  const featuredSessions = gallerySource.flatMap(item => {
    if (!isObject(item) || !validGallerySlug(item.slug) || gallerySlugs.has(item.slug) || !['families', 'seniors', 'athletes'].includes(item.category)) return [];
    const photoKeys = [...new Set((Array.isArray(item.photoKeys) ? item.photoKeys : []).filter(key => typeof key === 'string' && Object.hasOwn(photos, key)))];
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title || !photoKeys.length) return [];
    gallerySlugs.add(item.slug);
    const inquiryLink = isObject(item.inquiryLink) ? {
      label: typeof item.inquiryLink.label === 'string' ? item.inquiryLink.label : '',
      href: safeHref(item.inquiryLink.href), newTab: item.inquiryLink.newTab === true,
    } : null;
    return [{id: typeof item.id === 'string' ? item.id : item.slug, slug: item.slug, title,
      category: item.category, type: item.type === 'session' ? 'session' : 'collection',
      description: typeof item.description === 'string' ? item.description : '',
      location: typeof item.location === 'string' ? item.location : '',
      coverKey: Object.hasOwn(photos, item.coverKey) ? item.coverKey : photoKeys[0],
      photoKeys, enabled: item.enabled === true, inquiryLink}];
  });
  return {copy, settings, navigation, interfaceCopy, prices, photos, featuredPhotos, portfolioOrder, featuredSessions};
}

export function getDefaultContent() { return normalizeContent(defaults); }

let lastPublishedContent;
let warnedAboutUnavailableContent = false;

/** Fetch fresh, published-only content on the server. No browser-visible token is created. */
export async function loadContent({strict = false} = {}) {
  const projectId = process.env.SANITY_API_PROJECT_ID;
  const dataset = process.env.SANITY_API_DATASET;
  const token = process.env.SANITY_API_READ_TOKEN;
  if (!projectId || !dataset || !token) {
    if (strict) throw new Error('Server-side Sanity read configuration is incomplete.');
    return lastPublishedContent ? clone(lastPublishedContent) : getDefaultContent();
  }
  try {
    const client = createClient({projectId, dataset, token, apiVersion: API_VERSION, useCdn: false, perspective: 'published', timeout: 8000, maxRetries: 1});
    const document = await client.fetch(
      `*[_type == $type && _id == $id][0]{copy,settings,navigation,interfaceCopy,prices,featuredPhotos,featuredSessions,portfolioOrder,photos[]{key,title,alt,category,image{...,asset->{_id,url,metadata{dimensions}}}}}`,
      {type: CONTENT_TYPE, id: CONTENT_ID},
      {perspective: 'published'},
    );
    if (!document) {
      if (strict) throw new Error('The photography content has not been published.');
      return lastPublishedContent ? clone(lastPublishedContent) : getDefaultContent();
    }
    const builder = createImageUrlBuilder({projectId, dataset});
    lastPublishedContent = normalizeContent(document, builder);
    warnedAboutUnavailableContent = false;
    return clone(lastPublishedContent);
  } catch {
    if (strict) throw new Error('Published photography content could not be loaded.');
    if (!warnedAboutUnavailableContent) {
      console.warn('Published website content is temporarily unavailable; using the last approved content.');
      warnedAboutUnavailableContent = true;
    }
    return lastPublishedContent ? clone(lastPublishedContent) : getDefaultContent();
  }
}
