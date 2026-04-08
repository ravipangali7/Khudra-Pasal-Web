import { TrendingUp } from 'lucide-react';
import { Product } from '@/types';
import SectionHeader from '@/components/ui/SectionHeader';
import ProductCard from '@/components/product/ProductCard';

interface TrendingNowProps {
  products: Product[];
  /** Distinguishes this block from other home sections for section-specific Add UI. */
  listingScope: string;
  /** Optional admin- or API-driven line; omit to hide the ticker (no invented stats). */
  trendingText?: string;
}

const TrendingNow = ({ products, listingScope, trendingText }: TrendingNowProps) => {
  return (
    <section>
      <SectionHeader title="Trending Now" categoryTheme="cafe" seeAllTo="/products/trending" />

      {trendingText ? (
        <div className="flex items-center gap-2 mb-4 py-2 px-4 bg-muted rounded-lg overflow-hidden">
          <TrendingUp className="w-5 h-5 text-category-cafe flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground animate-slide-up">{trendingText}</p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="shrink-0 basis-full snap-start sm:basis-auto sm:shrink">
            <ProductCard
              product={product}
              categoryTheme="cafe"
              listingScope={listingScope}
              topRightAccent="trending"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingNow;
