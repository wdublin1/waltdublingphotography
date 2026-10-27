import {escapeHtml, interpolate, renderInline, safeHref} from './content-text.mjs';
export {escapeHtml} from './content-text.mjs';

import {pageRoutes, isPageRoute, featuredSessionForRoute} from './routes.mjs';
export {pageRoutes} from './routes.mjs';
// Stable values belong to the inquiry API; the visible labels are editable.
const serviceTypes = Object.freeze({individual: 'Individual portraits', family: 'Family portraits', senior: 'Senior or graduate portraits', athlete: 'Individual athlete portraits', team: 'Team photography', other: 'Something else'});
const serviceNames = Object.values(serviceTypes);
const priceDefaults = Object.freeze({individual: 250, family: 295, senior: 350, athlete: 395});

function safeImageUrl(value) {
  const href = safeHref(String(value ?? ''));
  return href.startsWith('/') || /^https?:/.test(href) ? href : '';
}
function photoPosition(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const tokens = raw.split(/\s+/);
  if (tokens.length > 4) return '';
  return tokens.every(token => /^(left|right|top|bottom|center)$/.test(token) || (/^\d+(?:\.\d+)?%$/.test(token) && parseFloat(token) <= 100)) ? tokens.join(' ') : '';
}
function legacyRoutePath(value = 'contact') {
  const raw = String(value ?? '').replace(/^#\//, '').replace(/^\//, '');
  const [pathname, ...search] = raw.split('?');
  const key = pathname === '' || pathname === 'home' ? 'home' : pathname.replace(/\/$/, '');
  if (!pageRoutes.includes(key)) return '/contact';
  const path = key === 'home' ? '/' : `/${key}`;
  const params = new URLSearchParams(search.join('?'));
  return path + (params.size ? `?${params.toString()}` : '');
}

/** Render a complete, crawlable page without reading globals or changing content. */
export function renderPage(route, content, query = new URLSearchParams()) {
  const routeKey = String(route || 'home').replace(/^\//, '').replace(/\/$/, '') || 'home';
  if (!isPageRoute(routeKey, content)) throw new RangeError('Unknown page route');
  const featuredSession = featuredSessionForRoute(routeKey, content);
  const siteCopy = content.copy || {};
  const shared = siteCopy.shared || {};
  const siteSettings = content.settings || {};
  const navigation = content.navigation || {};
  const ui = content.interfaceCopy || {};
  const accessibility = ui.accessibility || {};
  const bookingLabel = siteSettings.bookingLabel || 'Inquire to book';
  const rawEmail = String(siteSettings.email || '').trim();
  const email = /^[^\s@<>"\r\n]+@[^\s@<>"\r\n]+\.[^\s@<>"\r\n]+$/.test(rawEmail) ? rawEmail : '';
  const emailHref = email ? `mailto:${encodeURIComponent(email).replaceAll('%40', '@')}` : '';
  const photos = Object.fromEntries(Object.entries(content.photos || {}).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object') return [];
    const rawSrc = String(value.src || '');
    const src = safeImageUrl(rawSrc.startsWith('assets/') ? `/${rawSrc}` : rawSrc);
    if (!src) return [];
    const dimension = number => Number.isInteger(Number(number)) && Number(number) > 0 && Number(number) <= 30000 ? Number(number) : 1500;
    const safeSrcset = raw => String(raw || '').split(/,\s+/).map(part => part.trim()).filter(Boolean).flatMap(part => {
      const [url, descriptor] = part.split(/\s+/);
      return safeImageUrl(url) && /^\d+w$/.test(descriptor || '') ? [`${safeImageUrl(url)} ${descriptor}`] : [];
    }).join(', ');
    return [[key, {src, srcset: safeSrcset(value.srcset), portraitSrcset: safeSrcset(value.portraitSrcset), width: dimension(value.width), height: dimension(value.height), alt: String(value.alt || ''), category: String(value.category || ''), objectPosition: photoPosition(value.objectPosition)}]];
  }));
  const clientNotes = Array.isArray(siteCopy.testimonials) ? siteCopy.testimonials : [];
  const featuredPhotos = (Array.isArray(content.featuredPhotos) ? content.featuredPhotos : []).filter(frame => frame && [frame.main, frame.left, frame.right].every(key => Object.hasOwn(photos, key)));
  const portfolioOrder = [...new Set(Array.isArray(content.portfolioOrder) ? content.portfolioOrder : [])].filter(key => Object.hasOwn(photos, key));
  const startingPrices = Object.fromEntries(Object.entries(priceDefaults).map(([key, fallback]) => {
    const value = Number(content.prices?.[key]);
    return [key, new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(Number.isFinite(value) && value >= 0 ? value : fallback)];
  }));
  const tokens = {email, individualPrice: startingPrices.individual, familyPrice: startingPrices.family, seniorPrice: startingPrices.senior, athletePrice: startingPrices.athlete};
  const esc = escapeHtml;
  const text = value => esc(interpolate(value, tokens));
  const inline = value => renderInline(value, tokens);
  // Cards are already links; retain inline link labels without nesting anchors.
  const cardText = value => inline(value).replace(/<\/?a\b[^>]*>/g, '');
  const records = items => (Array.isArray(items) ? items : []).filter(item => item && typeof item === 'object');
  const paragraphs = items => (Array.isArray(items) ? items : []).map(value => `<p>${inline(value)}</p>`).join('');
  const copySection = section => section ? `${section.headline ? `<h2>${text(section.headline)}</h2>` : ''}${paragraphs(section.paragraphs)}` : '';
  const bookingLink = {label: bookingLabel, href: siteSettings.bookingHref ?? '/contact', newTab: siteSettings.bookingNewTab === true};

  function isCurrent(href) {
    try {
      const url = new URL(href, 'https://waltdublinphotography.com');
      return url.origin === 'https://waltdublinphotography.com' && (url.pathname.replace(/\/$/, '') || '/') === (routeKey === 'home' ? '/' : `/${routeKey}`);
    } catch { return false; }
  }
  function link(value, className = '', {fallbackLabel = '', fallbackHref = '', current = false, inner = null} = {}) {
    const item = value && typeof value === 'object' ? value : {};
    const href = safeHref(interpolate(item.href ?? fallbackHref, tokens));
    const label = typeof item.label === 'string' && item.label.trim() ? item.label : fallbackLabel;
    if (!href || (!String(label).trim() && inner === null)) return '';
    const newTab = item.newTab === true;
    const extraLabel = newTab && accessibility.newTabDescription ? `<span class="sr-only">${text(accessibility.newTabDescription)}</span>` : '';
    return `<a${className ? ` class="${esc(className)}"` : ''} href="${esc(href)}"${current && isCurrent(href) ? ' aria-current="page"' : ''}${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner ?? text(label)}${extraLabel}</a>`;
  }
  function button(value = bookingLink, secondary = false) {
    return link(value, `button${secondary ? ' secondary' : ''}`, {fallbackLabel: bookingLabel, fallbackHref: bookingLink.href});
  }
  const textLink = value => link(value, 'text-link');
  // How wide each photo renders, so the browser picks the smallest candidate that stays sharp at the screen's pixel density.
  const photoSizes = {'hero-main-photo': '100vw', 'page-hero-image': '100vw', 'athlete-photo': '(max-width:800px) 100vw, 45vw', 'image-1': '(max-width:800px) 100vw, 50vw', 'image-2': '(max-width:800px) 100vw, 50vw', 'image-3': '(max-width:800px) 100vw, 50vw', 'image-4': '(max-width:800px) 100vw, 50vw'};
  function photo(key, className = '', clickable = false, eager = false, {portrait = false} = {}) {
    if (!Object.hasOwn(photos, key)) return '';
    const p = photos[key];
    const position = p.objectPosition ? ` style="object-position:${esc(p.objectPosition)}"` : '';
    const sizes = photoSizes[className] || '(max-width:600px) 100vw, (max-width:1100px) 50vw, 33vw';
    const responsive = p.srcset ? ` srcset="${esc(p.srcset)}" sizes="${sizes}"` : '';
    const img = `<img src="${esc(p.src)}"${responsive} width="${p.width}" height="${p.height}" alt="${esc(p.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}${position}>`;
    // Tall phone frames get a native-pixel portrait crop instead of a landscape file the browser would stretch.
    const image = portrait && p.portraitSrcset ? `<picture><source media="(max-width:600px) and (orientation:portrait)" srcset="${esc(p.portraitSrcset)}" sizes="100vw">${img}</picture>` : img;
    const label = interpolate(accessibility.openPhotoTemplate, {description: p.alt});
    return clickable ? `<button class="photograph ${esc(className)}" type="button" data-photo="${esc(key)}" data-category="${esc(p.category)}" aria-label="${esc(label)}">${image}</button>` : `<div class="photograph ${esc(className)}">${image}</div>`;
  }
  // Editable page positions with built-in fallbacks so a missing library photo never leaves a hole.
  const placementFallbacks = {homeInquiry: ["shoulders", "graduate"], familiesHero: ['holiday', 'family'], familiesGalleryOne: ['individualMan'], familiesGalleryTwo: ['individualWoman'], familiesGalleryThree: ['family'], familiesGalleryFour: ['mother'], familiesGalleryFive: ['sons'], familiesGallerySix: ['hand'], familiesIndividual: ['individualMan'], familiesGroup: ['grass'], seniorsHero: ['graduate'], seniorsSport: ['football'], athletesHero: ['teammates', 'sportAction'], athletesPortrait: ['football'], athletesTeam: ['teammates'], reviewsHero: ['family']};
  function placed(name) {
    const chosen = siteCopy.placements?.[name]?.photoKey;
    if (typeof chosen === 'string' && Object.hasOwn(photos, chosen)) return chosen;
    return (placementFallbacks[name] || []).find(key => Object.hasOwn(photos, key)) || '';
  }
  function logo(className = '') {
    const image = `<img src="/assets/wdp-signature.png" width="2172" height="724" alt="${text(siteSettings.brandName)}" decoding="async">`;
    const href = safeHref(interpolate(navigation.logoHref, tokens));
    const classes = `logo${className ? ` ${esc(className)}` : ''}`;
    return href ? `<a class="${classes}" href="${esc(href)}" aria-label="${text(accessibility.logoHomeLabel)}">${image}</a>` : `<div class="${classes}">${image}</div>`;
  }
  function socialIcons(className = '') {
    const icons = {
      email: '<rect x="3" y="5" width="18" height="14" rx=".5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3.5 6 8.5 7 8.5-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      facebook: '<path d="M15 8h3V4h-3c-3.3 0-5 1.9-5 5v2H7v4h3v7h4v-7h3.2l.8-4h-4V9c0-.7.3-1 1-1Z" fill="currentColor"/>',
      instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.15" fill="currentColor"/>'
    };
    const links = Object.entries(icons).map(([key, icon]) => {
      const external = key !== 'email';
      const href = external ? safeHref(siteSettings.socialLinks?.[key]) : emailHref;
      if (!href) return '';
      const title = ui.social?.[`${key}Label`] || key;
      const label = interpolate(title, tokens) + (external ? accessibility.newTabDescription || '' : '');
      return `<a class="social-link" data-social-link="${key}" href="${esc(href)}" aria-label="${esc(label)}" title="${text(title)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${icon}</svg></a>`;
    }).join('');
    return links ? `<nav class="social-links ${esc(className)}" aria-label="${text(accessibility.socialNavigationLabel)}">${links}</nav>` : '';
  }
  function reviewStars(rating) {
    const value = Number(rating);
    if (!Number.isInteger(value) || value < 1 || value > 5) return '';
    const star = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9Z" fill="currentColor"/></svg>';
    return `<div class="review-stars" role="img" aria-label="${esc(interpolate(accessibility.reviewRatingTemplate, {rating: value}))}">${star.repeat(value)}</div>`;
  }
  const navLinks = items => records(items).map(item => link(item, '', {current: true})).join('');
  function header() {
    const links = navLinks(navigation.headerLinks);
    const collectionLinks = navLinks(navigation.collectionLinks);
    const contactLink = link(bookingLink, 'header-inquiry', {current: true, inner: `<span class="desktop-contact-label">${text(bookingLabel)}</span><span class="mobile-contact-label">${text(bookingLabel)}</span>`});
    return `<a class="skip-link" href="#main-content">${text(accessibility.skipLabel)}</a><header class="site-header"><div class="header-inner">${logo('wordmark')}<nav class="desktop-nav" aria-label="${text(accessibility.mainNavigationLabel)}"><details class="collection-menu"><summary>${text(navigation.collectionsLabel)} <span aria-hidden="true">⌄</span></summary><nav aria-label="${text(accessibility.collectionNavigationLabel)}">${collectionLinks}</nav></details>${links}</nav>${contactLink}<details class="mobile-menu"><summary>${text(navigation.menuLabel)} <span aria-hidden="true">☰</span></summary><nav aria-label="${text(accessibility.mobileNavigationLabel)}">${collectionLinks}${links}${link(navigation.mobileContactLink)}</nav></details></div></header>`;
  }
  function footer() {
    return `<footer class="site-footer"><div class="wrap footer-main"><div>${logo()}<p>${inline(siteCopy.footer)}</p>${link(navigation.footerEmailLink, 'footer-email')}${socialIcons('footer-social-links')}</div><nav aria-label="${text(accessibility.footerPhotographyLabel)}">${navLinks(navigation.footerPhotographyLinks)}</nav><nav aria-label="${text(accessibility.footerInformationLabel)}">${navLinks(navigation.footerInformationLinks)}</nav></div><div class="wrap footer-bottom"><span>${text(navigation.copyrightText)}</span><span>${text(navigation.location)}</span></div></footer>`;
  }
  function quote(index, className = '') {
    const r = clientNotes[index];
    if (!r) return '';
    return `<figure class="client-quote ${esc(className)}">${reviewStars(r.rating)}<blockquote>“${inline(r.quote)}”</blockquote><figcaption>${text(r.name)}<span>${inline(r.context)}</span></figcaption></figure>`;
  }
  function invitation(c = {}) {
    const title = typeof c.closingHeadline === 'string' && c.closingHeadline.trim() ? c.closingHeadline : shared.invitationHeadline;
    const copy = typeof c.closingCopy === 'string' && c.closingCopy.trim() ? c.closingCopy : shared.invitationCopy;
    const invitationLink = {label: c.closingButton, href: c.closingHref ?? bookingLink.href, newTab: c.closingNewTab ?? bookingLink.newTab};
    return `<section class="invitation"><div class="wrap invitation-inner"><div><h2>${text(title)}</h2><p>${inline(copy)}</p></div>${button(invitationLink)}</div></section>`;
  }
  function gallery(keys, className = '') {
    return `<div class="photo-grid ${esc(className)}">${keys.map((key, i) => photo(key, `image-${i + 1}`, true)).join('')}</div>`;
  }
  function serviceNav() {
    return `<nav class="service-nav wrap" aria-label="${text(accessibility.serviceNavigationLabel)}">${navLinks(navigation.serviceLinks)}</nav>`;
  }
  function extraSections(c) {
    const sections = records(c.sections).slice(3);
    return sections.length ? `<section class="wrap additional-sections reading">${sections.map(section => `<div class="prose-section">${copySection(section)}</div>`).join('')}</section>` : '';
  }
  function sectionHeading(eyebrow, headline, intro = '', headingTag = 'h2') {
    return `<div class="section-heading">${eyebrow ? `<p class="location-label">${text(eyebrow)}</p>` : ''}${headline ? `<${headingTag}>${text(headline)}</${headingTag}>` : ''}${intro ? `<p>${inline(intro)}</p>` : ''}</div>`;
  }
  function faqSection(headline, items, className = 'service-faq', eyebrow = '') {
    const questions = records(items).filter(item => item.question?.trim() && item.answer?.trim());
    if (!questions.length) return '';
    return `<section class="wrap ${esc(className)}">${sectionHeading(eyebrow, headline)}<div class="faq-list">${questions.map(item => `<details><summary>${text(item.question)}</summary><p>${inline(item.answer)}</p></details>`).join('')}</div></section>`;
  }
  function experienceSteps(headingTag = 'h3') {
    return `<div class="experience-steps">${records(siteCopy.experience?.steps).filter(step => step.title || step.copy).map((step, index) => `<article class="experience-step"><span class="step-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><${headingTag}>${text(step.title)}</${headingTag}><p>${inline(step.copy)}</p></article>`).join('')}</div>`;
  }
  function sessionFacts(item) {
    const facts = [['duration', shared.durationLabel], ['imageCount', shared.imageCountLabel], ['delivery', shared.deliveryLabel]].filter(([key]) => typeof item[key] === 'string' && item[key].trim());
    return facts.length ? `<dl class="session-facts">${facts.map(([key, label]) => `<div><dt>${text(label)}</dt><dd>${inline(item[key])}</dd></div>`).join('')}</dl>` : '';
  }
  function inclusions(item) {
    const lines = (Array.isArray(item.inclusions) ? item.inclusions : []).filter(value => typeof value === 'string' && value.trim());
    return `${lines.length ? `<ul class="session-inclusions">${lines.map(value => `<li>${inline(value)}</li>`).join('')}</ul>` : ''}${sessionFacts(item)}`;
  }
  function sessionDetails(c) {
    const rows = records(c.sessionDetails).filter(item => item.title);
    if (!rows.length) return '';
    const pricing = siteCopy.pricing || {};
    return `<section class="wrap session-details">${sectionHeading('', c.detailsHeadline)}<div class="session-detail-grid">${rows.map(item => `<article class="session-detail"><h3>${text(item.title)}</h3><p class="session-price">${Object.hasOwn(startingPrices, item.priceKey) ? esc(interpolate(pricing.priceTemplate, {price: startingPrices[item.priceKey]})) : text(pricing.customPriceLabel)}</p>${inclusions(item)}${textLink({label:item.linkLabel, href:item.linkHref, newTab:item.linkNewTab})}</article>`).join('')}</div></section>`;
  }
  function featuredGalleries({category = '', headline = '', eyebrow = '', intro = '', allLink = null, limit = 0, headingTag = 'h3', avoid = new Set()} = {}) {
    let items = records(content.featuredSessions).filter(item => item.enabled === true && (!category || item.category === category) && item.photoKeys?.length);
    if (limit > 0) items = items.slice(0, limit);
    if (!items.length) return '';
    const c = siteCopy.featured || {};
    // Prefer a cover not already shown on this page so the same photograph is not repeated down the page.
    const taken = new Set(avoid);
    const coverFor = item => {
      const key = [item.coverKey, ...item.photoKeys].find(candidate => Object.hasOwn(photos, candidate) && !taken.has(candidate)) || item.coverKey;
      taken.add(key);
      return key;
    };
    return `<section class="wrap featured-section">${sectionHeading(eyebrow, headline, intro)}<div class="featured-grid">${items.map(item => link({label:item.title, href:`/featured/${item.slug}`}, 'featured-card', {inner:`${photo(coverFor(item))}<div class="featured-card-copy"><p class="location-label">${text(siteCopy.portfolio?.filterLabels?.[item.category])}</p><${headingTag}>${text(item.title)}</${headingTag}><p>${cardText(item.description)}</p><span class="service-card-label">${text(c.cardLabel)}</span></div>`})).join('')}</div>${allLink ? textLink(allLink) : ''}</section>`;
  }
  function serviceEnd(c, category, avoid = []) {
    return `${extraSections(c)}${featuredGalleries({category,headline:c.featuredHeadline,avoid:new Set(avoid)})}${faqSection(c.faqHeadline,c.faqItems)}${invitation(c)}`;
  }
  function experience() {
    const c = siteCopy.experience || {};
    return `<main id="main-content"><section class="wrap page-intro">${c.eyebrow ? `<p class="location-label">${text(c.eyebrow)}</p>` : ''}<h1>${text(c.headline)}</h1><p>${inline(c.intro)}</p></section><section class="wrap experience-section">${experienceSteps('h2')}</section>${sessionDetails(c)}${faqSection(siteCopy.home?.faqHeadline,siteCopy.home?.faqItems)}${invitation(c)}</main>`;
  }
  function featured() {
    const c = siteCopy.featured || {};
    const active = records(content.featuredSessions).some(item => item.enabled === true && item.photoKeys?.length);
    return `<main id="main-content"><section class="wrap page-intro"><h1>${text(c.headline)}</h1><p>${inline(c.intro)}</p></section>${active ? featuredGalleries({headingTag:'h2'}) : `<section class="wrap page-intro"><p>${inline(c.emptyMessage)}</p></section>`}${invitation(c)}</main>`;
  }
  function featuredDetail() {
    const c = siteCopy.featured || {};
    const item = featuredSession;
    const specific = siteCopy[item.category] || {};
    const fallbackInquiry = item.category === 'families' ? specific.familyLink : specific.heroLink;
    const inquiry = item.inquiryLink || c.inquiryLink || fallbackInquiry || bookingLink;
    const categoryName = siteCopy.portfolio?.filterLabels?.[item.category];
    return `<main id="main-content"><section class="wrap featured-story-intro">${textLink({label:c.backLabel,href:c.backHref})}<p class="location-label">${text(categoryName)}${item.location ? ` · ${text(item.location)}` : ''}</p><h1>${text(item.title)}</h1><p>${inline(item.description)}</p>${button(inquiry)}</section><section class="wrap featured-story-gallery"><div class="portfolio-grid${item.photoKeys.length < 3 ? ' small-collection' : ''}">${item.photoKeys.map((key,index) => photo(key, '', true, index === 0)).join('')}</div></section><section class="wrap featured-return">${textLink({label:shared.featuredServiceLinkLabel,href:`/${item.category}`})}</section>${invitation({...c,closingButton:inquiry.label,closingHref:inquiry.href,closingNewTab:inquiry.newTab})}</main>`;
  }
  function inquiryForm(selected = '', compact = false) {
    const c = siteCopy.contact || {};
    const form = c.form || {};
    const timing = compact ? '' : `<div class="form-field"><label for="inquiry-when">${text(c.timingLabel)}</label><input id="inquiry-when" name="when" maxlength="200" placeholder="${text(form.timingPlaceholder)}"></div>`;
    return `<form id="inquiry-form" class="${compact ? 'inquiry-form-compact' : ''}" action="/api/inquiry" method="post" aria-label="${text(ui.inquiry?.dialogLabel)}"><div class="form-field"><label for="inquiry-name">${text(form.nameLabel)} <span>${text(form.requiredLabel)}</span></label><input id="inquiry-name" name="name" autocomplete="name" required maxlength="120"></div><div class="form-field"><label for="inquiry-email">${text(form.emailLabel)} <span>${text(form.requiredLabel)}</span></label><input id="inquiry-email" name="email" type="email" autocomplete="email" required maxlength="254"></div><div class="form-field"><label for="inquiry-session">${text(form.sessionLabel)}</label><select id="inquiry-session" name="session"><option value="">${text(form.undecidedLabel)}</option>${Object.entries(serviceTypes).map(([key, value]) => `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${text(form.sessionLabels?.[key] ?? value)}</option>`).join('')}</select></div>${timing}<div class="form-field"><label for="inquiry-message">${text(c.messageLabel)}</label><p id="inquiry-message-help" class="field-help">${inline(c.messageHelp)}</p><textarea id="inquiry-message" name="message" rows="${compact ? 4 : 6}" maxlength="6000" aria-describedby="inquiry-message-help"></textarea></div><div class="inquiry-honeypot" aria-hidden="true"><label for="inquiry-website">${text(form.honeypotLabel)}</label><input id="inquiry-website" name="website" type="text" tabindex="-1" autocomplete="off"></div><button class="button" type="submit" aria-describedby="inquiry-disclosure">${text(ui.inquiry?.submitLabel)}</button><p class="form-disclosure" id="inquiry-disclosure">${inline(form.disclosure)}</p><p id="inquiry-status" class="inquiry-status" role="status" aria-live="polite" tabindex="-1" hidden></p><noscript><p class="form-disclosure">${inline(form.noScriptCopy)}</p><style>#inquiry-form>button[type=submit]{display:none}</style></noscript></form>`;
  }
  function home() {
    const c = siteCopy.home || {};
    const slide = ui.slideshow || {};
    const pricing = siteCopy.pricing || {};
    const routePriceKeys = {families: 'individual', seniors: 'senior', athletes: 'athlete'};
    const servicePrice = item => {
      const key = Object.hasOwn(startingPrices, item.priceKey) ? item.priceKey : routePriceKeys[String(item.route ?? '').replace(/^\//, '')];
      return Object.hasOwn(startingPrices, key) && c.servicePriceTemplate ? `<span class="service-tile-price">${esc(interpolate(c.servicePriceTemplate, {price: startingPrices[key]}))}</span>` : '';
    };
    const heroSlides = featuredPhotos.map((frame, i) => `<div class="hero-gallery${i === 0 ? ' is-active' : ''}" data-hero-slide="${i}" role="group" aria-roledescription="${text(slide.slideRoleDescription)}" aria-label="${esc(interpolate(slide.slideTemplate, {index: i + 1, total: featuredPhotos.length}))}"${i !== 0 ? ' aria-hidden="true"' : ''}><div class="hero-feature">${photo(frame.main, 'hero-main-photo', false, i === 0, {portrait: true})}</div></div>`).join('');
    const heroCopy = `<div class="hero-caption"><div class="hero-caption-inner"><p class="location-label">${text(c.locationLabel)}</p><h1>${text(c.headline)}</h1><p class="hero-lede">${inline(c.intro)}</p><div class="hero-actions">${link(c.inquiryLink, 'button hero-button', {fallbackLabel: bookingLabel, fallbackHref: bookingLink.href})}${link(c.workLink, 'button secondary hero-button')}</div></div></div>`;
    const onPage = new Set([...featuredPhotos.map(frame => frame.main), ...records(c.services).map(item => item.photoKey), 'walt', placed('homeInquiry')]);
    const workKeys = portfolioOrder.filter(key => !onPage.has(key)).slice(0, 5);
    const workStrip = workKeys.length >= 3 ? `<section class="wrap home-work"><div class="home-work-heading">${sectionHeading(c.workEyebrow, c.workHeadline)}${textLink(c.workLink)}</div><div class="home-work-grid">${workKeys.map((key, i) => photo(key, `work-${i + 1}`, true)).join('')}</div></section>` : '';
    return `<main id="main-content"><section class="visual-hero hero-overlay" data-hero-carousel aria-label="${text(slide.regionLabel)}" aria-roledescription="${text(slide.roleDescription)}"><div class="hero-stage">${heroSlides}</div><div class="hero-shade" aria-hidden="true"></div>${heroCopy}<div class="hero-controls" role="group" aria-label="${text(slide.controlsLabel)}" hidden><button type="button" data-hero-prev aria-label="${text(slide.previousLabel)}">←</button><button type="button" data-hero-pause aria-label="${text(slide.pauseLabel)}" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button><button type="button" data-hero-next aria-label="${text(slide.nextLabel)}">→</button></div></section>
    <section class="session-directory service-directory service-tiles" aria-label="${text(c.directoryHeadline)}"><div class="service-cards">${records(c.services).map(item => link({label:item.title,href:item.href ?? legacyRoutePath(item.route),newTab:item.newTab}, 'service-card service-tile', {inner:`${photo(item.photoKey,'service-card-image')}<div class="service-tile-shade" aria-hidden="true"></div><div class="service-card-copy">${servicePrice(item)}<h3>${text(item.title)}</h3><p>${cardText(item.copy)}</p></div>`})).join('')}</div><div class="wrap directory-intro directory-intro-below">${sectionHeading(c.directoryEyebrow,c.directoryHeadline,c.directoryIntro)}${textLink(c.pricingLink)}</div></section>
    ${workStrip}
    <section class="personal-section"><div class="wrap personal-portrait-layout"><figure class="personal-portrait">${photo('walt')}<figcaption>${inline(shared.personalPortraitCaption)}</figcaption></figure><div class="personal-story short-personal-story"><p class="location-label">${text(c.personalEyebrow)}</p><h2>${text(c.personalHeadline)}</h2>${paragraphs(c.personalParagraphs)}${textLink(c.aboutLink)}</div></div></section>
    <section class="wrap experience-section">${sectionHeading(c.experienceEyebrow,c.experienceHeadline,c.experienceIntro)}${experienceSteps()}${textLink(c.experienceLink)}</section>
    ${featuredGalleries({headline:c.featuredHeadline,eyebrow:c.featuredEyebrow,intro:c.featuredIntro,allLink:c.featuredLink,limit:3,avoid:new Set([...onPage, ...workKeys])})}
    <section class="wrap home-client-note home-client-note-centered"><div class="note-copy"><p class="location-label">${text(c.reviewEyebrow)}</p>${quote(0)}${textLink(c.reviewsLink)}</div></section>
    ${faqSection(c.faqHeadline,c.faqItems,'home-faq',c.faqEyebrow)}
    <section class="home-inquiry" id="inquire"><div class="home-inquiry-photo">${photo(placed('homeInquiry'))}</div><div class="home-inquiry-copy"><p class="location-label">${text(c.inquiryEyebrow)}</p><h2>${text(typeof c.closingHeadline === 'string' && c.closingHeadline.trim() ? c.closingHeadline : shared.invitationHeadline)}</h2><p>${inline(typeof c.closingCopy === 'string' && c.closingCopy.trim() ? c.closingCopy : shared.invitationCopy)}</p>${inquiryForm('', true)}<div class="home-inquiry-alternatives">${typeof c.closingButton === 'string' && c.closingButton.trim() ? textLink({label: c.closingButton, href: c.closingHref ?? bookingLink.href, newTab: c.closingNewTab ?? bookingLink.newTab}) : ''}${email ? `<p class="home-inquiry-email">${text(c.inquiryEmailLead)} <a href="${esc(emailHref)}">${esc(email)}</a></p>` : ''}</div></div></section></main>`;
  }
  function portfolio() {
    const c = siteCopy.portfolio || {};
    const filterNames = ['all', 'families', 'seniors', 'athletes'];
    return `<main id="main-content"><section class="wrap page-intro portfolio-intro"><h1>${text(c.headline)}</h1><p>${inline(c.intro)}</p></section>${featuredGalleries({headline:siteCopy.featured?.headline,allLink:siteCopy.home?.featuredLink})}<section class="wrap portfolio-section"><div class="gallery-filters" role="group" aria-label="${text(ui.portfolio?.filterLabel)}" hidden>${filterNames.map(key => `<button type="button" data-filter="${key}" aria-pressed="${key === 'all'}">${text(c.filterLabels?.[key])}</button>`).join('')}</div><p id="filter-announcement" class="sr-only" aria-live="polite"></p><p data-portfolio-empty${portfolioOrder.length ? ' hidden' : ''}>${text(ui.portfolio?.emptyMessage)}</p><div id="portfolio-images"><div class="portfolio-grid${portfolioOrder.length < 3 ? ' small-collection' : ''}">${portfolioOrder.map(key => photo(key, '', true)).join('')}</div></div></section>${invitation(c)}</main>`;
  }
  function pageHero(photoKey, {eyebrow = '', headline = '', intro = '', cta = '', className = ''} = {}) {
    return `<section class="page-hero ${esc(className)}"><div class="page-hero-photo">${photo(photoKey, 'page-hero-image', false, true, {portrait: true})}</div><div class="hero-shade" aria-hidden="true"></div><div class="page-hero-caption"><div class="page-hero-inner">${eyebrow ? `<p class="location-label">${text(eyebrow)}</p>` : ''}<h1>${text(headline)}</h1>${intro ? `<p class="hero-lede">${inline(intro)}</p>` : ''}${cta ? `<div class="hero-actions">${cta}</div>` : ''}</div></div></section>`;
  }
  function families() {
    const c = siteCopy.families || {};
    return `<main id="main-content">${pageHero(placed('familiesHero'), {eyebrow: c.eyebrow, headline: c.headline, intro: c.intro, cta: button(c.heroLink), className: 'page-hero-families'})}${serviceNav()}
    ${sessionDetails(c)}<section class="wrap service-gallery">${gallery([...new Set(['familiesGalleryOne', 'familiesGalleryTwo', 'familiesGalleryThree', 'familiesGalleryFour', 'familiesGalleryFive', 'familiesGallerySix'].map(placed).filter(Boolean))], 'family-grid')}</section>
    <section class="paper-section"><div class="wrap conversation-layout"><div class="reading">${copySection(c.sections?.[1])}<p>${inline(c.familyPriceCopy)}</p>${textLink(c.familyLink)}</div>${quote(6)}</div></section>
    <section class="wrap service-pair"><div>${photo(placed('familiesIndividual'), 'landscape-photo', true)}${copySection(c.sections?.[0])}<p>${inline(c.individualPriceCopy)}</p>${textLink(c.individualLink)}</div><div>${photo(placed('familiesGroup'), 'landscape-photo', true)}${copySection(c.sections?.[2])}${textLink(c.pricingLink)}</div></section>
    ${serviceEnd(c,'families',[placed('familiesHero'),...['familiesGalleryOne','familiesGalleryTwo','familiesGalleryThree','familiesGalleryFour','familiesGalleryFive','familiesGallerySix','familiesIndividual','familiesGroup'].map(placed)])}</main>`;
  }
  function seniors() {
    const c = siteCopy.seniors || {};
    return `<main id="main-content">${pageHero(placed('seniorsHero'), {eyebrow: c.eyebrow, headline: c.headline, intro: c.intro, cta: button(c.heroLink), className: 'page-hero-seniors'})}${serviceNav()}
    ${sessionDetails(c)}<section class="wrap senior-details"><div class="reading"><div class="prose-section">${copySection(c.sections?.[0])}</div><div class="prose-section">${copySection(c.sections?.[1])}</div></div><aside class="session-note">${copySection(c.sections?.[2])}<p class="session-starting-price">${inline(c.priceCopy)}</p><p>${inline(c.quoteExplanation)}</p>${textLink(c.inquiryLink)}</aside></section>
    <section class="paper-section"><div class="wrap sport-link">${photo(placed('seniorsSport'), '', false)}<div><h2>${text(shared.sportHeadline)}</h2><p>${inline(shared.sportCopy)}</p>${textLink({label: shared.sportLinkLabel, href: shared.sportLinkHref, newTab: shared.sportLinkNewTab})}</div></div></section>
    ${serviceEnd(c,'seniors',[placed('seniorsHero'),placed('seniorsSport')])}</main>`;
  }
  function athletes() {
    const c = siteCopy.athletes || {};
    return `<main id="main-content">${pageHero(placed('athletesHero'), {eyebrow: c.eyebrow, headline: c.headline, intro: c.intro, cta: button(c.heroLink), className: 'page-hero-athletes'})}${serviceNav()}<section class="wrap athlete-layout">${photo(placed('athletesPortrait'), 'athlete-photo', true)}<div class="reading">${copySection(c.sections?.[0])}<p>${inline(c.priceCopy)}</p>${textLink(c.heroLink)}</div></section>
    ${sessionDetails(c)}<section class="wrap athlete-team"><figure class="athlete-team-photo">${photo(placed('athletesTeam'), '', true)}${shared.athletePhotoCaption ? `<figcaption>${inline(shared.athletePhotoCaption)}</figcaption>` : ''}</figure><div class="reading">${copySection(c.sections?.[1])}${textLink(c.teamLink)}</div></section>
    <section class="paper-section"><div class="wrap other-sessions">${c.sections?.[2]?.headline ? `<h2>${text(c.sections[2].headline)}</h2>` : ''}<div>${paragraphs(c.sections?.[2]?.paragraphs)}<p>${inline(shared.naturalLightNote)}</p></div></div></section>
    ${serviceEnd(c,'athletes',[placed('athletesHero'),placed('athletesPortrait'),placed('athletesTeam')])}</main>`;
  }
  function investment() {
    const c = siteCopy.pricing || {};
    return `<main id="main-content"><section class="wrap page-intro pricing-intro"><h1>${text(c.headline)}</h1>${paragraphs(c.intro)}</section><section class="wrap session-rows">${records(c.sessions).map(s => `<article class="session-row">${photo(s.photo)}<div><div class="session-title"><h2>${text(s.name)}</h2><p>${Object.hasOwn(startingPrices, s.priceKey) ? esc(interpolate(c.priceTemplate, {price: startingPrices[s.priceKey]})) : text(c.customPriceLabel)}</p></div><p>${inline(s.text)}</p>${inclusions(s)}${s.note ? `<p class="session-explanation">${inline(s.note)}</p>` : ''}${textLink({label: s.linkLabel, href: s.linkHref ?? `/contact?session=${encodeURIComponent(s.type || '')}`, newTab: s.linkNewTab})}</div></article>`).join('')}</section>
    <section class="paper-section"><div class="wrap other-sessions"><h2>${text(c.teamHeadline)}</h2><div>${paragraphs(c.teamParagraphs)}${textLink(c.teamLink)}</div></div></section>
    <section class="wrap questions-section"><div class="questions-intro"><h2>${text(c.faqHeadline)}</h2><p>${inline(c.faqIntro)}</p></div><div class="questions">${records(c.questions).map(({question, answer}) => `<details><summary>${text(question)}</summary><p>${inline(answer)}</p></details>`).join('')}</div></section>${invitation(c)}</main>`;
  }
  function about() {
    const c = siteCopy.about || {};
    return `<main id="main-content"><section class="wrap about-opening"><div><p class="location-label">${text(c.eyebrow)}</p><h1>${text(c.headline)}</h1><p class="about-intro">${inline(c.intro)}</p></div>${photo('walt', '', false, true)}</section><section class="wrap about-body"><div class="about-sidebar"><p>${inline(c.location)}</p><p>${inline(c.sidebar)}</p>${textLink(c.portfolioLink)}</div><div class="reading">${paragraphs(c.paragraphs)}<p class="signature">${text(c.signature)}</p></div></section><section class="wrap about-note">${quote(1)}</section>${invitation(c)}</main>`;
  }
  function reviews() {
    const c = siteCopy.reviews || {};
    return `<main id="main-content">${pageHero(placed('reviewsHero'), {eyebrow: c.eyebrow, headline: c.headline, intro: c.intro, className: 'page-hero-reviews'})}<section class="wrap reviews-featured reviews-featured-centered">${quote(0, 'featured-quote')}</section><section class="wrap review-grid" aria-label="${text(accessibility.reviewListLabel)}">${clientNotes.slice(1).map((_, i) => quote(i + 1)).join('')}</section>${invitation(c)}</main>`;
  }
  function contact() {
    const c = siteCopy.contact || {};
    const params = query instanceof URLSearchParams ? query : new URLSearchParams(query);
    const requestedValue = params.get('session');
    const aliases = {'Senior portraits': 'Senior or graduate portraits', 'Athlete portraits': 'Individual athlete portraits', 'Family Essentials': 'Family portraits', 'Signature Family': 'Family portraits'};
    const requested = Object.hasOwn(aliases, requestedValue) ? aliases[requestedValue] : requestedValue;
    const selected = serviceNames.includes(requested) ? requested : '';
    return `<main id="main-content"><section class="wrap contact-layout"><div class="contact-copy"><p class="location-label">${text(c.eyebrow)}</p><h1>${text(c.headline)}</h1>${paragraphs(c.paragraphs)}<div class="contact-walt">${photo('walt')}<div><p>${text(c.personName)}</p>${link(c.emailLink)}<span>${text(c.location)}</span></div></div>${socialIcons('contact-social-links')}<p class="contact-price">${inline(c.priceCopy)} ${link(c.pricingLink)}</p><aside class="contact-next"><h2>${text(c.nextHeadline)}</h2><p>${inline(c.nextCopy)}</p>${c.responseTime?.trim() ? `<p class="response-time">${inline(c.responseTime)}</p>` : ''}</aside></div><div class="inquiry-form-wrap">${inquiryForm(selected)}</div></section><section class="wrap contact-review">${quote(1)}</section></main>`;
  }
  function clients() {
    const c = siteCopy.clients || {};
    return `<main id="main-content"><section class="wrap page-intro"><h1>${text(c.headline)}</h1><p>${inline(c.intro)}</p></section><section class="wrap gallery-access"><div class="reading"><h2>${text(c.helpHeadline)}</h2><p>${inline(c.helpCopy)} ${inline(c.privacyNote)}</p>${link({label: c.emailLabel, href: c.emailHref, newTab: c.emailNewTab}, 'button')}</div></section></main>`;
  }

  const pages = {home, portfolio, families, seniors, athletes, investment, experience, featured, about, reviews, contact, clients};
  const meta = siteCopy.meta?.[routeKey] || siteCopy.meta?.home || {};
  return {
    body: header() + (featuredSession ? featuredDetail() : pages[routeKey]()) + footer(),
    clientData: {route: routeKey, photos, ui},
    coverKey: featuredSession?.coverKey,
    title: featuredSession ? `${featuredSession.title} | ${siteSettings.brandName}` : String(meta.title || siteSettings.brandName || ''),
    description: featuredSession?.description || String(meta.description || '')
  };
}
