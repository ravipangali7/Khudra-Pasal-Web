import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { websiteApi } from '@/lib/api';
import { configureSiteSeo } from '@/lib/seo/metaTags';
import { refreshSeoFromLayers } from '@/lib/seo/seoManager';

const CACHE_MS = 2 * 60 * 1000;

/** Loads site SEO defaults once per session (~2 min cache). */
export default function SiteSeoBootstrap() {
  const { data } = useQuery({
    queryKey: ['seo', 'settings-public'],
    queryFn: () => websiteApi.settingsPublic(),
    staleTime: CACHE_MS,
    gcTime: CACHE_MS * 2,
  });

  useEffect(() => {
    if (!data) return;
    configureSiteSeo({
      siteName: data.siteName,
      siteMetaDescription: data.siteMetaDescription,
      defaultOgImage: data.coverImage || data.siteLogo,
      siteFavicon: data.siteFavicon || data.siteLogo,
    });
    refreshSeoFromLayers();
  }, [data]);

  return null;
}
