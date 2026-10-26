const LOCAL_ORIGIN = 'https://content.invalid';
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\\]/u;
const ENCODED_UNSAFE_CHARACTERS = /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i;
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);

/** Escape ordinary text or a quoted HTML attribute. Never interpret HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Return a safe, normalized link destination, or an empty string if invalid.
 * Local links must start with / or #. This does not validate that a page exists.
 * Encoded ASCII controls and backslashes are rejected as well as literal ones.
 */
export function safeHref(value) {
  if (typeof value !== 'string' || UNSAFE_CHARACTERS.test(value) || ENCODED_UNSAFE_CHARACTERS.test(value)) return '';
  const raw = value.trim();
  if (!raw || raw.startsWith('//')) return '';
  try {
    if (raw.startsWith('/') || raw.startsWith('#')) {
      const url = new URL(raw, `${LOCAL_ORIGIN}/`);
      if (url.origin !== LOCAL_ORIGIN || url.username || url.password) return '';
      return raw.startsWith('#') ? (url.hash || '#') : `${url.pathname}${url.search}${url.hash}`;
    }
    const url = new URL(raw);
    if (!ALLOWED_PROTOCOLS.has(url.protocol) || url.username || url.password) return '';
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.hostname ? url.href : '';
    // Email and telephone links are opaque URIs, not authority-based URLs.
    if (url.host || /^\w+:\/\//.test(raw) || !url.pathname) return '';
    return url.href;
  } catch {
    return '';
  }
}

/** Replace only supplied, own {token} keys with scalar plain text, once. */
export function interpolate(template, tokens = {}) {
  const values = tokens && typeof tokens === 'object' ? tokens : {};
  return String(template ?? '').replace(/\{([^{}]+)\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) return match;
    const value = values[key];
    if (value == null) return '';
    return ['string', 'number', 'boolean', 'bigint'].includes(typeof value) ? String(value) : match;
  });
}

function escapedAt(text, index) {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

/**
 * Render plain text with optional [label](href) links. This is not a full
 * Markdown renderer: images, HTML, nested labels, titles, and formatting are
 * not interpreted. Unsafe destinations become plain label text.
 * Tokens cannot introduce markup, but may fill an explicitly written link's
 * destination; that completed destination is always checked by safeHref.
 */
export function renderInline(text, tokens = {}) {
  const source = String(text ?? '');
  const output = [];
  const plain = (value) => escapeHtml(interpolate(value, tokens));
  let literalStart = 0;
  let scan = 0;
  while (scan < source.length) {
    if (source[scan] !== '[' || source[scan - 1] === '!' || escapedAt(source, scan)) {
      scan += 1;
      continue;
    }
    let close = scan + 1;
    while (close < source.length && (source[close] !== ']' || escapedAt(source, close))) {
      if (source[close] === '[' && !escapedAt(source, close)) break;
      close += 1;
    }
    if (source[close] === '[') {
      scan = close;
      continue;
    }
    if (source[close] !== ']' || source[close + 1] !== '(') {
      scan = close + 1;
      continue;
    }
    let end = close + 2;
    let depth = 1;
    while (end < source.length && depth) {
      if (source[end] === '(') depth += 1;
      if (source[end] === ')') depth -= 1;
      if (depth) end += 1;
    }
    if (depth) break;
    const label = source.slice(scan + 1, close);
    if (!label.trim()) {
      scan = end + 1;
      continue;
    }
    const href = safeHref(interpolate(source.slice(close + 2, end), tokens));
    output.push(plain(source.slice(literalStart, scan)));
    output.push(href ? `<a href="${escapeHtml(href)}">${plain(label)}</a>` : plain(label));
    literalStart = end + 1;
    scan = literalStart;
  }
  output.push(plain(source.slice(literalStart)));
  return output.join('');
}
