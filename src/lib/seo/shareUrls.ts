import { API_BASE } from '@/lib/api';

function apiOrigin(): string {
  const base = (API_BASE || '/api').trim();
  if (base.startsWith('http')) return base.replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return '';
}

/** Social crawlers: API share landing with full OG tags. */
export function buildProductShareUrl(slug: string): string {
  const origin = apiOrigin();
  return `${origin}/api/website/products/${encodeURIComponent(slug)}/share/`;
}

export function buildBlogShareUrl(slug: string): string {
  const origin = apiOrigin();
  return `${origin}/api/website/blog-posts/${encodeURIComponent(slug)}/share/`;
}

export function buildCmsShareUrl(slug: string): string {
  const origin = apiOrigin();
  return `${origin}/api/website/cms-pages/${encodeURIComponent(slug)}/share/`;
}
