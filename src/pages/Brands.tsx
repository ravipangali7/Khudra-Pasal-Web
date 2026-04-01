import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileFooterNav from "@/components/layout/MobileFooterNav";
import ScrollToTop from "@/components/ui/ScrollToTop";
import AIChatbot from "@/components/chat/AIChatbot";
import { getApiErrorHttpStatus, websiteApi } from "@/lib/api";
import { storefrontRoutes } from "@/lib/routes";

const Brands = () => {
  const { data: brands = [], isLoading, isError, error } = useQuery({
    queryKey: ["website", "brands"],
    queryFn: () => websiteApi.brands(),
    staleTime: 45_000,
  });

  const isNotFound = isError && getApiErrorHttpStatus(error) === 404;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Brands</h1>
          <p className="text-sm text-muted-foreground">Browse all brands available in our marketplace.</p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-border/60 p-4">
                <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-muted" />
                <div className="mx-auto mt-3 h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && isNotFound && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            Brands not found.
          </div>
        )}

        {!isLoading && isError && !isNotFound && (
          <div className="rounded-2xl border border-dashed border-destructive/40 py-12 text-center text-destructive">
            Could not load brands. Please try again later.
          </div>
        )}

        {!isLoading && !isError && brands.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 py-12 text-center text-muted-foreground">
            No brands available yet.
          </div>
        )}

        {!isLoading && !isError && brands.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={storefrontRoutes.brandDetail(brand.id)}
                className="rounded-xl border border-border/60 bg-card p-4 outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">
                      {brand.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-center text-sm font-medium text-foreground">{brand.name}</p>
              </Link>
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

export default Brands;

