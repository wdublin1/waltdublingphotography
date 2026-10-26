export const pageRoutes = Object.freeze(['home', 'portfolio', 'families', 'seniors', 'athletes', 'investment', 'experience', 'featured', 'about', 'reviews', 'contact', 'clients']);

export const validGallerySlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;

export function featuredSessionForRoute(route, content) {
  if (typeof route !== 'string' || !route.startsWith('featured/')) return null;
  const slug = route.slice('featured/'.length);
  if (!validGallerySlug(slug)) return null;
  return (content?.featuredSessions || []).find(item => item.enabled === true && item.slug === slug && item.photoKeys?.length) || null;
}

export function isPageRoute(route, content) {
  return pageRoutes.includes(route) || Boolean(featuredSessionForRoute(route, content));
}

export function sitemapRoutes(content) {
  return [...pageRoutes.filter(route => route !== 'clients'), ...(content?.featuredSessions || [])
    .filter(item => item.enabled === true && validGallerySlug(item.slug) && item.photoKeys?.length)
    .map(item => `featured/${item.slug}`)];
}
