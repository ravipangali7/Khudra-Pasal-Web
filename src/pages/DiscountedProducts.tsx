import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import CategoryNav from '@/components/layout/CategoryNav';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import Footer from '@/components/layout/Footer';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ProductCard from '@/components/product/ProductCard';
import { mapWebsiteProductToUi, websiteApi } from '@/lib/api';
import { SlidersHorizontal } from 'lucide-react';
import DiscountDealsBanner from '@/components/banners/DiscountDealsBanner';

const DiscountedProducts = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState('discount');
  const { data } = useQuery({
    queryKey: ['discount-products', activeCategory],
    queryFn: () => websiteApi.products({ category: activeCategory === 'all' ? undefined : activeCategory, page_size: 100 }),
  });

  const discounted = useMemo(() => {
    let items = (data?.results || []).map(mapWebsiteProductToUi).filter(p => p.discount && p.discount > 0);
    if (sortBy === 'discount') items.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    else if (sortBy === 'price-low') items.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') items.sort((a, b) => b.price - a.price);
    return items;
  }, [data, sortBy]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <CategoryNav activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          <DiscountDealsBanner dealCount={discounted.length} hideCta />
          <div className="flex items-center justify-end gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-border/80 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="discount">Highest Discount</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {discounted.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryTheme={activeCategory === 'all' ? 'fresh' : activeCategory}
            />
          ))}
        </div>

        {discounted.length === 0 && (
          <div className="text-center py-16">
            <SlidersHorizontal className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium text-foreground">No discounts in this category</h3>
            <p className="text-sm text-muted-foreground">Try selecting "All" categories</p>
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
      <MobileFooterNav />
    </div>
  );
};

export default DiscountedProducts;
