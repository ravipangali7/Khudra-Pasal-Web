import { ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  categoryTheme?: string;
  layout?: 'grid' | 'scroll' | 'featured';
  showSeeAll?: boolean;
  onSeeAll?: () => void;
  icon?: string;
  badge?: string;
  className?: string;
}

const CategorySection = ({
  title,
  subtitle,
  products,
  categoryTheme = 'all',
  layout = 'grid',
  showSeeAll = true,
  onSeeAll,
  icon,
  badge,
  className
}: CategorySectionProps) => {
  if (products.length === 0) return null;
  const theme = resolveThemeClass(categoryTheme);

  return (
    <section className={cn(`theme-${theme}`, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-2xl">{icon}</span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
              {badge && (
                <span className="px-2 py-0.5 bg-theme text-white text-xs font-bold rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {showSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 text-sm font-semibold text-theme hover:underline"
          >
            See All <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Products */}
      {layout === 'scroll' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-40 md:w-48">
              <ProductCard product={product} categoryTheme={categoryTheme} />
            </div>
          ))}
        </div>
      ) : layout === 'featured' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.slice(0, 1).map((product) => (
            <div key={product.id} className="col-span-2 row-span-2">
              <div className="relative h-full bg-card rounded-xl overflow-hidden border border-border">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 md:h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white font-bold">{product.name}</p>
                  <p className="text-white/80 text-sm">Rs. {product.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {products.slice(1, 5).map((product) => (
            <ProductCard key={product.id} product={product} categoryTheme={categoryTheme} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} categoryTheme={categoryTheme} />
          ))}
        </div>
      )}
    </section>
  );
};

export default CategorySection;
