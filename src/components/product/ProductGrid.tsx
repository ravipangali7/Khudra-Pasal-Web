import { Product } from '@/types';
import ProductCard from './ProductCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface ProductGridProps {
  title: string;
  products: Product[];
  categoryTheme?: string;
  listingScope?: string;
  seeAllTo?: string;
  onSeeAll?: () => void;
  columns?: number;
}

const ProductGrid = ({ 
  title, 
  products, 
  categoryTheme = 'all',
  listingScope,
  seeAllTo,
  onSeeAll,
  columns = 4
}: ProductGridProps) => {
  // Dynamic column classes based on columns prop
  const getColumnClass = () => {
    switch (columns) {
      case 6:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6';
      case 8:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
  };

  const theme = resolveThemeClass(categoryTheme);
  return (
    <section className={`theme-${theme}`}>
      {title && (
        <SectionHeader 
          title={title} 
          categoryTheme={categoryTheme}
          seeAllTo={seeAllTo}
          onSeeAll={onSeeAll} 
        />
      )}
      
      <div className={cn("flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 sm:grid sm:overflow-visible sm:snap-none sm:pb-0 md:gap-4", getColumnClass())}>
        {products.map((product) => (
          <div key={product.id} className="shrink-0 basis-full snap-start sm:basis-auto sm:shrink">
            <ProductCard
              product={product}
              categoryTheme={categoryTheme}
              listingScope={listingScope}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
