import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyMetaTags, buildCanonicalUrl } from '@/lib/seo/metaTags';
import { getRouteMeta } from '@/lib/seo/routeMeta';

/** Applies default route SEO on every navigation (layer 1). */
export default function RouteMetaLoader() {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeMeta = getRouteMeta(pathname);
    applyMetaTags({
      ...routeMeta,
      canonicalUrl: buildCanonicalUrl(pathname),
      ogUrl: buildCanonicalUrl(pathname),
    });
  }, [pathname]);

  return null;
}
