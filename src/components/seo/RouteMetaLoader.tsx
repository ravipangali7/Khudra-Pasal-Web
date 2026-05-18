import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildCanonicalUrl } from '@/lib/seo/metaTags';
import { getRouteMeta } from '@/lib/seo/routeMeta';
import { clearPageSeoMeta, setRouteSeoMeta } from '@/lib/seo/seoManager';

/** Applies default route SEO on every navigation (layer 1). */
export default function RouteMetaLoader() {
  const { pathname } = useLocation();

  useEffect(() => {
    clearPageSeoMeta();
    const routeMeta = getRouteMeta(pathname);
    setRouteSeoMeta({
      ...routeMeta,
      canonicalUrl: buildCanonicalUrl(pathname),
      ogUrl: buildCanonicalUrl(pathname),
    });
  }, [pathname]);

  return null;
}
