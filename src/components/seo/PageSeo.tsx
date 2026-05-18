import { usePageMeta, type PageMetaConfig } from '@/hooks/usePageMeta';

/** Page-level SEO overrides (runs after RouteMetaLoader). */
export function PageSeo(props: PageMetaConfig) {
  usePageMeta(props);
  return null;
}
