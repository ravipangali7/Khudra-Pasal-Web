import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import StorefrontTextNav from '@/components/layout/StorefrontTextNav';
import CategoryNav from '@/components/layout/CategoryNav';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import Footer from '@/components/layout/Footer';
import HeroBanner from '@/components/banners/HeroBanner';
import ShopByCategory from '@/components/category/ShopByCategory';
import ProductGrid from '@/components/product/ProductGrid';
import TrendingNow from '@/components/sections/TrendingNow';
import LatestProducts from '@/components/sections/LatestProducts';
import BrandShowcase from '@/components/sections/BrandShowcase';
import FlashDeals from '@/components/sections/FlashDeals';
import HomePromoStrip from '@/components/home/HomePromoStrip';
import DiscountPromoCard from '@/components/home/DiscountPromoCard';
import SmallBannerSection from '@/components/banners/SmallBannerSection';
import FooterPromoGrid from '@/components/banners/FooterPromoGrid';
import ScrollToTop from '@/components/ui/ScrollToTop';
import AIChatbot from '@/components/chat/AIChatbot';
import type { StorefrontCategorySlug } from '@/types';
import { useQuery } from '@tanstack/react-query';
import {
  mapFlashDealProductToUi,
  mapWebsiteProductToUi,
  websiteApi,
  type WebsiteProduct,
} from '@/lib/api';
import { findCategoryDisplayName } from '@/lib/categoryDisplayName';
import { resolveThemeClass } from '@/lib/categoryTheme';
import { useLocation } from 'react-router-dom';
import { storefrontRoutes } from '@/lib/routes';

/** Subtle strip behind category icon nav (non-all) — white + light pink wash */
const categoryHeaderStyles: Record<string, string> = {
  all: '',
  default: 'bg-gradient-to-r from-background via-primary/[0.04] to-background',
  cafe: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  home: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  toys: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  fresh: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  electronics: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  mobiles: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  beauty: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
  fashion: 'bg-gradient-to-r from-background via-primary/[0.05] to-background',
};

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<StorefrontCategorySlug>('all');
  const [categorySearch, setCategorySearch] = useState('');
  const location = useLocation();

  const { data: categories } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 45_000,
  });

  const { data: catalog, isLoading: catalogLoading, isError: catalogError } = useQuery({
    queryKey: ['website', 'catalog', 20],
    queryFn: () => websiteApi.catalog({ per_category: 20 }),
    enabled: activeCategory === 'all',
    staleTime: 45_000,
  });

  const { data: categoryPage, isLoading: categoryLoading, isError: categoryError } = useQuery({
    queryKey: ['home-products', activeCategory, categorySearch],
    queryFn: () =>
      websiteApi.products({
        category: activeCategory,
        page_size: 200,
        ...(categorySearch.trim() ? { search: categorySearch.trim() } : {}),
      }),
    enabled: activeCategory !== 'all',
    staleTime: 45_000,
  });

  const { data: activeDeals = [] } = useQuery({
    queryKey: ['website', 'deals'],
    queryFn: () => websiteApi.deals(),
    staleTime: 60_000,
  });

  const { data: latestData } = useQuery({
    queryKey: ['website', 'products', 'latest'],
    queryFn: () => websiteApi.products({ page_size: 12, ordering: '-created_at' }),
    enabled: activeCategory === 'all',
    staleTime: 45_000,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['website', 'products', 'trending'],
    queryFn: () => websiteApi.products({ page_size: 12, trending: true, ordering: '-rating' }),
    enabled: activeCategory === 'all',
    staleTime: 45_000,
  });

  const { data: discountedData } = useQuery({
    queryKey: ['website', 'products', 'discounted'],
    queryFn: () => websiteApi.products({ page_size: 12, has_discount: true, ordering: '-discount_percent' }),
    enabled: activeCategory === 'all',
    staleTime: 45_000,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    setCategorySearch('');
  }, [activeCategory]);

  const categoryDisplayName = useMemo(
    () => findCategoryDisplayName(categories, activeCategory),
    [categories, activeCategory],
  );

  const allCatalogApiProducts = useMemo((): WebsiteProduct[] => {
    if (!catalog?.length) return [];
    const list: WebsiteProduct[] = [];
    const seen = new Set<number>();
    for (const row of catalog) {
      for (const p of row.products || []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    }
    return list;
  }, [catalog]);

  const tabProductsUi = useMemo(() => {
    if (activeCategory === 'all') return [];
    return (categoryPage?.results || []).map(mapWebsiteProductToUi);
  }, [activeCategory, categoryPage]);

  const latestProducts = useMemo(
    () => (latestData?.results || []).map(mapWebsiteProductToUi),
    [latestData],
  );

  const allCatalogUiProducts = useMemo(
    () => allCatalogApiProducts.map(mapWebsiteProductToUi),
    [allCatalogApiProducts],
  );

  const flashDeals = useMemo(() => allCatalogUiProducts.filter((p) => p.discount && p.discount >= 10).slice(0, 6), [allCatalogUiProducts]);

  const flashDealProductsUi = useMemo(() => {
    const deal = activeDeals[0];
    if (deal?.products?.length) {
      return deal.products.slice(0, 6).map(mapFlashDealProductToUi);
    }
    return flashDeals;
  }, [activeDeals, flashDeals]);

  const flashEndsAt = activeDeals[0]?.end_at ?? null;

  const bestDealsProducts = useMemo(
    () => (discountedData?.results || []).map(mapWebsiteProductToUi),
    [discountedData],
  );

  const trendingProducts = useMemo(
    () => (trendingData?.results || []).map(mapWebsiteProductToUi),
    [trendingData],
  );

  const tabFlashDeals = useMemo(
    () => tabProductsUi.filter((p) => p.discount && p.discount >= 10).slice(0, 6),
    [tabProductsUi],
  );

  const tabTrending = useMemo(
    () =>
      tabProductsUi.filter((p) => p.isBestseller || (p.rating && p.rating >= 4.7)).slice(0, 6),
    [tabProductsUi],
  );

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category as StorefrontCategorySlug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const headerThemeKey = resolveThemeClass(activeCategory);
  const headerClass =
    activeCategory === 'all' ? '' : categoryHeaderStyles[headerThemeKey] ?? categoryHeaderStyles.default;

  return (
    <div className="min-h-screen bg-background pb-0 md:pb-0">
      <Header />
      <StorefrontTextNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
      <div className={headerClass}>
        <CategoryNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
      </div>

      <main className="container mx-auto px-4 py-4 space-y-6">
        <HeroBanner key={activeCategory} placement="homepage" />
        {activeCategory === 'all' && (
          <>
            <HomePromoStrip />
            <ShopByCategory onCategoryClick={handleCategoryChange} />

            {flashDealProductsUi.length > 0 && (
              <FlashDeals
                products={flashDealProductsUi}
                categoryTheme="cafe"
                listingScope="home-flash-deals"
                endsAt={flashEndsAt}
              />
            )}

            <BrandShowcase />

            <DiscountPromoCard discountedCount={bestDealsProducts.length} />

            {bestDealsProducts.length > 0 && (
              <LatestProducts
                variant="bestDeals"
                products={bestDealsProducts}
                categoryTheme="fresh"
                listingScope="home-best-deals"
              />
            )}

            {latestProducts.length > 0 && (
              <LatestProducts
                products={latestProducts}
                categoryTheme="fresh"
                listingScope="home-latest-arrivals"
              />
            )}

            {trendingProducts.length > 0 && (
              <TrendingNow products={trendingProducts} listingScope="home-trending" />
            )}

            {catalogLoading && (
              <div className="space-y-4">
                <div className="h-40 rounded-2xl bg-muted animate-pulse" />
                <div className="h-48 rounded-2xl bg-muted animate-pulse" />
              </div>
            )}

            {catalogError && (
              <p className="text-center text-sm text-destructive">Could not load catalog. Please try again later.</p>
            )}

            {!catalogLoading && !catalogError && catalog && catalog.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No categories to show yet.</p>
            )}

            {!catalogLoading && !catalogError && catalog && catalog.length > 0 && (
              <>
                {catalog.map((root) => {
                  const prods = (root.products || []).map(mapWebsiteProductToUi);
                  if (prods.length === 0) return null;
                  return (
                    <ProductGrid
                      key={root.id}
                      title={root.name}
                      products={prods}
                      categoryTheme={root.slug}
                      listingScope={`catalog-grid-${root.id}`}
                      seeAllTo={storefrontRoutes.category(root.slug)}
                      columns={6}
                    />
                  );
                })}

                {catalog.flatMap((root) =>
                  (root.children || []).flatMap((child) => {
                    const childProds = allCatalogApiProducts
                      .filter((p) => p.category_slug === child.slug)
                      .slice(0, 8)
                      .map(mapWebsiteProductToUi);
                    if (childProds.length === 0) return [];
                    return [
                      <ProductGrid
                        key={`sub-${child.id}`}
                        title={child.name}
                        products={childProds}
                        categoryTheme={child.slug}
                        listingScope={`catalog-subgrid-${child.id}`}
                        seeAllTo={storefrontRoutes.category(child.slug)}
                        columns={6}
                      />,
                    ];
                  }),
                )}
                <SmallBannerSection />
                <FooterPromoGrid />
              </>
            )}
          </>
        )}

        {activeCategory !== 'all' && (
          <>
            <div className="space-y-3">
              <label className="search-bar flex cursor-text items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search in this category..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground md:text-xl">
                  {categoryDisplayName} products
                </h2>
                <span className="text-sm text-muted-foreground">
                  {categoryLoading ? '…' : `${tabProductsUi.length} items`}
                </span>
              </div>
            </div>
            {categoryLoading && <div className="min-h-[280px] rounded-2xl bg-muted animate-pulse" />}
            {categoryError && (
              <p className="text-center text-sm text-destructive">Could not load products for this category.</p>
            )}
            {!categoryLoading && !categoryError && tabProductsUi.length > 0 && (
              <ProductGrid
                title=""
                products={tabProductsUi}
                categoryTheme={activeCategory}
                listingScope={`category-${activeCategory}-grid`}
                columns={6}
              />
            )}
            {!categoryLoading && !categoryError && tabProductsUi.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No products found in this category</p>
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                >
                  Browse all
                </button>
              </div>
            )}
            {tabFlashDeals.length > 0 && (
              <FlashDeals
                products={tabFlashDeals}
                categoryTheme={activeCategory}
                listingScope={`category-${activeCategory}-flash-deals`}
                endsAt={flashEndsAt}
              />
            )}
            {tabTrending.length > 0 && (
              <TrendingNow products={tabTrending} listingScope={`category-${activeCategory}-trending`} />
            )}
          </>
        )}
      </main>

      <Footer />
      <ScrollToTop />
      <AIChatbot />
      <MobileFooterNav />
    </div>
  );
};

export default Index;
