import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Eye,
  Heart,
  MessageCircle,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminStatsGrid } from '@/components/admin/AdminStats';
import { extractResults, vendorApi } from '@/lib/api';
import { mapApiReelToUi } from '@/modules/reels/api/reelMappers';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { buildVendorModulePath } from '../moduleRegistry';
import { useVendorReelViewer } from '@/modules/reels/vendor/VendorReelViewerContext';

export default function VendorDashboardModule() {
  const navigate = useNavigate();
  const reelViewer = useVendorReelViewer();
  const { data: vSummary } = useQuery({
    queryKey: ['vendor', 'summary'],
    queryFn: () => vendorApi.summary(),
  });
  const { data: ordersResp } = useQuery({
    queryKey: ['vendor', 'orders', 'dash'],
    queryFn: () => vendorApi.orders({ page_size: 8 }),
  });
  const { data: productsResp } = useQuery({
    queryKey: ['vendor', 'products', 'dash'],
    queryFn: () => vendorApi.products({ page_size: 50 }),
  });
  const { data: reelsDashResp } = useQuery({
    queryKey: ['vendor', 'reels-dashboard'],
    queryFn: () => vendorApi.reelsDashboard({ page_size: 16 }),
  });

  const orders = useMemo(() => extractResults<Record<string, unknown>>(ordersResp), [ordersResp]);
  const products = useMemo(() => extractResults<Record<string, unknown>>(productsResp), [productsResp]);
  const dashboardReels = useMemo(
    () => extractResults(reelsDashResp).map(mapApiReelToUi),
    [reelsDashResp],
  );

  const formatReelCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

  const dashboardStats = useMemo(
    () => [
      {
        icon: TrendingUp,
        title: "Today's Sales",
        value: `Rs. ${Math.round(vSummary?.today_sales ?? 0).toLocaleString()}`,
        trend: { value: 0, label: 'today', isPositive: true },
        color: 'green' as const,
      },
      {
        icon: ShoppingCart,
        title: 'Pending Orders',
        value: String(vSummary?.pending_orders ?? 0),
        subtitle: 'Needs attention',
        color: 'orange' as const,
      },
      {
        icon: Package,
        title: 'Total Products',
        value: String(vSummary?.product_count ?? 0),
        subtitle: `${vSummary?.pending_product_approval ?? 0} pending approval`,
        color: 'blue' as const,
      },
      {
        icon: Wallet,
        title: 'Wallet Balance',
        value: `Rs. ${Math.round(vSummary?.wallet_balance ?? 0).toLocaleString()}`,
        subtitle: `Rs. ${Math.round(vSummary?.pending_payout ?? 0).toLocaleString()} pending payout`,
        color: 'purple' as const,
      },
    ],
    [vSummary],
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-100">Store overview</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Live data from your seller account</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(buildVendorModulePath('store'))}>
            Store profile
          </Button>
        </CardContent>
      </Card>

      <AdminStatsGrid stats={dashboardStats} />

      {dashboardReels.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Your reels</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate(buildVendorModulePath('my-reels'))}>
                Manage reels
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              Trending by engagement on your store. Open the feed to watch and interact.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {dashboardReels.map((reel) => (
                <button
                  key={reel.id}
                  type="button"
                  onClick={() => {
                    if (reelViewer) {
                      reelViewer.openReelViewer(reel.id);
                      return;
                    }
                    navigate(`/reels?tab=trending&reel=${reel.id}&vendor=${encodeURIComponent(reel.vendor.id)}`);
                  }}
                  className="group relative shrink-0 w-[108px] sm:w-[128px] rounded-xl overflow-hidden border bg-muted text-left hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative aspect-[9/16]">
                    <img
                      src={reel.thumbnail || reel.product.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-80 group-hover:opacity-95 transition-opacity">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
                        <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-1.5">
                      <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[9px] text-white/80">
                        <span className="inline-flex items-center gap-0.5">
                          <Eye className="h-2.5 w-2.5" />
                          {formatReelCount(reel.views)}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5" />
                          {formatReelCount(reel.likes)}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <MessageCircle className="h-2.5 w-2.5" />
                          {formatReelCount(reel.commentsCount ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate(buildVendorModulePath('all-orders'))}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-y">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Order</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.slice(0, 6).map((order) => (
                    <tr key={String(order.id)} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{String(order.id)}</td>
                      <td className="px-4 py-3">{String(order.customer)}</td>
                      <td className="px-4 py-3">Rs. {Number(order.total).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs capitalize">
                          {String(order.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-center">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">
                Rs. {Math.round(vSummary?.wallet_balance ?? 0).toLocaleString()}
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate(buildVendorModulePath('withdrawals'))}>
              Request withdrawal
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products
              .filter((p) => Number(p.stock) < 20)
              .slice(0, 6)
              .map((product) => (
                <div key={String(product.id)} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{String(product.name)}</p>
                    <p className="text-xs text-muted-foreground">SKU: {String(product.sku)}</p>
                  </div>
                  <Badge variant={Number(product.stock) === 0 ? 'destructive' : 'secondary'} className="text-xs">
                    {String(product.stock)} left
                  </Badge>
                </div>
              ))}
            {products.filter((p) => Number(p.stock) < 20).length === 0 && (
              <p className="text-sm text-muted-foreground">No low-stock SKUs.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...products]
              .sort((a, b) => Number(b.sales ?? 0) - Number(a.sales ?? 0))
              .slice(0, 5)
              .map((product, idx) => (
                <div key={String(product.id)} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{String(product.name)}</p>
                    <p className="text-xs text-muted-foreground">{String(product.sales ?? 0)} sold</p>
                  </div>
                  <span className="font-medium text-sm">Rs. {String(product.price)}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
