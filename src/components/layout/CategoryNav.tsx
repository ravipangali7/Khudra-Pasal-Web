import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { STOREFRONT_CATEGORY_NAV_STICKY_TOP } from '@/components/layout/Header';
import { storefrontRoutes } from '@/lib/routes';

interface CategoryNavProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

type NavChild = { id: string; name: string; icon: string };
type NavCategory = {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
  children: NavChild[];
};

const CategoryNav = ({ activeCategory, onCategoryChange }: CategoryNavProps) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { data: apiCategories } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });

  const normalizedCategories: NavCategory[] = useMemo(
    () => [
      {
        id: 'all',
        name: 'All',
        icon: '🛍️',
        children: [],
      },
      ...(apiCategories?.map((category) => ({
        id: category.slug,
        name: category.name,
        icon: category.icon || '📦',
        imageUrl: category.image_url,
        children: category.children.map((child) => ({
          id: child.slug,
          name: child.name,
          icon: child.icon || '📁',
        })),
      })) || []),
    ],
    [apiCategories],
  );

  const hovered = useMemo(
    () => normalizedCategories.find((c) => c.id === hoveredCategory) ?? null,
    [normalizedCategories, hoveredCategory],
  );

  const pillClass = (isActive: boolean, extra?: string) =>
    cn(
      'flex flex-col items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl transition-colors min-w-[3.75rem] sm:min-w-[4.25rem] flex-shrink-0 relative pb-2',
      'hover:bg-muted/80 text-muted-foreground',
      isActive && 'text-foreground font-semibold',
      isActive &&
        "after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-9 after:h-[3px] after:bg-primary after:rounded-full",
      extra,
    );

  return (
    <nav className={cn('bg-white border-b border-border/60 sticky z-40 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]', STOREFRONT_CATEGORY_NAV_STICKY_TOP)}>
      <div className="container mx-auto px-2 md:px-4">
        <div
          className="relative"
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div className="flex items-stretch gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide py-2 md:py-2.5">
            {normalizedCategories.map((category) => (
              <div key={category.id} className="flex-shrink-0">
                <button
                  type="button"
                  onMouseEnter={() => setHoveredCategory(category.id)}
                  onClick={() => onCategoryChange(category.id)}
                  className={pillClass(activeCategory === category.id, 'w-full')}
                >
                  <span
                    className={cn(
                      'w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm ring-1',
                      activeCategory === category.id
                        ? 'ring-primary ring-2 ring-offset-1 ring-offset-white'
                        : 'ring-border/70',
                    )}
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl leading-none" aria-hidden>
                        {category.icon}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[4.5rem] sm:max-w-[5.5rem] line-clamp-2">
                    {category.name}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Mega menu: subcategories on hover */}
          {hovered && hovered.children.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-[60] border-t border-border bg-card shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-1 duration-150"
              onMouseEnter={() => setHoveredCategory(hovered.id)}
            >
              <div className="container mx-auto px-4 py-4 max-h-[min(70vh,420px)] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-foreground">{hovered.name}</h3>
                  <Link
                    to={
                      hovered.id === 'all'
                        ? storefrontRoutes.products()
                        : storefrontRoutes.category(hovered.id)
                    }
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setHoveredCategory(null)}
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-0">
                  {hovered.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => {
                        onCategoryChange(child.id);
                        setHoveredCategory(null);
                      }}
                      className="text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors min-w-0"
                    >
                      <span className="text-base shrink-0" aria-hidden>
                        {child.icon}
                      </span>
                      <span className="font-medium line-clamp-2">{child.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default CategoryNav;
