import {getDefaultContent, loadContent} from '../lib/content.mjs';
import {renderPage} from '../lib/render.mjs';
import {documentHtml, systemDocumentHtml, SITE_ORIGIN, sitemapXml} from '../lib/html.mjs';
import {inquiryHandler} from '../lib/inquiry.mjs';
import {isPageRoute} from '../lib/routes.mjs';

export async function GET(request) { return handleRequest(request); }
export async function POST(request) { return handleRequest(request); }
export async function HEAD(request) {
  const response = await handleRequest(request);
  return new Response(null, {status: response.status, headers: response.headers});
}

export async function handleRequest(request) {
  const url = new URL(request.url);
  const route = url.searchParams.get('__route') || (url.pathname === '/' ? 'home' : url.pathname.replace(/^\//,'').replace(/\/$/,''));
  if (route === 'inquiry' || route === 'api/inquiry') {
    const content = await loadContent();
    return inquiryHandler(request, {messages: content.interfaceCopy.apiMessages, email: content.settings.email});
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const content = await loadContent();
    return new Response(systemDocumentHtml(405, content), {status:405, headers:{Allow:'GET, HEAD', 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow'}});
  }
  const indexable = (url.hostname === 'waltdublinphotography.com' || url.hostname === 'www.waltdublinphotography.com') && process.env.VERCEL_ENV === 'production';
  if (route === 'robots.txt') return new Response(indexable ? `User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /api\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'}});
  if (route === 'sitemap.xml') return new Response(sitemapXml(await loadContent()),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
  let content;
  try {
    content = await loadContent();
    if (!isPageRoute(route, content)) return new Response(systemDocumentHtml(404, content), {status:404, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow'}});
    const page = renderPage(route,content,url.searchParams);
    return new Response(documentHtml(page,{route,content,indexable}),{headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': route === 'contact' ? 'no-store' : 'public, s-maxage=30',
      ...(!indexable ? {'X-Robots-Tag':'noindex, nofollow'} : {})
    }});
  } catch (error) {
    console.error('page_render_failed', {route,kind:error.name,message:String(error.message).slice(0,160)});
    return new Response(systemDocumentHtml(503, content || getDefaultContent()),{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'30','X-Robots-Tag':'noindex, nofollow'}});
  }
}
