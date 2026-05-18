import { useEffect } from 'react';
import { applyMetaTags, type MetaInput } from '@/lib/seo/metaTags';

export type PageMetaConfig = MetaInput & {
  /** @deprecated Use metaKeywords only for internal tooling; not emitted to head. */
  keywords?: string;
};

/** Page-level SEO overrides (entity detail, listings with facets). */
export function usePageMeta(meta: PageMetaConfig | null | undefined) {
  useEffect(() => {
    if (!meta) return;
    const { keywords: _ignored, ...rest } = meta;
    applyMetaTags(rest);
  }, [meta == null ? '' : JSON.stringify(meta)]);
}
