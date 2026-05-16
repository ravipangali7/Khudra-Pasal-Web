import { usePageSeo, type PageSeoConfig } from '@/hooks/usePageSeo';

export function PageSeo(props: PageSeoConfig) {
  usePageSeo(props);
  return null;
}
