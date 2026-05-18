import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import ScrollToTop from '@/components/ui/ScrollToTop';
import CategoryNav from '@/components/layout/CategoryNav';
import HeroBanner from '@/components/banners/HeroBanner';
import ProductGrid from '@/components/product/ProductGrid';
import { extractResults, mapWebsiteProductToUi, websiteApi, type WebsiteProduct } from '@/lib/api';
import { findCategoryDisplayName } from '@/lib/categoryDisplayName';
import { findCategoryBySlug } from '@/lib/categorySeo';
import { PageSeo } from '@/components/seo/PageSeo';
import { pickOgImage } from '@/lib/seo/ogImage';
import { buildCanonical } from '@/lib/seoUtils';
import { storefrontRoutes } from '@/lib/routes';

const Category = () => {
  const { categoryId: categorySlugParam } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(categorySlugParam || 'all');

  useEffect(() => {
    if (categorySlugParam) setActiveCategory(categorySlugParam);
  }, [categorySlugParam]);

  const { data: categories } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 45_000,
  });

  const {
    data: productsData,
    isPending: productsPending,
    isError: productsQueryError,
    error: productsQueryErr,
  } = useQuery({
    queryKey: ['category-products', activeCategory, searchQuery],
    queryFn: () =>
      websiteApi.products({
        category: activeCategory === 'all' ? undefined : activeCategory,
        search: searchQuery.trim() || undefined,
        page_size: 120,
      }),
  });

  const products = useMemo(
    () => extractResults<WebsiteProduct>(productsData).map(mapWebsiteProductToUi),
    [productsData],
  );

  const displayName = useMemo(
    () => findCategoryDisplayName(categories, activeCategory),
    [categories, activeCategory],
  );

  const categoryExists = useMemo(() => {
    if (!categories || !activeCategory || activeCategory === 'all') return true;
    const stack = [...categories];
    while (stack.length > 0) {
      const row = stack.pop();
      if (!row) continue;
      if (row.slug === activeCategory) return true;
      if (row.children?.length) stack.push(...row.children);
    }
    return false;
  }, [categories, activeCategory]);

  const showNotFound = !productsPending && !productsQueryError && !categoryExists && products.length === 0;

  const categoryRow = useMemo(
    () => findCategoryBySlug(categories, activeCategory),
    [categories, activeCategory],
  );

  const categorySeo = useMemo(() => {
    const path =
      activeCategory === 'all'
        ? '/products'
        : storefrontRoutes.category(activeCategory);
    const canonical = buildCanonical(path);
    const hasSearch = Boolean(searchQuery.trim());
    const title =
      (categoryRow?.metaTitle || categoryRow?.seo_title)?.trim() || displayName;
    const description =
      (categoryRow?.metaDescription || categoryRow?.seo_description)?.trim() ||
      `Shop ${displayName} on Khudra Pasal — delivered across Nepal.`;
    return {
      title,
      description,
      canonicalUrl: canonical,
      ogImage: pickOgImage(categoryRow?.image_url),
      robots: hasSearch ? ('noindex,follow' as const) : undefined,
    };
  }, [activeCategory, categoryRow, displayName, searchQuery]);

  const handleCategoryChange = (nextCategory: string) => {
    setActiveCategory(nextCategory);
    if (nextCategory === 'all') {
      navigate(storefrontRoutes.products());
      return;
    }
    navigate(storefrontRoutes.category(nextCategory));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <PageSeo {...categorySeo} />
      <Header />
      <CategoryNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

      <main className="container mx-auto space-y-6 px-4 py-4">
        <HeroBanner key={activeCategory} placement="homepage" />

        <div className="space-y-3">
          <label className="search-bar flex cursor-text items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this category..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-foreground capitalize md:text-xl">
              {displayName} products
            </h2>
            <span className="text-sm text-muted-foreground">{productsPending ? '…' : `${products.length} items`}</span>
          </div>
        </div>

        {productsPending && <div className="min-h-[200px] rounded-2xl bg-muted animate-pulse" />}

        {productsQueryError && (
          <div className="rounded-2xl border border-dashed border-destructive/40 py-12 text-center text-destructive text-sm">
            {productsQueryErr instanceof Error ? productsQueryErr.message : 'Could not load products.'}
          </div>
        )}

        {!productsPending && !productsQueryError && products.length > 0 && (
          <ProductGrid
            title=""
            products={products}
            categoryTheme={activeCategory}
            listingScope={`category-page-${activeCategory}`}
            columns={6}
          />
        )}

        {!productsPending && !productsQueryError && !showNotFound && products.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            No products found in this category.
          </div>
        )}

        {showNotFound && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            Category not found.
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
      <MobileFooterNav />
    </div>
  );
};

export default Category;
