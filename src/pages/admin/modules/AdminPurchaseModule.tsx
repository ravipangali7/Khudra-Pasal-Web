import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';
import { buildAdminModulePath } from '@/pages/admin/moduleRegistry';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatRs(n: number) {
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

function endDateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function startDateStr(days: number) {
  const x = new Date();
  x.setDate(x.getDate() - (days - 1));
  return x.toISOString().slice(0, 10);
}

type AdminKpis = {
  gross_sales?: number;
  order_count?: number;
  aov?: number;
  items_sold?: number;
  paid_orders?: number;
  pending_payment_orders?: number;
  unique_customers?: number;
  active_vendors?: number;
  platform_commission?: number;
  vendor_payouts?: number;
};

export default function AdminPurchaseModule() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(() => startDateStr(30));
  const [to, setTo] = useState(() => endDateStr());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'purchase-insights', from, to],
    queryFn: () => adminApi.purchaseInsights({ from, to }),
  });

  const kpis = (data?.kpis as AdminKpis | undefined) ?? {};
  const daily = useMemo(() => (data?.daily as { day: string; revenue: number; orders: number }[]) ?? [], [data]);
  const paymentMix = useMemo(() => (data?.payment_mix as { method: string; count: number; revenue: number }[]) ?? [], [data]);
  const portalMix = useMemo(() => (data?.portal_mix as { portal: string; count: number; revenue: number }[]) ?? [], [data]);
  const channelMix = useMemo(() => (data?.channel_mix as { channel: string; count: number; revenue: number }[]) ?? [], [data]);
  const statusFunnel = useMemo(() => (data?.status_funnel as { status: string; count: number }[]) ?? [], [data]);
  const topProducts = useMemo(
    () => (data?.top_products as { name: string; sku: string; qty: number; revenue: number }[]) ?? [],
    [data],
  );
  const topVendors = useMemo(
    () => (data?.top_vendors as { vendor_id: number; store_name: string; orders: number; gross: number }[]) ?? [],
    [data],
  );
  const vendorShare = useMemo(
    () => (data?.vendor_share_chart as { name: string; value: number; orders: number }[]) ?? [],
    [data],
  );
  const recentOrders = useMemo(
    () =>
      (data?.recent_orders as {
        id: number;
        order_number: string;
        date: string;
        customer_name: string;
        seller_name: string;
        status: string;
        payment_status: string;
        payment_method: string;
        total: number;
      }[]) ?? [],
    [data],
  );

  const applyPreset = (days: number) => {
    setFrom(startDateStr(days));
    setTo(endDateStr());
  };

  const maxStatus = Math.max(1, ...statusFunnel.map((s) => s.count));

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase command center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Marketplace-wide purchase analytics: every seller, channel, and settlement signal in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            {([7, 30, 90] as const).map((d) => (
              <Button
                key={d}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-3 text-xs',
                  from === startDateStr(d) && to === endDateStr() && 'bg-background shadow-sm',
                )}
                onClick={() => applyPreset(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
          </div>
          <Button type="button" size="sm" className="h-9" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {isError ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Could not load purchase insights.'}
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: 'Gross sales', value: formatRs(Number(kpis.gross_sales ?? 0)), sub: 'All sellers' },
              { label: 'Orders', value: String(kpis.order_count ?? 0), sub: 'Marketplace' },
              { label: 'Avg. order value', value: formatRs(Number(kpis.aov ?? 0)), sub: 'Blended' },
              { label: 'Unique buyers', value: String(kpis.unique_customers ?? 0), sub: 'Customers' },
              { label: 'Active sellers', value: String(kpis.active_vendors ?? 0), sub: 'With ≥1 order' },
            ].map((k) => (
              <Card key={k.label} className="overflow-hidden border-border/80 shadow-sm bg-gradient-to-br from-card to-muted/20">
                <CardContent className="p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold mt-1 tabular-nums">{k.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Items sold', value: String(kpis.items_sold ?? 0) },
              { label: 'Paid orders', value: String(kpis.paid_orders ?? 0) },
              { label: 'Platform commission', value: formatRs(Number(kpis.platform_commission ?? 0)), accent: true },
              { label: 'Vendor payouts (est.)', value: formatRs(Number(kpis.vendor_payouts ?? 0)), accent: true },
            ].map((k) => (
              <Card key={k.label} className={cn('border-border/80', k.accent && 'border-primary/20 bg-primary/5')}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={cn('text-base font-semibold mt-1 tabular-nums', k.accent && 'text-primary')}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 h-10">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vendors">Sellers</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Marketplace revenue</CardTitle>
                    <CardDescription>Daily revenue and order volume</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {daily.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-16">No orders in this range.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickMargin={6} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: '1px solid hsl(var(--border))',
                              background: 'hsl(var(--card))',
                            }}
                            formatter={(value: number, name: string) =>
                              name === 'revenue' ? [formatRs(value), 'Revenue'] : [value, 'Orders']
                            }
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            fill="url(#adminRev)"
                            strokeWidth={2}
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="orders"
                            stroke="hsl(var(--chart-2))"
                            fill="hsl(var(--chart-2))"
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top sellers (GMV)</CardTitle>
                    <CardDescription>Top eight by gross merchandise value</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {vendorShare.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-16">No third-party sales</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={vendorShare}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={2}
                          >
                            {vendorShare.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number, _n, props) => [
                              `${formatRs(v)} · ${props.payload.orders} orders`,
                              props.payload.name,
                            ]}
                          />
                          <Legend layout="horizontal" verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Payment mix</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {paymentMix.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMix} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="method" width={80} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatRs(v)} />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Channel & portal</CardTitle>
                    <CardDescription>POS vs online and checkout surface</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 grid sm:grid-cols-2 gap-4">
                    <div className="min-h-[120px]">
                      <p className="text-xs text-muted-foreground mb-1 text-center">Channel</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={channelMix} dataKey="count" nameKey="channel" cx="50%" cy="50%" outerRadius={52}>
                            {channelMix.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-h-[120px]">
                      <p className="text-xs text-muted-foreground mb-1 text-center">Portal</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portalMix}>
                          <XAxis dataKey="portal" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={48} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip formatter={(v: number) => formatRs(v)} />
                          <Bar dataKey="revenue" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Fulfillment pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {statusFunnel.map((s) => (
                      <div key={s.status} className="rounded-lg border bg-muted/15 p-3 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <Badge variant="outline" className="capitalize text-xs">
                            {s.status}
                          </Badge>
                          <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, (s.count / maxStatus) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendors" className="mt-4">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Seller leaderboard</CardTitle>
                  <CardDescription>Ranked by gross sales in range</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {topVendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No vendor-attributed orders.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">GMV</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topVendors.map((v, idx) => (
                          <TableRow key={v.vendor_id}>
                            <TableCell className="text-muted-foreground tabular-nums">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{v.store_name}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.orders}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{formatRs(v.gross)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="mt-4">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Hot products (platform)</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No line items.</p>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topProducts.slice(0, 10)} layout="vertical" margin={{ left: 4, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={108}
                              tick={{ fontSize: 9 }}
                              tickFormatter={(n) => (String(n).length > 16 ? `${String(n).slice(0, 16)}…` : String(n))}
                            />
                            <Tooltip formatter={(v: number) => formatRs(v)} />
                            <Bar dataKey="revenue" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProducts.map((p) => (
                            <TableRow key={`${p.sku}-${p.name}`}>
                              <TableCell>
                                <div className="font-medium leading-tight">{p.name}</div>
                                <div className="text-xs text-muted-foreground">{p.sku}</div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{p.qty}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{formatRs(p.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <Card className="border-border/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Latest orders</CardTitle>
                  <CardDescription>Open full record in Orders</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((o) => (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer"
                          onClick={() => navigate(buildAdminModulePath('orders-all', 'view', String(o.id)))}
                        >
                          <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                          <TableCell>{o.customer_name}</TableCell>
                          <TableCell className="text-muted-foreground">{o.seller_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatRs(o.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
