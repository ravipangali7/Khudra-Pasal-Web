import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { storefrontRoutes } from '@/lib/routes';

const BrandShowcase = () => {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['website', 'brands'],
    queryFn: () => websiteApi.brands(),
    staleTime: 45_000,
  });

  if (!isLoading && !brands.length) return null;

  return (
    <section className="rounded-2xl bg-muted/40 py-6 md:py-8 -mx-4 px-4 md:mx-0 md:px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Brands</h2>
        <Link
          to={storefrontRoutes.brands()}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {isLoading &&
          Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-24 w-24 rounded-full bg-muted animate-pulse flex-shrink-0" />
          ))}
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={storefrontRoutes.brandDetail(brand.id)}
            className="flex-shrink-0 w-24 md:w-28 flex flex-col items-center gap-2 rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-border bg-card shadow-sm overflow-hidden flex items-center justify-center">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-background flex items-center justify-center text-base font-bold text-muted-foreground">
                  {brand.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs text-center font-medium text-foreground line-clamp-2">{brand.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BrandShowcase;
