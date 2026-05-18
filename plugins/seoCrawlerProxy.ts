/**
 * Dev server: when a social crawler requests /product/:slug (etc.), proxy to the
 * Django share HTML endpoint so link previews work on the same URL users share.
 */
import type { Plugin } from 'vite';
import { isSocialCrawlerUa } from '../src/lib/seo/socialCrawlers';

function shareApiPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  const product = p.match(/^\/product\/([^/]+)$/);
  if (product) return `/api/website/products/${encodeURIComponent(product[1])}/share/`;
  const blog = p.match(/^\/blog\/([^/]+)$/);
  if (blog) return `/api/website/blog-posts/${encodeURIComponent(blog[1])}/share/`;
  const page = p.match(/^\/page\/([^/]+)$/);
  if (page) return `/api/website/cms-pages/${encodeURIComponent(page[1])}/share/`;
  const category = p.match(/^\/category\/([^/]+)$/);
  if (category) return `/api/website/categories/${encodeURIComponent(category[1])}/share/`;
  const brand = p.match(/^\/brands\/(\d+)$/);
  if (brand) return `/api/website/brands/${brand[1]}/share/`;
  const store = p.match(/^\/store\/([^/]+)$/);
  if (store) return `/api/website/stores/${encodeURIComponent(store[1])}/share/`;
  return null;
}

export function seoCrawlerProxyPlugin(): Plugin {
  const apiOrigin = (
    process.env.VITE_API_ORIGIN ||
    process.env.VITE_API_BASE?.replace(/\/api\/?$/, '') ||
    'https://khudrapasalserver.360winx.com'
  ).replace(/\/$/, '');

  return {
    name: 'khudra-seo-crawler-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ua = String(req.headers['user-agent'] || '');
        if (!isSocialCrawlerUa(ua)) return next();

        const rawUrl = req.url || '/';
        const pathname = rawUrl.split('?')[0] || '/';
        const apiPath = shareApiPath(pathname);
        if (!apiPath) return next();

        const target = `${apiOrigin}${apiPath}`;
        fetch(target, {
          headers: {
            'user-agent': ua,
            accept: 'text/html',
          },
        })
          .then(async (upstream) => {
            const body = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.end(body);
          })
          .catch((err) => {
            console.error('[seo-crawler-proxy]', target, err);
            next(err);
          });
      });
    },
  };
}
