import { useLayoutEffect } from 'react';
import type { MetaInput } from '@/lib/seo/metaTags';
import { clearPageSeoMeta, setPageSeoMeta } from '@/lib/seo/seoManager';

export type PageMetaConfig = MetaInput & {
  /** @deprecated Not emitted to document head. */
  keywords?: string;
};

/** Page-level SEO overrides (entity detail, listings with facets). Wins over route defaults. */
export function usePageMeta(meta: PageMetaConfig | null | undefined) {
  useLayoutEffect(() => {
    if (!meta) {
      clearPageSeoMeta();
      return;
    }
    const { keywords: _ignored, ...rest } = meta;
    setPageSeoMeta(rest);
    return () => clearPageSeoMeta();
  }, [meta == null ? '' : JSON.stringify(meta)]);
}
