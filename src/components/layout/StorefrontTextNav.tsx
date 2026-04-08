import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { STOREFRONT_TEXT_NAV_STICKY_TOP } from '@/components/layout/Header';

interface StorefrontTextNavProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * Secondary text navigation (Home + top-level categories) below the main header.
 * Sticks below the sticky header; paired with CategoryNav sticky offset.
 */
const StorefrontTextNav = ({ activeCategory, onCategoryChange }: StorefrontTextNavProps) => {
  const { data: apiCategories } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });

  const items = useMemo(
    () => [{ id: 'all', label: 'Home' }, ...(apiCategories || []).map((c) => ({ id: c.slug, label: c.name }))],
    [apiCategories],
  );

  return (
    <nav
      className={cn(
        'sticky z-[45] border-b border-border/60 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)]',
        STOREFRONT_TEXT_NAV_STICKY_TOP,
      )}
      aria-label="Category shortcuts"
    >
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2.5 md:py-2">
          {items.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCategoryChange(item.id)}
                className={cn(
                  'relative shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'font-semibold text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
                {isActive ? (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-[calc(100%-0.75rem)] -translate-x-1/2 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default StorefrontTextNav;
