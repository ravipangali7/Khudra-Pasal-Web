import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface LatestProductsProps {
  products: Product[];
  categoryTheme?: string;
  listingScope?: string;
  variant?: 'latest' | 'bestDeals';
  seeAllHref?: string;
}

const LatestProducts = ({
  products,
  categoryTheme = 'all',
  listingScope,
  variant = 'latest',
  seeAllHref,
}: LatestProductsProps) => {
  const theme = resolveThemeClass(categoryTheme);
  const isBest = variant === 'bestDeals';
  const defaultHref = isBest ? '/products/discounted' : '/products/latest';
  const href = seeAllHref ?? defaultHref;

  return (
    <section className={`theme-${theme}`}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
            {isBest ? 'Best Deals' : 'Latest Arrivals'}
          </h2>
          <p className="text-sm text-[#666666] mt-1">
            {isBest ? 'Top savings from the catalog' : 'Fresh products just added'}
          </p>
        </div>
        <Link
          to={href}
          className="flex items-center gap-0.5 text-sm font-bold text-foreground hover:underline shrink-0 pt-0.5"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-48 md:w-56 animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <ProductCard
              product={product}
              categoryTheme={categoryTheme}
              listingScope={listingScope}
              topRightAccent={!isBest && index < 3 ? 'hot' : 'none'}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default LatestProducts;
