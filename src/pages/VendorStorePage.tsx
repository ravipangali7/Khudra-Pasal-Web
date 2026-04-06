import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Store } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import ProductCard from '@/components/product/ProductCard';
import { extractResults, mapWebsiteProductToUi, websiteApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { BadgeCheck } from 'lucide-react';

/**
 * Public storefront for one vendor (filter: vendor_slug on marketplace products API).
 */
export default function VendorStorePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendor-store', slug],
    queryFn: () =>
      websiteApi.productsAllVendors({
        vendor_slug: slug,
        page_size: 200,
      }),
    enabled: Boolean(slug),
  });

  const products = useMemo(() => extractResults(data).map(mapWebsiteProductToUi), [data]);
  const storeLabel = products[0]?.vendor?.name || slug.replace(/-/g, ' ');
  const logo = products[0]?.vendor?.logo;
  const verified = products[0]?.vendor?.isVerified;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-8 max-w-6xl">
        <Button variant="ghost" size="sm" className="mb-4 gap-2 -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 p-4 rounded-2xl border bg-card">
          <div className="flex items-center gap-4 min-w-0">
            {logo ? (
              <img src={logo} alt="" className="w-16 h-16 rounded-full object-cover border shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Store className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate flex items-center gap-2">
                {storeLabel}
                {verified ? <BadgeCheck className="w-5 h-5 text-sky-500 shrink-0" aria-label="Verified" /> : null}
              </h1>
              <p className="text-sm text-muted-foreground">@{slug}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Loading store…</p>
        ) : isError ? (
          <p className="text-destructive text-center py-12">Could not load this store.</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No products listed for this store yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <p className="text-center mt-8 text-sm text-muted-foreground">
          <Link to="/reels" className="underline hover:text-foreground">
            Watch reels
          </Link>
        </p>
      </main>
      <MobileFooterNav />
    </div>
  );
}
