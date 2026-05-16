import { useEffect } from 'react';
import { buildCanonical, resolveMetaDescription, resolvePageTitle } from '@/lib/seoUtils';

export type PageSeoConfig = {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  siteName?: string;
};

function upsertMeta(
  selector: 'name' | 'property',
  key: string,
  content: string,
) {
  if (!content) return;
  const attr = selector === 'name' ? 'name' : 'property';
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeJsonLdScripts() {
  document.head
    .querySelectorAll('script[data-kp-seo-jsonld]')
    .forEach((n) => n.remove());
}

export function usePageSeo({
  title,
  description,
  keywords,
  image,
  canonical,
  noindex,
  ogType = 'website',
  jsonLd,
  siteName,
}: PageSeoConfig) {
  useEffect(() => {
    const resolvedTitle = resolvePageTitle(title, siteName);
    const resolvedDesc = resolveMetaDescription(description);
    const prevTitle = document.title;
    document.title = resolvedTitle;

    upsertMeta('name', 'description', resolvedDesc);
    if (keywords?.trim()) upsertMeta('name', 'keywords', keywords.trim());

    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', resolvedDesc);
    upsertMeta('property', 'og:type', ogType);
    if (image) upsertMeta('property', 'og:image', image);
    if (canonical) {
      upsertMeta('property', 'og:url', canonical);
      upsertLink('canonical', canonical);
    }

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', resolvedDesc);
    if (image) upsertMeta('name', 'twitter:image', image);

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (robots?.getAttribute('content')?.includes('noindex')) {
        robots.remove();
      }
    }

    removeJsonLdScripts();
    const blocks = jsonLd
      ? Array.isArray(jsonLd)
        ? jsonLd
        : [jsonLd]
      : [];
    for (const block of blocks) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-kp-seo-jsonld', '1');
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    }

    return () => {
      document.title = prevTitle;
      removeJsonLdScripts();
    };
  }, [
    title,
    description,
    keywords,
    image,
    canonical,
    noindex,
    ogType,
    jsonLd == null ? '' : JSON.stringify(jsonLd),
    siteName,
  ]);
}

export function useDefaultCanonical(pathname: string) {
  return buildCanonical(pathname);
}
