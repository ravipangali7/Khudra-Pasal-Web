export type MetaInput = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  robots?: string;
  ogType?: 'website' | 'article' | 'product' | 'profile';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

type SiteSeoDefaults = {
  siteName: string;
  siteMetaDescription: string;
  defaultOgImage: string;
  siteFavicon: string;
};

const MANAGED = 'data-kp-seo-managed';
const JSON_LD_ID = 'kp-seo-jsonld';

let siteDefaults: SiteSeoDefaults = {
  siteName: 'Khudra Pasal',
  siteMetaDescription:
    "Shop online at Khudra Pasal - Nepal's trusted multivendor marketplace. Fresh groceries, electronics, fashion, beauty & more delivered to your doorstep.",
  defaultOgImage: '',
  siteFavicon: '',
};

export function configureSiteSeo(config: Partial<SiteSeoDefaults>) {
  siteDefaults = { ...siteDefaults, ...config };
}

export function getSiteSeoDefaults(): Readonly<SiteSeoDefaults> {
  return siteDefaults;
}

export function getSiteOrigin(): string {
  const env = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function buildCanonicalUrl(path: string): string {
  const base = getSiteOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  const t = (pathOrUrl || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  const base = getSiteOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return t.startsWith('/') ? t : `/${t}`;
  return new URL(t.startsWith('/') ? t : `/${t}`, base).toString();
}

function truncateMeta(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function withSuffix(title: string): string {
  const brand = siteDefaults.siteName.trim();
  const t = title.trim();
  if (!t) return brand ? `${brand} | Nepal's Multivendor eCommerce` : '';
  if (!brand || t.toLowerCase().includes(brand.toLowerCase())) return t;
  return `${t} | ${brand}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"][${MANAGED}]`,
  );
  if (!el) {
    el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(MANAGED, '1');
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][${MANAGED}]`);
  if (!el) {
    el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute(MANAGED, '1');
  el.setAttribute('href', href);
}

function applyFaviconHref(href: string) {
  if (!href) return;
  upsertLink('icon', href);
}

function removeManagedJsonLd() {
  const existing = document.getElementById(JSON_LD_ID);
  if (existing) existing.remove();
}

function applyJsonLd(blocks: Array<Record<string, unknown>>) {
  removeManagedJsonLd();
  if (!blocks.length) return;
  const payload =
    blocks.length === 1
      ? blocks[0]
      : { '@context': 'https://schema.org', '@graph': blocks };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = JSON_LD_ID;
  script.setAttribute(MANAGED, '1');
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

export function applyMetaTags(input: MetaInput = {}) {
  if (typeof document === 'undefined') return;

  const title = withSuffix(input.title || '');
  const description = truncateMeta(
    input.description?.trim() || siteDefaults.siteMetaDescription,
  );
  const robots = input.robots || 'index,follow';
  const ogType = input.ogType || 'website';
  const ogTitle = input.ogTitle?.trim() || title;
  const ogDescription = input.ogDescription?.trim() || description;
  const canonical = input.canonicalUrl
    ? toAbsoluteUrl(input.canonicalUrl)
    : buildCanonicalUrl(typeof window !== 'undefined' ? window.location.pathname : '/');
  const ogUrl = input.ogUrl ? toAbsoluteUrl(input.ogUrl) : canonical;
  const rawOg = input.ogImage?.trim() || siteDefaults.defaultOgImage || '';
  let ogImage = toAbsoluteUrl(rawOg);
  if (/placeholder/i.test(ogImage)) ogImage = '';
  if (ogImage.startsWith('http://')) {
    ogImage = `https://${ogImage.slice(7)}`;
  }
  const twitterCard =
    input.twitterCard || (ogImage ? 'summary_large_image' : 'summary');
  const twitterTitle = input.twitterTitle?.trim() || ogTitle;
  const twitterDescription = input.twitterDescription?.trim() || ogDescription;
  const twitterImage = toAbsoluteUrl(input.twitterImage?.trim() || ogImage);

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertLink('canonical', canonical);

  upsertMeta('property', 'og:title', ogTitle);
  upsertMeta('property', 'og:description', ogDescription);
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('property', 'og:url', ogUrl);
  if (ogImage) {
    upsertMeta('property', 'og:image', ogImage);
    if (ogImage.startsWith('https://')) {
      upsertMeta('property', 'og:image:secure_url', ogImage);
    }
  }

  upsertMeta('name', 'twitter:card', twitterCard);
  upsertMeta('name', 'twitter:title', twitterTitle);
  upsertMeta('name', 'twitter:description', twitterDescription);
  if (twitterImage) upsertMeta('name', 'twitter:image', twitterImage);

  applyFaviconHref(siteDefaults.siteFavicon);

  const blocks = input.jsonLd
    ? Array.isArray(input.jsonLd)
      ? input.jsonLd
      : [input.jsonLd]
    : [];
  applyJsonLd(blocks.map((b) => normalizeJsonLdUrls(b)));
}

function normalizeJsonLdUrls(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'item' || k === 'url' || k === 'mainEntityOfPage' || k === '@id') {
      out[k] = typeof v === 'string' ? toAbsoluteUrl(v) : v;
    } else if (Array.isArray(v)) {
      out[k] = v.map((x) =>
        typeof x === 'object' && x !== null && !Array.isArray(x)
          ? normalizeJsonLdUrls(x as Record<string, unknown>)
          : typeof x === 'string' && (k === 'itemListElement' || k === 'image')
            ? x
            : x,
      );
    } else if (typeof v === 'object' && v !== null) {
      out[k] = normalizeJsonLdUrls(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncateMetaDescription(text: string, max = 160): string {
  return truncateMeta(text, max);
}
