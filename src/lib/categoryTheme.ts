/** Slugs that have dedicated CSS in `index.css` (`.theme-*`). */
const KNOWN_THEME_SLUGS = new Set([
  'all',
  'cafe',
  'home',
  'toys',
  'fresh',
  'electronics',
  'mobiles',
  'beauty',
  'fashion',
]);

/**
 * Map arbitrary category slugs (from admin) to a safe `theme-*` class name.
 * Unknown slugs use `default` (`.theme-default` in CSS).
 */
export function resolveThemeClass(slug: string): string {
  const s = (slug || 'all').trim() || 'all';
  if (KNOWN_THEME_SLUGS.has(s)) return s;
  return 'default';
}
