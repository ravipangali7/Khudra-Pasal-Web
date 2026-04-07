import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CreditCard,
  Download,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ReportChartCard } from '@/components/admin/reports/ReportChartCard';
import { ReportsStatCard } from '@/components/admin/reports/ReportsStatCard';
import {
  CHART_PALETTE,
  CHART_PRIMARY,
  chartAxisTick,
  chartTooltipStyle,
} from '@/components/admin/reports/reportsChartTheme';
import { downloadCsv, rowsToCsv } from '@/components/admin/reports/reportsCsv';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { vendorApi } from '@/lib/api';

function fmtRs(n: number) {
  if (!Number.isFinite(n)) return 'Rs. 0';
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

function presetRange(days: number) {
  const to = new Date();
  const from = subDays(to, days);
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
}

export default function VendorReportsModule() {
  const [from, setFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const {
    data,
    refetch,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['vendor', 'reports', from, to],
    queryFn: () => vendorApi.reportsSummary({ from: from || undefined, to: to || undefined }),
  });

  const dailyChart = useMemo(() => {
    const daily = data?.daily ?? [];
    return daily.map((row) => ({
      name: row.day.length >= 10 ? row.day.slice(5, 10) : row.day,
      sales: row.sales,
      orders: row.orders,
    }));
  }, [data?.daily]);

  const cats = data?.category_breakdown ?? [];
  const status = data?.order_status ?? [];
  const byPortal = data?.by_placed_portal ?? [];
  const byChannel = data?.by_channel ?? [];
  const byPayment = data?.by_payment_method ?? [];
  const topProducts = data?.top_products ?? [];
  const sc = data?.summary_counts;

  const COLORS = CHART_PALETTE;

  const downloadServerCsv = async () => {
    const blob = await vendorApi.reportsExportCsv({ from: from || undefined, to: to || undefined });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-orders-${from || 'export'}-${to || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPortalCsv = () => {
    if (!byPortal.length) return;
    const rows = byPortal.map((r) => ({
      key: r.key,
      label: r.label,
      orders: r.orders,
      revenue: r.revenue,
    }));
    downloadCsv(
      `vendor-report-portals-${from}-${to}.csv`,
      rowsToCsv(['key', 'label', 'orders', 'revenue'], rows),
    );
  };

  const exportPaymentCsv = () => {
    if (!byPayment.length) return;
    const rows = byPayment.map((r) => ({
      method: r.method,
      label: r.label,
      orders: r.orders,
      revenue: r.revenue,
    }));
    downloadCsv(
      `vendor-report-payments-${from}-${to}.csv`,
      rowsToCsv(['method', 'label', 'orders', 'revenue'], rows),
    );
  };

  const exportTopProductsCsv = () => {
    if (!topProducts.length) return;
    const rows = topProducts.map((r) => ({
      product_id: r.product_id,
      name: r.name,
      quantity: r.quantity,
      revenue: r.revenue,
    }));
    downloadCsv(
      `vendor-report-top-products-${from}-${to}.csv`,
      rowsToCsv(['product_id', 'name', 'quantity', 'revenue'], rows),
    );
  };

  const exportDailyCsv = () => {
    if (!dailyChart.length) return;
    const rows = dailyChart.map((r) => ({ day: r.name, sales: r.sales, orders: r.orders }));
    downloadCsv(`vendor-report-daily-${from}-${to}.csv`, rowsToCsv(['day', 'sales', 'orders'], rows));
  };

  const errMsg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Could not load reports.';

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Store reports</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Sales and orders for your store, broken down by customer portal, payment method, and channel (POS vs
            online). All figures use the date range below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isLoading}
            onClick={() => void downloadServerCsv()}
          >
            <Download className="h-4 w-4" />
            Export orders (CSV)
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5"
            disabled={isLoading}
            onClick={() => void refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const p = presetRange(7);
                setFrom(p.from);
                setTo(p.to);
              }}
            >
              Last 7 days
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const p = presetRange(30);
                setFrom(p.from);
                setTo(p.to);
              }}
            >
              Last 30 days
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const p = presetRange(90);
                setFrom(p.from);
                setTo(p.to);
              }}
            >
              Last 90 days
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-4 flex-1">
            <div className="space-y-1">
              <Label htmlFor="rep-from">From</Label>
              <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rep-to">To</Label>
              <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Apply range
            </Button>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-destructive">
            {errMsg.includes('403') || errMsg.toLowerCase().includes('vendor profile')
              ? 'Your account needs a linked vendor store to view reports.'
              : errMsg}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isError && isLoading && !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading reports…</span>
        </div>
      ) : null}

      {!isError && (data || !isLoading) ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <ReportsStatCard title="Gross sales" value={fmtRs(Number(data?.gross_sales ?? 0))} icon={TrendingUp} />
            <ReportsStatCard
              title="Wallet settled"
              value={fmtRs(Number(data?.wallet_settled_total ?? 0))}
              icon={Wallet}
            />
            <ReportsStatCard
              title="Earnings (est.)"
              value={fmtRs(Number(data?.earnings_estimate ?? 0))}
              icon={CreditCard}
            />
            <ReportsStatCard
              title="Orders"
              value={String(sc?.order_count ?? 0)}
              icon={ShoppingCart}
            />
            <ReportsStatCard
              title="Avg. order value"
              value={fmtRs(Number(sc?.avg_order_value ?? 0))}
              icon={BarChart3}
            />
            <ReportsStatCard title="Items sold" value={String(sc?.items_sold ?? 0)} icon={Package} />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex w-full flex-nowrap justify-start overflow-x-auto h-auto p-1 bg-secondary/20 rounded-lg gap-1">
              <TabsTrigger value="overview" className="shrink-0 gap-1.5">
                <BarChart3 className="h-4 w-4 opacity-80" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="breakdowns" className="shrink-0 gap-1.5">
                <Store className="h-4 w-4 opacity-80" />
                Portals &amp; products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" disabled={!dailyChart.length} onClick={exportDailyCsv}>
                  <Download className="h-4 w-4 mr-1" />
                  Export daily CSV
                </Button>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <ReportChartCard
                  title="Daily sales & orders"
                  subtitle="Sales (Rs.) vs order count"
                  contentClassName="h-72"
                >
                  {dailyChart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-16">No data for this range</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dailyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={chartAxisTick} />
                        <YAxis yAxisId="left" tick={chartAxisTick} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                        <YAxis yAxisId="right" orientation="right" tick={chartAxisTick} allowDecimals={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend />
                        <Bar yAxisId="right" dataKey="orders" name="Orders" fill={CHART_PALETTE[2]} radius={[4, 4, 0, 0]} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sales"
                          name="Sales (Rs.)"
                          stroke={CHART_PRIMARY}
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </ReportChartCard>

                <ReportChartCard title="Sales by category" contentClassName="h-72 flex justify-center">
                  {cats.length === 0 ? (
                    <p className="text-sm text-muted-foreground self-center">No category data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={cats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                          {cats.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtRs(v)} />
                        <Legend layout="horizontal" verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ReportChartCard>
              </div>

              <ReportChartCard title="Order status" contentClassName="h-64 flex justify-center max-w-xl mx-auto">
                {status.length === 0 ? (
                  <p className="text-sm text-muted-foreground self-center">No orders in range</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={status}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                      >
                        {status.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend layout="horizontal" verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ReportChartCard>
            </TabsContent>

            <TabsContent value="breakdowns" className="space-y-6 mt-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <ReportChartCard
                  title="Orders by customer portal"
                  subtitle="Where buyers checked out (main, family, child, or legacy)"
                  contentClassName="h-72"
                >
                  {byPortal.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-16">No portal split</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={byPortal} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={chartAxisTick} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                        <YAxis type="category" dataKey="label" width={120} tick={chartAxisTick} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtRs(v)} />
                        <Bar dataKey="revenue" name="Revenue (Rs.)" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ReportChartCard>

                <ReportChartCard title="Channel: POS vs online" contentClassName="h-72">
                  {byChannel.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-16">No channel data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={byChannel} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={chartAxisTick} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                        <YAxis type="category" dataKey="label" width={100} tick={chartAxisTick} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtRs(v)} />
                        <Bar dataKey="revenue" name="Revenue (Rs.)" fill={CHART_PALETTE[1]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ReportChartCard>
              </div>

              <ReportChartCard
                title="Payment method"
                subtitle="Revenue by how customers paid"
                contentClassName="h-64"
              >
                {byPayment.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No payment breakdown</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byPayment} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={chartAxisTick} interval={0} angle={-28} textAnchor="end" height={56} />
                      <YAxis tick={chartAxisTick} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => fmtRs(v)} />
                      <Bar dataKey="revenue" fill={CHART_PALETTE[3]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ReportChartCard>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">Top products by revenue</CardTitle>
                  <Button type="button" variant="outline" size="sm" disabled={!topProducts.length} onClick={exportTopProductsCsv}>
                    <Download className="h-4 w-4 mr-1" />
                    Export table
                  </Button>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No line items in range</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.map((row) => (
                          <TableRow key={row.product_id}>
                            <TableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                              {row.name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtRs(row.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-base">Portal detail</CardTitle>
                    <Button type="button" variant="outline" size="sm" disabled={!byPortal.length} onClick={exportPortalCsv}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {byPortal.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">—</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Portal</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byPortal.map((row) => (
                            <TableRow key={row.key}>
                              <TableCell>{row.label}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtRs(row.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-base">Payment detail</CardTitle>
                    <Button type="button" variant="outline" size="sm" disabled={!byPayment.length} onClick={exportPaymentCsv}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {byPayment.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">—</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {byPayment.map((row) => (
                            <TableRow key={row.method || row.label}>
                              <TableCell>{row.label}</TableCell>
                              <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtRs(row.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
