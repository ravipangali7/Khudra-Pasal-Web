import type { WebsiteCategory } from '@/lib/api';

export function findCategoryDisplayName(categories: WebsiteCategory[] | undefined, slug: string): string {
  if (!categories?.length) return slug.replace(/-/g, ' ');
  for (const c of categories) {
    if (c.slug === slug) return c.name;
    for (const ch of c.children || []) {
      if (ch.slug === slug) return ch.name;
    }
  }
  return slug.replace(/-/g, ' ');
}
