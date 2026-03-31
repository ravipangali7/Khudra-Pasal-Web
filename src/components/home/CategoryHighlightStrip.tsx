import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { storefrontRoutes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const CARD_STYLES = [
  'bg-emerald-100/90 text-emerald-900 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/60',
  'bg-white border-border shadow-sm text-foreground',
  'bg-sky-50/95 text-sky-950 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-100 dark:border-sky-800/50',
  'bg-rose-100/90 text-rose-900 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800/60',
];

const HIGHLIGHT_COUNT = 4;

/**
 * Large pastel category shortcuts under the hero (first N root categories from API).
 */
const CategoryHighlightStrip = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });

  const slice = (categories ?? []).slice(0, HIGHLIGHT_COUNT);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: HIGHLIGHT_COUNT }).map((_, i) => (
          <div key={i} className="h-24 md:h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slice.length) return null;

  return (
    <section aria-label="Featured categories">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slice.map((cat, i) => (
          <Link
            key={cat.slug}
            to={storefrontRoutes.category(cat.slug)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-4 min-h-[5.5rem] md:min-h-[6.5rem] transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99]',
              CARD_STYLES[i % CARD_STYLES.length],
            )}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center text-2xl md:text-3xl shrink-0 overflow-hidden">
              {cat.image_url ? (
                <img src={cat.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span aria-hidden>{cat.icon?.trim() || '📦'}</span>
              )}
            </div>
            <span className="font-semibold text-sm md:text-base leading-tight line-clamp-2">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryHighlightStrip;
