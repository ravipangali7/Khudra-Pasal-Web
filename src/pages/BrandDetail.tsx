import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileFooterNav from "@/components/layout/MobileFooterNav";
import ScrollToTop from "@/components/ui/ScrollToTop";
import AIChatbot from "@/components/chat/AIChatbot";
import ProductCard from "@/components/product/ProductCard";
import { getApiErrorHttpStatus, mapWebsiteProductToUi, websiteApi } from "@/lib/api";
import { storefrontRoutes } from "@/lib/routes";
import { useCart } from "@/contexts/CartContext";

const BrandDetail = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { cartCount } = useCart();

  const numericId = useMemo(() => {
    const n = Number(brandId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [brandId]);

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["website", "brands"],
    queryFn: () => websiteApi.brands(),
    staleTime: 45_000,
  });

  const brand = useMemo(() => {
    if (numericId == null) return undefined;
    return brands.find((b) => b.id === numericId);
  }, [brands, numericId]);

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErr,
  } = useQuery({
    queryKey: ["website", "products", "brand", numericId],
    queryFn: () => websiteApi.products({ brand: numericId!, page_size: 48, ordering: "-created_at" }),
    enabled: numericId != null,
    staleTime: 45_000,
  });

  const products = useMemo(
    () => (productsData?.results || []).map(mapWebsiteProductToUi),
    [productsData],
  );

  const productsNotFound = productsError && getApiErrorHttpStatus(productsErr) === 404;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header cartCount={cartCount} />

      <main className="container mx-auto space-y-6 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={storefrontRoutes.brands()}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All brands
          </Link>
        </div>

        {numericId == null && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            Invalid brand link.
          </div>
        )}

        {numericId != null && brandsLoading && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-8 md:flex-row md:items-center">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          </div>
        )}

        {numericId != null && !brandsLoading && brand && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 text-center md:flex-row md:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">{brand.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{brand.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Products from this brand</p>
            </div>
          </div>
        )}

        {numericId != null && !brandsLoading && !brand && !productsLoading && products.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-center md:text-left">
            <h1 className="text-2xl font-bold text-foreground">Brand products</h1>
            <p className="mt-1 text-sm text-muted-foreground">Filtered by brand in our catalog</p>
          </div>
        )}

        {numericId != null && productsLoading && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {numericId != null && !productsLoading && productsNotFound && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            Products not found.
          </div>
        )}

        {numericId != null && !productsLoading && productsError && !productsNotFound && (
          <div className="rounded-2xl border border-dashed border-destructive/40 py-12 text-center text-destructive">
            Could not load products. Please try again later.
          </div>
        )}

        {numericId != null &&
          !productsLoading &&
          !productsError &&
          products.length === 0 &&
          !brandsLoading &&
          !brand && (
            <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
              Brand not found or no products for this brand.
            </div>
          )}

        {numericId != null &&
          !productsLoading &&
          !productsError &&
          products.length === 0 &&
          brand && (
            <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
              No products from this brand yet.
            </div>
          )}

        {numericId != null && !productsLoading && !productsError && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} listingScope={`brand-${numericId}`} />
            ))}
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
      <AIChatbot />
      <MobileFooterNav />
    </div>
  );
};

export default BrandDetail;
