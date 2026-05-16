const DEFAULT_SITE_NAME = 'Khudra Pasal';
const DEFAULT_DESCRIPTION =
  "Shop online at Khudra Pasal - Nepal's trusted multivendor marketplace. Fresh groceries, electronics, fashion, beauty & more delivered to your doorstep.";

export function getSiteOrigin(): string {
  const env = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function buildCanonical(path: string): string {
  const base = getSiteOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function truncateMeta(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolvePageTitle(title?: string, siteName = DEFAULT_SITE_NAME): string {
  const t = title?.trim();
  if (!t) return `${siteName} | Nepal's Multivendor eCommerce`;
  if (t.toLowerCase().includes(siteName.toLowerCase())) return t;
  return `${t} | ${siteName}`;
}

export function resolveMetaDescription(
  description?: string,
  fallback = DEFAULT_DESCRIPTION,
): string {
  const d = description?.trim();
  return truncateMeta(d || fallback);
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
          url: input.url,
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
    description: truncateMeta(input.description, 5000),
    image: input.image ? [input.image] : undefined,
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
    description: truncateMeta(input.description),
    image: input.image || undefined,
    mainEntityOfPage: input.url,
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
    description: truncateMeta(input.description),
    url: input.url,
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
    url: input.url,
    logo: input.logo || undefined,
    description: input.description ? truncateMeta(input.description) : undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
