import { useMemo, useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  AlertTriangle,
  Plus,
  Ticket,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Package,
  Wallet,
  Building2,
  Truck,
  DollarSign,
  Bell,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { DashboardSectionCard } from '@/components/admin/dashboard/DashboardSectionCard';
import { SalesOrdersSection } from '@/components/admin/dashboard/SalesOrdersSection';
import type { SalesChartPeriod } from '@/components/admin/dashboard/SalesOrdersChart';
import { WalletActivitySection } from '@/components/admin/dashboard/WalletActivitySection';
import { ProductAnalyticsSection } from '@/components/admin/dashboard/ProductAnalyticsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  adminApi,
  type AdminKycSubmissionRow,
} from '@/lib/api';
import { buildAdminModulePath } from '../moduleRegistry';

interface DashboardModuleProps {
  onNavigate: (section: string) => void;
}

const DASH_STALE = 20_000;
const DASH_POLL = 30_000;

export default function DashboardModule({ onNavigate }: DashboardModuleProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [salesChartPeriod, setSalesChartPeriod] = useState<SalesChartPeriod>('7');
  const [walletChartPeriod, setWalletChartPeriod] = useState<SalesChartPeriod>('7');
  const [productChartPeriod, setProductChartPeriod] = useState<SalesChartPeriod>('30');
  const [approveKyc, setApproveKyc] = useState<AdminKycSubmissionRow | null>(null);
  const [rejectKycId, setRejectKycId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const salesDays = Number(salesChartPeriod) as 7 | 30 | 90;
  const walletDays = Number(walletChartPeriod) as 7 | 30 | 90;
  const productDays = Number(productChartPeriod) as 7 | 30 | 90;

  const productSnapshotParams = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (productDays - 1));
    const toYmd = (date: Date) => date.toISOString().slice(0, 10);
    return { date_from: toYmd(startDate), date_to: toYmd(endDate) };
  }, [productDays]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: () => adminApi.summary(),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const {
    data: salesSeriesApi,
    isLoading: salesLoading,
    isError: salesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'sales', salesDays],
    queryFn: () => adminApi.salesSeries(salesDays),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const {
    data: walletSeriesResp,
    isLoading: walletSeriesLoading,
    isError: walletSeriesError,
    refetch: refetchWalletSeries,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'wallet-series', walletDays],
    queryFn: () => adminApi.walletSeries(walletDays),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const { data: walletsSummary } = useQuery({
    queryKey: ['admin', 'dashboard', 'wallets-summary'],
    queryFn: () => adminApi.walletsSummary(),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const {
    data: walletTxResp,
    isLoading: walletTxLoading,
    isError: walletTxError,
    refetch: refetchWalletTx,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'wallet-tx-recent'],
    queryFn: () => adminApi.walletTransactions({ page_size: 8 }),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const { data: kycResp, isLoading: kycLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'kyc-queue'],
    queryFn: () => adminApi.kycSubmissions({ page_size: 200 }),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const {
    data: lowStockResp,
    isLoading: lowStockLoading,
    isError: lowStockError,
    refetch: refetchLowStock,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'low-stock'],
    queryFn: () => adminApi.lowStock({ threshold: 15, limit: 25 }),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const {
    data: productSnapshot,
    isLoading: productSnapshotLoading,
    isError: productSnapshotError,
    refetch: refetchProductSnapshot,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'product-analytics', productSnapshotParams.date_from, productSnapshotParams.date_to],
    queryFn: () => adminApi.reportsSnapshot(productSnapshotParams),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const { data: recentOrdersApi } = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-orders'],
    queryFn: () => adminApi.recentOrders(),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const {
    data: salesCardRecentOrders,
    isLoading: salesCardOrdersLoading,
    isError: salesCardOrdersError,
    refetch: refetchSalesCardOrders,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-orders-sales-card', salesDays],
    queryFn: () => adminApi.recentOrders({ days: salesDays, limit: 8 }),
    staleTime: DASH_STALE,
    refetchInterval: DASH_POLL,
    retry: false,
  });

  const kycQueue = useMemo(() => {
    const rows = kycResp?.results ?? [];
    return rows.filter((k) => k.status === 'pending' || k.status === 'review');
  }, [kycResp]);

  const kycPendingCount = kycQueue.length;

  const kycMut = useMutation({
    mutationFn: (args: { id: string; status: 'approved' | 'rejected'; rejection_reason?: string }) =>
      adminApi.updateKycSubmission(args.id, {
        status: args.status,
        rejection_reason: args.rejection_reason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'kyc-queue'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc-submissions'] });
      setApproveKyc(null);
      setRejectKycId(null);
      setRejectReason('');
    },
  });

  const salesChartRows = useMemo(() => {
    if (!salesSeriesApi?.length) return [];
    return salesSeriesApi.map((item) => ({
      name: new Date(item.day + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      sales: item.sales,
      orders: item.orders,
    }));
  }, [salesSeriesApi]);

  const walletChartRows = useMemo(() => {
    const series = walletSeriesResp?.series ?? [];
    return series.map((item) => ({
      name: new Date(item.day + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      topup: item.topup,
      transfer: item.transfer,
      withdrawal: item.withdrawal,
    }));
  }, [walletSeriesResp?.series]);

  const productChartRows = useMemo(() => {
    const salesSeries = productSnapshot?.series ?? [];
    if (!salesSeries.length) return [];
    const signupByDay = new Map((productSnapshot?.signup_series ?? []).map((d) => [d.day, d.signups]));
    return salesSeries.map((item) => ({
      name: new Date(item.day + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      sales: item.sales,
      orders: item.orders,
      signups: signupByDay.get(item.day) ?? 0,
    }));
  }, [productSnapshot]);

  const topCategory = useMemo(() => {
    const rows = productSnapshot?.category_breakdown ?? [];
    if (!rows.length) return null;
    return rows.reduce((best, row) => (row.sales > best.sales ? row : best));
  }, [productSnapshot?.category_breakdown]);

  const topVendor = useMemo(() => {
    const rows = productSnapshot?.vendor_breakdown ?? [];
    if (!rows.length) return null;
    return rows.reduce((best, row) => (row.sales > best.sales ? row : best));
  }, [productSnapshot?.vendor_breakdown]);

  const uiRecentOrders =
    recentOrdersApi?.map((order) => ({
      id: order.order_number,
      customer: order.customer_name,
      total: Number(order.total),
      status: order.status,
      payment: order.payment_method,
    })) ?? [];

  const goKyc = () => navigate(`${buildAdminModulePath('users-kyc')}?kyc_status=pending`);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[100px] rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <AdminStatCard
              icon={DollarSign}
              title="Today's Sales"
              value={`Rs. ${Math.round(summary?.today_sales ?? 0).toLocaleString()}`}
              trend={{ value: 12, label: 'vs yesterday', isPositive: true }}
              color="green"
            />
            <AdminStatCard
              icon={ShoppingCart}
              title="Orders"
              value={`${summary?.today_orders ?? 0}`}
              trend={{ value: 8, label: 'vs yesterday', isPositive: true }}
              color="blue"
            />
            <AdminStatCard
              icon={Wallet}
              title="Platform wallet"
              subtitle="commission balance only"
              value={`Rs. ${(summary?.platform_wallet_balance ?? 0).toLocaleString()}`}
              color="purple"
            />
            <AdminStatCard
              icon={Building2}
              title="Vendors"
              value={`${summary?.total_vendors ?? 0}`}
              trend={{ value: 6, label: 'new this month', isPositive: true }}
              color="cyan"
            />
            <AdminStatCard
              icon={Users}
              title="Customers"
              value={`${summary?.total_users ?? 0}`}
              subtitle="live user count"
              color="orange"
            />
            <AdminStatCard
              icon={Truck}
              title="Delivery Men"
              value={`${summary?.delivery_men_count ?? 0}`}
              subtitle="registered"
              color="red"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashboardSectionCard
          icon={BarChart3}
          title="Sales & Orders"
          description="Daily sales and order counts for the selected range."
          onCardClick={() => onNavigate('reports')}
          headerRight={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs shrink-0"
              onClick={() => onNavigate('reports')}
            >
              Reports <ExternalLink className="w-3 h-3" />
            </Button>
          }
        >
          <SalesOrdersSection
            rows={salesChartRows}
            period={salesChartPeriod}
            onPeriodChange={setSalesChartPeriod}
            isLoading={salesLoading}
            isError={salesError}
            onRetry={() => void refetchSales()}
            recentOrders={salesCardRecentOrders}
            ordersLoading={salesCardOrdersLoading}
            ordersError={salesCardOrdersError}
            onRetryOrders={() => void refetchSalesCardOrders()}
          />
        </DashboardSectionCard>

        <DashboardSectionCard
          icon={Wallet}
          title="Wallet Activity"
          description="Top-ups, transfers, and withdrawals (completed transactions)."
          onCardClick={() => onNavigate('wallet-master')}
        >
          <WalletActivitySection
            chartRows={walletChartRows}
            period={walletChartPeriod}
            onPeriodChange={setWalletChartPeriod}
            chartLoading={walletSeriesLoading}
            chartError={walletSeriesError}
            onRetryChart={() => void refetchWalletSeries()}
            totalBalance={walletsSummary?.total_balance}
            inflow={walletSeriesResp?.totals.inflow}
            outflow={walletSeriesResp?.totals.outflow}
            recentTx={walletTxResp?.results}
            txLoading={walletTxLoading}
            txError={walletTxError}
            onRetryTx={() => void refetchWalletTx()}
          />
        </DashboardSectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <DashboardSectionCard
          className="lg:col-span-2"
          icon={ShoppingCart}
          title="Recent Orders"
          onCardClick={() => onNavigate('orders-all')}
          headerRight={
            <Button variant="outline" size="sm" className="h-8" onClick={() => onNavigate('orders-all')}>
              View All
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Order</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Payment</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {uiRecentOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-primary">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3 font-semibold">Rs. {order.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {order.payment}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          order.status === 'delivered'
                            ? 'default'
                            : order.status === 'shipped'
                              ? 'secondary'
                              : order.status === 'processing'
                                ? 'outline'
                                : 'destructive'
                        }
                        className={cn(
                          'text-xs capitalize',
                          order.status === 'delivered' && 'bg-emerald-500',
                        )}
                      >
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {uiRecentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent orders.</p>
            ) : null}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard icon={Bell} title="Quick Actions">
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('all-products')}>
              <Plus className="w-4 h-4 mr-2" /> Add New Product
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('sellers')}>
              <Building2 className="w-4 h-4 mr-2" /> Approve Vendor Product
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('coupons')}>
              <Ticket className="w-4 h-4 mr-2" /> Create Coupon
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('flash-deals')}>
              <Clock className="w-4 h-4 mr-2" /> Start Flash Deal
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('notifications')}>
              <Bell className="w-4 h-4 mr-2" /> Send Notification
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={goKyc}>
              <Shield className="w-4 h-4 mr-2" /> Review KYC ({kycPendingCount})
            </Button>
          </div>
        </DashboardSectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashboardSectionCard
          icon={Shield}
          title={`Pending KYC (${kycPendingCount})`}
          description="Submissions awaiting review."
          onCardClick={goKyc}
        >
          {kycLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : kycQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending KYC submissions.</p>
          ) : (
            <ul className="space-y-3">
              {kycQueue.slice(0, 4).map((kyc) => (
                <li
                  key={kyc.id}
                  className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{kyc.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {kyc.document_type.replace(/_/g, ' ')} · {kyc.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-600"
                      aria-label="Approve KYC"
                      disabled={kycMut.isPending}
                      onClick={() => setApproveKyc(kyc)}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      aria-label="Reject KYC"
                      disabled={kycMut.isPending}
                      onClick={() => setRejectKycId(kyc.id)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
              <Button variant="outline" className="w-full" onClick={goKyc}>
                View all KYC
              </Button>
            </ul>
          )}
        </DashboardSectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashboardSectionCard
          icon={TrendingUp}
          title="Product analytics"
          description="Open Reports for category, vendor, and time-range breakdowns."
          onCardClick={() => onNavigate('reports')}
        >
          <ProductAnalyticsSection
            rows={productChartRows}
            period={productChartPeriod}
            onPeriodChange={setProductChartPeriod}
            isLoading={productSnapshotLoading}
            isError={productSnapshotError}
            onRetry={() => void refetchProductSnapshot()}
            totalSales={productSnapshot?.kpis.total_sales}
            totalOrders={productSnapshot?.kpis.total_orders}
            avgOrderValue={productSnapshot?.kpis.aov}
            salesGrowth={productSnapshot?.kpis.sales_growth_pct}
            ordersGrowth={productSnapshot?.kpis.orders_growth_pct}
            topCategoryName={topCategory?.name}
            topCategorySales={topCategory?.sales}
            topVendorName={topVendor?.name}
            topVendorSales={topVendor?.sales}
            onOpenReports={() => onNavigate('reports')}
          />
        </DashboardSectionCard>

        <DashboardSectionCard
          icon={AlertTriangle}
          title="Low Stock Alert"
          description={`Products at or below threshold (${lowStockResp?.threshold ?? 15} units).`}
          onCardClick={() => onNavigate('all-products')}
        >
          {lowStockLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : lowStockError ? (
            <p className="text-sm text-destructive">
              Could not load low stock data.{' '}
              <button type="button" className="underline" onClick={() => void refetchLowStock()}>
                Retry
              </button>
            </p>
          ) : (lowStockResp?.results.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No low stock products.</p>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto">
              {lowStockResp!.results.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/40"
                >
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'} className="text-xs tabular-nums">
                      {p.stock} left
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">≤ {lowStockResp!.threshold}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard icon={Package} title="Platform Overview">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Active Wallets', value: `${walletsSummary?.total_wallets ?? summary?.total_users ?? 0}` },
            {
              label: 'Avg Order Value',
              value: `Rs. ${Math.round((summary?.today_sales ?? 0) / Math.max(1, summary?.today_orders ?? 1)).toLocaleString()}`,
            },
            {
              label: 'Today Orders',
              value: `${summary?.today_orders ?? 0}`,
              className: 'text-emerald-600',
            },
            { label: 'Total Vendors', value: `${summary?.total_vendors ?? 0}` },
            { label: 'Pending KYC', value: `${kycPendingCount}`, className: 'text-orange-500' },
            {
              label: 'Platform wallet',
              value: `Rs. ${(summary?.platform_wallet_balance ?? 0).toLocaleString()}`,
              className: 'text-primary',
            },
          ].map((item, i) => (
            <div key={i} className="bg-muted/40 rounded-xl p-3 text-center border border-border/40">
              <p className={cn('text-xl font-bold text-foreground', item.className)}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <AlertDialog open={Boolean(approveKyc)} onOpenChange={(o) => !o && setApproveKyc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this KYC submission?</AlertDialogTitle>
            <AlertDialogDescription>
              {approveKyc
                ? `This will mark the submission as approved for ${approveKyc.user.name} and update their portal KYC status.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveKyc && kycMut.mutate({ id: approveKyc.id, status: 'approved' })}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(rejectKycId)} onOpenChange={(o) => !o && setRejectKycId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="dash-kyc-reject-reason">Reason (required)</Label>
            <Input
              id="dash-kyc-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this submission is rejected"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectKycId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectReason.trim() || kycMut.isPending}
              onClick={() => {
                if (!rejectKycId || !rejectReason.trim()) return;
                kycMut.mutate({
                  id: rejectKycId,
                  status: 'rejected',
                  rejection_reason: rejectReason.trim(),
                });
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
