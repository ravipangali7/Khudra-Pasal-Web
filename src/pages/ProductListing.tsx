import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronRight, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AIChatbot from '@/components/chat/AIChatbot';
import ProductCard from '@/components/product/ProductCard';
import {
  extractResults,
  mapFlashDealProductToUi,
  mapWebsiteProductToUi,
  websiteApi,
} from '@/lib/api';
import DiscountDealsBanner from '@/components/banners/DiscountDealsBanner';
import { findCategoryDisplayName } from '@/lib/categoryDisplayName';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';

type ListingKind = 'all' | 'category' | 'trending' | 'flash-deals' | 'latest' | 'discounted';

function listingKindFromPath(pathname: string): ListingKind {
  if (pathname === '/products' || pathname === '/products/') return 'all';
  if (pathname === '/products/trending') return 'trending';
  if (pathname === '/products/flash-deals') return 'flash-deals';
  if (pathname === '/products/latest') return 'latest';
  if (pathname === '/products/discounted') return 'discounted';
  if (pathname.startsWith('/products/category/')) return 'category';
  return 'all';
}

const ProductListing = () => {
  const { categoryId: categorySlug } = useParams<{ categoryId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const kind = useMemo(() => listingKindFromPath(location.pathname), [location.pathname]);

  useEffect(() => {
    if (categorySlug === 'all') {
      navigate('/products', { replace: true });
    }
  }, [categorySlug, navigate]);

  const { data: categories } = useQuery({
    queryKey: ['website-categories-nav'],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });

  const marketplaceQuery = useQuery({
    queryKey: ['listing-products', 'all-vendors', searchQuery],
    queryFn: () =>
      websiteApi.productsAllVendors({
        search: searchQuery || undefined,
        page_size: 200,
      }),
    enabled: kind === 'all',
  });

  const categoryQuery = useQuery({
    queryKey: ['listing-products', 'category', categorySlug, searchQuery],
    queryFn: () =>
      websiteApi.products({
        category: categorySlug,
        search: searchQuery || undefined,
        page_size: 200,
      }),
    enabled: kind === 'category' && Boolean(categorySlug),
  });

  const trendingQuery = useQuery({
    queryKey: ['listing-products', 'trending', searchQuery],
    queryFn: () =>
      websiteApi.products({
        trending: true,
        ordering: '-rating',
        search: searchQuery || undefined,
        page_size: 200,
      }),
    enabled: kind === 'trending',
  });

  const latestQuery = useQuery({
    queryKey: ['listing-products', 'latest', searchQuery],
    queryFn: () =>
      websiteApi.products({
        ordering: '-created_at',
        search: searchQuery || undefined,
        page_size: 200,
      }),
    enabled: kind === 'latest',
  });

  const discountedQuery = useQuery({
    queryKey: ['listing-products', 'discounted', searchQuery],
    queryFn: () =>
      websiteApi.products({
        has_discount: true,
        ordering: '-discount_percent',
        search: searchQuery || undefined,
        page_size: 200,
      }),
    enabled: kind === 'discounted',
  });

  const flashDealsQuery = useQuery({
    queryKey: ['listing-products', 'flash-deals', searchQuery],
    queryFn: async () => {
      const deals = await websiteApi.deals();
      const seen = new Set<number>();
      const out: Product[] = [];
      for (const d of deals) {
        for (const row of d.products || []) {
          const pid = row.product.id;
          if (seen.has(pid)) continue;
          seen.add(pid);
          out.push(mapFlashDealProductToUi(row));
        }
      }
      return out;
    },
    enabled: kind === 'flash-deals',
  });

  const listingScope = useMemo(() => {
    switch (kind) {
      case 'all':
        return 'listing-all-products';
      case 'category':
        return 'listing-category';
      case 'trending':
        return 'listing-trending';
      case 'flash-deals':
        return 'listing-flash-deals';
      case 'latest':
        return 'listing-latest';
      case 'discounted':
        return 'listing-discounted';
      default:
        return 'listing-all-products';
    }
  }, [kind]);

  const pagedData =
    kind === 'all'
      ? marketplaceQuery.data
      : kind === 'category'
        ? categoryQuery.data
        : kind === 'trending'
          ? trendingQuery.data
          : kind === 'latest'
            ? latestQuery.data
            : kind === 'discounted'
              ? discountedQuery.data
              : undefined;

  const isLoading =
    kind === 'flash-deals'
      ? flashDealsQuery.isLoading
      : kind === 'all'
        ? marketplaceQuery.isLoading
        : kind === 'category'
          ? categoryQuery.isLoading
          : kind === 'trending'
            ? trendingQuery.isLoading
            : kind === 'latest'
              ? latestQuery.isLoading
              : kind === 'discounted'
                ? discountedQuery.isLoading
                : false;

  const isError =
    kind === 'flash-deals'
      ? flashDealsQuery.isError
      : kind === 'all'
        ? marketplaceQuery.isError
        : kind === 'category'
          ? categoryQuery.isError
          : kind === 'trending'
            ? trendingQuery.isError
            : kind === 'latest'
              ? latestQuery.isError
              : kind === 'discounted'
                ? discountedQuery.isError
                : false;

  const error =
    kind === 'flash-deals'
      ? flashDealsQuery.error
      : kind === 'all'
        ? marketplaceQuery.error
        : kind === 'category'
          ? categoryQuery.error
          : kind === 'trending'
            ? trendingQuery.error
            : kind === 'latest'
              ? latestQuery.error
              : kind === 'discounted'
                ? discountedQuery.error
                : null;

  const filteredProducts = useMemo(() => {
    let items: Product[];
    if (kind === 'flash-deals') {
      items = flashDealsQuery.data ?? [];
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        items = items.filter((p) => p.name.toLowerCase().includes(q));
      }
    } else {
      const raw = extractResults(pagedData);
      items = raw.map(mapWebsiteProductToUi);
    }
    switch (sortBy) {
      case 'price-asc':
        return [...items].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...items].sort((a, b) => b.price - a.price);
      case 'rating':
        return [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return items;
    }
  }, [kind, pagedData, sortBy, flashDealsQuery.data, searchQuery]);

  const title = useMemo(() => {
    switch (kind) {
      case 'all':
        return 'All products';
      case 'category':
        return findCategoryDisplayName(categories, categorySlug || '');
      case 'trending':
        return 'Trending';
      case 'flash-deals':
        return 'Flash deals';
      case 'latest':
        return 'Latest arrivals';
      case 'discounted':
        return 'Discounted products';
      default:
        return 'All products';
    }
  }, [kind, categories, categorySlug]);

  const discountedListCount = useMemo(() => {
    if (kind !== 'discounted') return 0;
    return extractResults(pagedData).length;
  }, [kind, pagedData]);

  const emptyHint = useMemo(() => {
    switch (kind) {
      case 'flash-deals':
        return 'No flash deal products right now.';
      case 'trending':
        return 'No trending products match your search.';
      case 'discounted':
        return 'No discounted products match your search.';
      default:
        return 'No products found';
    }
  }, [kind]);

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-8">
      <Header cartCount={cartCount} />

      <div className="border-b border-border/60 bg-white/95">
        <div className="container px-4 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium capitalize">{title}</span>
          </div>
        </div>
      </div>

      {kind === 'discounted' && (
        <div className="container px-4 pt-4">
          <DiscountDealsBanner dealCount={discountedListCount} hideCta />
        </div>
      )}

      <div className="sticky top-0 z-30 border-b border-border/60 bg-white/95 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm">
        <div className="container space-y-3 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="line-clamp-2 text-lg font-bold capitalize text-foreground">{title}</h1>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="shrink-0 rounded-full border border-border/80 bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <label className="search-bar flex cursor-text items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
      </div>

      <div className="container px-4 py-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
        )}
        {isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {error instanceof Error ? error.message : 'Could not load products.'}
          </p>
        )}
        {!isLoading && !isError && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-1">{emptyHint}</h3>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          </div>
        ) : null}
        {!isLoading && !isError && filteredProducts.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((item) => (
              <ProductCard key={item.id} product={item} listingScope={listingScope} />
            ))}
          </div>
        ) : null}
      </div>

      <AIChatbot />
      <MobileFooterNav />
    </div>
  );
};

export default ProductListing;
