import { applyMetaTags, type MetaInput } from '@/lib/seo/metaTags';

type MetaLayer = MetaInput | null;

let routeLayer: MetaLayer = null;
let pageLayer: MetaLayer = null;

function mergeMeta(route: MetaLayer, page: MetaLayer): MetaInput {
  const base = { ...(route || {}) };
  const over = page || {};
  return {
    ...base,
    ...over,
    ogType: over.ogType ?? base.ogType,
    robots: over.robots ?? base.robots,
    ogImage: over.ogImage ?? base.ogImage,
    ogTitle: over.ogTitle ?? base.ogTitle,
    ogDescription: over.ogDescription ?? base.ogDescription,
    twitterImage: over.twitterImage ?? base.twitterImage,
    jsonLd: over.jsonLd ?? base.jsonLd,
  };
}

export function setRouteSeoMeta(meta: MetaInput) {
  routeLayer = meta;
  applyMetaTags(mergeMeta(routeLayer, pageLayer));
}

export function setPageSeoMeta(meta: MetaInput | null) {
  pageLayer = meta;
  applyMetaTags(mergeMeta(routeLayer, pageLayer));
}

export function clearPageSeoMeta() {
  pageLayer = null;
  applyMetaTags(mergeMeta(routeLayer, null));
}

/** Re-apply after site defaults load from API. */
export function refreshSeoFromLayers() {
  applyMetaTags(mergeMeta(routeLayer, pageLayer));
}
