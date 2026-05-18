/**
 * SEO helpers — JSON-LD builders and re-exports from the meta pipeline.
 * @see lib/seo/metaTags.ts
 */
export {
  buildCanonicalUrl as buildCanonical,
  getSiteOrigin,
  stripHtml,
  toAbsoluteUrl,
  truncateMetaDescription as truncateMeta,
} from '@/lib/seo/metaTags';

import { buildCanonicalUrl, toAbsoluteUrl, truncateMetaDescription } from '@/lib/seo/metaTags';
import { getSiteSeoDefaults } from '@/lib/seo/metaTags';

export function resolvePageTitle(title?: string, siteName?: string): string {
  const brand = siteName?.trim() || getSiteSeoDefaults().siteName;
  const t = title?.trim();
  if (!t) return brand ? `${brand} | Nepal's Multivendor eCommerce` : '';
  if (t.toLowerCase().includes(brand.toLowerCase())) return t;
  return `${t} | ${brand}`;
}

export function resolveMetaDescription(
  description?: string,
  fallback?: string,
): string {
  return truncateMetaDescription(
    description,
    fallback || getSiteSeoDefaults().siteMetaDescription,
  );
}

export function productJsonLd(input: {
  name: string;
  description: string;
  image: string;
  url: string;
  price: string;
  currency?: string;
  sku?: string;
  rating?: string;
  reviewCount?: number;
  brand?: string;
}) {
  const price = parseFloat(input.price);
  const offer =
    Number.isFinite(price) && price > 0
      ? {
          '@type': 'Offer',
          priceCurrency: input.currency || 'NPR',
          price: price.toFixed(2),
          availability: 'https://schema.org/InStock',
          url: toAbsoluteUrl(input.url),
        }
      : undefined;
  const aggregateRating =
    input.rating && input.reviewCount
      ? {
          '@type': 'AggregateRating',
          ratingValue: input.rating,
          reviewCount: input.reviewCount,
        }
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: truncateMetaDescription(input.description, 5000),
    image: input.image ? [toAbsoluteUrl(input.image)] : undefined,
    sku: input.sku || undefined,
    brand: input.brand ? { '@type': 'Brand', name: input.brand } : undefined,
    offers: offer,
    aggregateRating,
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  image: string;
  url: string;
  datePublished?: string;
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: truncateMetaDescription(input.description),
    image: input.image ? toAbsoluteUrl(input.image) : undefined,
    mainEntityOfPage: toAbsoluteUrl(input.url),
    datePublished: input.datePublished || undefined,
    author: input.authorName
      ? { '@type': 'Person', name: input.authorName }
      : undefined,
  };
}

export function webPageJsonLd(input: { name: string; description: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: truncateMetaDescription(input.description),
    url: toAbsoluteUrl(input.url),
  };
}

export function organizationJsonLd(input: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: toAbsoluteUrl(input.url),
    logo: input.logo ? toAbsoluteUrl(input.logo) : undefined,
    description: input.description ? truncateMetaDescription(input.description) : undefined,
  };
}

export function webSiteJsonLd(input: { name: string; url: string; searchUrl?: string }) {
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: toAbsoluteUrl(input.url),
  };
  if (input.searchUrl) {
    node.potentialAction = {
      '@type': 'SearchAction',
      target: `${toAbsoluteUrl(input.searchUrl)}{search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }
  return node;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: toAbsoluteUrl(item.url),
    })),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: truncateMetaDescription(input.description),
    url: toAbsoluteUrl(input.url),
  };
}

/** @deprecated Use buildCanonicalUrl from metaTags */
export const buildCanonicalLegacy = buildCanonicalUrl;
