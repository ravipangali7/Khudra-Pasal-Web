import type { WebsiteCategory } from '@/lib/api';

export function findCategoryBySlug(
  categories: WebsiteCategory[] | undefined,
  slug: string,
): WebsiteCategory | undefined {
  if (!categories || !slug || slug === 'all') return undefined;
  const stack = [...categories];
  while (stack.length > 0) {
    const row = stack.pop();
    if (!row) continue;
    if (row.slug === slug) return row;
    if (row.children?.length) stack.push(...row.children);
  }
  return undefined;
}
