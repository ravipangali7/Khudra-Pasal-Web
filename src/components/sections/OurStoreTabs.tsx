import { useState } from 'react';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';

type TabId = 'latest' | 'topRated' | 'bestSellers';

interface OurStoreTabsProps {
  latest: Product[];
  topRated: Product[];
  bestSellers: Product[];
  categoryTheme?: string;
}

const OurStoreTabs = ({ latest, topRated, bestSellers, categoryTheme = 'all' }: OurStoreTabsProps) => {
  const [tab, setTab] = useState<TabId>('latest');
  const theme = resolveThemeClass(categoryTheme);

  const rows = tab === 'latest' ? latest : tab === 'topRated' ? topRated : bestSellers;

  if (!latest.length && !topRated.length && !bestSellers.length) return null;

  const tabs: { id: TabId; label: string; items: Product[] }[] = [
    { id: 'latest', label: 'Latest', items: latest },
    { id: 'topRated', label: 'Top rated', items: topRated },
    { id: 'bestSellers', label: 'Best sellers', items: bestSellers },
  ];

  return (
    <section className={cn(`theme-${theme}`)} aria-labelledby="our-store-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="our-store-heading" className="section-title font-heading">
            Our store
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Hand-picked from the catalog</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Product sort">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              disabled={t.items.length === 0}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                tab === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products in this tab yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((product) => (
            <ProductCard key={`${tab}-${product.id}`} product={product} categoryTheme={categoryTheme} />
          ))}
        </div>
      )}
    </section>
  );
};

export default OurStoreTabs;
