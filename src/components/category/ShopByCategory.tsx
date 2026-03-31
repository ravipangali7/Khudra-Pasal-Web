import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface ShopByCategoryProps {
  onCategoryClick?: (category: string) => void;
}

const ShopByCategory = ({ onCategoryClick }: ShopByCategoryProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });
  const displayCategories = data || [];

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="section-title">Top categories</h2>
        <p className="text-xs text-muted-foreground hidden md:block">Tap any category to browse</p>
      </div>

      <div className="flex md:grid md:grid-cols-5 lg:grid-cols-9 gap-3 md:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 animate-pulse h-28 flex-shrink-0 w-[4.5rem] sm:w-24 md:w-full"
            />
          ))}
        {!isLoading &&
          displayCategories.map((category) => (
          <button
            key={category.slug}
            onClick={() => onCategoryClick?.(category.slug)}
            className={`theme-${resolveThemeClass(category.slug)} flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-transparent hover:border-primary/30 hover:shadow-lg transition-all group cursor-pointer active:scale-[0.96] flex-shrink-0 w-[4.5rem] sm:w-auto md:w-full`}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-primary/30 transition-all flex items-center justify-center text-2xl md:text-3xl">
              {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                loading="lazy"
              />
              ) : (
                <span aria-hidden>{category.icon?.trim() || '📦'}</span>
              )}
            </div>
            <span className="text-xs md:text-sm font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors">
              {category.name}
            </span>
          </button>
        ))}
        {!isLoading && displayCategories.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-6">No categories yet.</p>
        )}
      </div>
    </section>
  );
};

export default ShopByCategory;
