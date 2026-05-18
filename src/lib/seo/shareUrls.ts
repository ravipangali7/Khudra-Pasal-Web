import { getApiOrigin } from '@/lib/api';

/** API host for crawler share landings (must reach Django, not the SPA static host). */
export function getShareApiOrigin(): string {
  const fromEnv = getApiOrigin();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return '';
}

export function buildProductShareUrl(slug: string): string {
  const slugEnc = encodeURIComponent(slug.trim());
  return `${getShareApiOrigin()}/api/website/products/${slugEnc}/share/`;
}

export function buildBlogShareUrl(slug: string): string {
  return `${getShareApiOrigin()}/api/website/blog-posts/${encodeURIComponent(slug.trim())}/share/`;
}

export function buildCmsShareUrl(slug: string): string {
  return `${getShareApiOrigin()}/api/website/cms-pages/${encodeURIComponent(slug.trim())}/share/`;
}

export function facebookShareUrl(targetUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`;
}

export function twitterShareUrl(targetUrl: string, text?: string): string {
  const q = new URLSearchParams({ url: targetUrl });
  if (text?.trim()) q.set('text', text.trim());
  return `https://twitter.com/intent/tweet?${q.toString()}`;
}

export function whatsAppShareUrl(targetUrl: string, text?: string): string {
  const body = text?.trim() ? `${text.trim()}\n${targetUrl}` : targetUrl;
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function linkedInShareUrl(targetUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetUrl)}`;
}
