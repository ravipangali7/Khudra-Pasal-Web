import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';

const COLORS = ['hsl(36, 100%, 50%)', 'hsl(270, 80%, 35%)', 'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(347, 77%, 50%)'];

function fmtRs(n: number) {
  if (!Number.isFinite(n)) return 'Rs. 0';
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `Rs. ${(n / 1000).toFixed(0)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

export default function ReportsModule() {
  const [period, setPeriod] = useState('weekly');
  const periodDays =
    period === 'daily' ? 7 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

  const { data: summary } = useQuery({
    queryKey: ['admin', 'summary', 'reports'],
    queryFn: () => adminApi.summary(),
    retry: false,
  });

  const { data: salesSeries = [] } = useQuery({
    queryKey: ['admin', 'sales-series', 'reports', periodDays],
    queryFn: () => adminApi.salesSeries(periodDays),
    retry: false,
  });

  const { data: vendors = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'vendors', 'reports'],
    () => adminApi.vendors({ page_size: 80 }),
  );

  const { data: categories = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'categories', 'reports'],
    () => adminApi.categories({ page_size: 200 }),
  );

  const { data: walletTxns = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'wallet-txns', 'reports'],
    () => adminApi.walletTransactions({ page_size: 150 }),
  );

  const salesChartData = useMemo(
    () =>
      salesSeries.map((row) => ({
        name: row.day.length > 5 ? row.day.slice(5) : row.day,
        sales: row.sales,
        orders: row.orders,
      })),
    [salesSeries],
  );

  const revenueChartData = useMemo(
    () =>
      salesSeries.map((row) => ({
        name: row.day.length > 5 ? row.day.slice(5) : row.day,
        revenue: row.sales,
        profit: row.sales * 0.18,
      })),
    [salesSeries],
  );

  const categoryWiseSales = useMemo(() => {
    const rows = categories
      .map((c) => ({
        name: String(c.name),
        products: Number(c.products ?? 0),
      }))
      .filter((c) => c.products > 0);
    const sum = rows.reduce((a, r) => a + r.products, 0) || 1;
    return rows.map((c) => ({
      name: c.name,
      value: Math.round((100 * c.products) / sum),
      amount: c.products * 1000,
    }));
  }, [categories]);

  const vendorSalesData = useMemo(
    () =>
      vendors.map((v) => ({
        name: String(v.name),
        revenue: Number(v.revenue ?? 0) / 1000,
        orders: Number(v.orders ?? 0),
        commission: Number(v.commission ?? 0),
      })),
    [vendors],
  );

  const vendorCommissionData = useMemo(
    () =>
      vendors.map((v) => ({
        name: String(v.name),
        earned: (Number(v.revenue ?? 0) * Number(v.commission ?? 0)) / 100 / 1000,
        rate: Number(v.commission ?? 0),
      })),
    [vendors],
  );

  const walletActivityData = useMemo(() => {
    let topups = 0;
    let purchases = 0;
    let transfers = 0;
    for (const t of walletTxns) {
      const a = Math.abs(Number(t.amount ?? 0));
      const typ = String(t.type ?? '').toLowerCase();
      if (typ === 'topup' || typ === 'credit' || typ === 'bonus') topups += a;
      else if (typ === 'purchase' || typ === 'debit' || typ === 'withdrawal') purchases += a;
      else transfers += a;
    }
    return [{ name: 'Selected period', topups, purchases, transfers }];
  }, [walletTxns]);

  const periodSales = useMemo(
    () => salesSeries.reduce((a, r) => a + r.sales, 0),
    [salesSeries],
  );
  const periodOrders = useMemo(
    () => salesSeries.reduce((a, r) => a + r.orders, 0),
    [salesSeries],
  );
  const aov = periodOrders > 0 ? periodSales / periodOrders : 0;

  const vendorRevTotal = useMemo(
    () => vendors.reduce((a, v) => a + Number(v.revenue ?? 0), 0),
    [vendors],
  );

  const salesKpis = [
    { label: 'Period sales', value: fmtRs(periodSales), trend: '' },
    { label: 'Orders', value: String(periodOrders), trend: '' },
    { label: 'Avg order value', value: fmtRs(aov), trend: '' },
    { label: 'Today sales', value: fmtRs(summary?.today_sales ?? 0), trend: '' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-foreground">Reports & Analytics</h2><p className="text-sm text-muted-foreground">Chart-based insights — exportable reports</p></div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid lg:grid-cols-4 gap-3">
            {salesKpis.map((s, i) => (
              <Card key={i}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                {s.trend ? <span className="text-xs text-emerald-600">{s.trend}</span> : null}
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sales & Orders Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="sales" fill="hsl(36, 100%, 50%)" radius={[4, 4, 0, 0]} name="Sales (Rs.)" />
                  <Bar dataKey="orders" fill="hsl(270, 80%, 35%)" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Report */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Revenue & Profit</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [`Rs. ${(v / 1000).toFixed(0)}K`]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(36, 100%, 50%)" fill="hsl(36, 100%, 50%)" fillOpacity={0.1} name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} name="Profit" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Report */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Category-wise Sales</CardTitle></CardHeader>
              <CardContent>
                {categoryWiseSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No category catalog data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryWiseSales} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                        {categoryWiseSales.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Categories Revenue</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {categoryWiseSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No categories to list.</p>
                ) : (
                  categoryWiseSales.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1 text-sm font-medium">{cat.name}</span>
                      <span className="text-sm text-muted-foreground">Rs. {(cat.amount / 1000).toFixed(0)}K</span>
                      <Badge variant="outline" className="text-[10px]">{cat.value}%</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Report */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-3">
            {[
              { label: 'Total users', value: String(summary?.total_users ?? '—'), trend: '' },
              { label: 'Total vendors', value: String(summary?.total_vendors ?? '—'), trend: '' },
              { label: 'Wallet balance (all)', value: fmtRs(summary?.wallet_balance_total ?? 0), trend: '' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                {s.trend ? <span className="text-xs text-emerald-600">{s.trend}</span> : null}
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer Growth</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(270, 80%, 35%)" strokeWidth={2} dot={false} name="Sales (proxy)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Report */}
        <TabsContent value="wallet" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Wallet activity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={walletActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [`Rs. ${(v / 1000).toFixed(0)}K`]} />
                  <Bar dataKey="topups" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Top-ups" />
                  <Bar dataKey="purchases" fill="hsl(36, 100%, 50%)" radius={[4, 4, 0, 0]} name="Purchases" />
                  <Bar dataKey="transfers" fill="hsl(270, 80%, 35%)" radius={[4, 4, 0, 0]} name="Transfers" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendor Report — WITH CHARTS */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-3">
            {[
              { label: 'Total Vendors', value: `${vendors.length}`, trend: '' },
              { label: 'Vendor Revenue', value: fmtRs(vendorRevTotal), trend: '' },
              { label: 'Avg Fulfillment', value: '—', trend: '' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                {s.trend ? <span className="text-xs text-emerald-600">{s.trend}</span> : null}
              </CardContent></Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Vendor Revenue Comparison (in K)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vendorSalesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `Rs. ${v}K`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={120} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number) => [`Rs. ${v}K`]} />
                  <Bar dataKey="revenue" fill="hsl(36, 100%, 50%)" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Platform Commission Earned (in K)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={vendorCommissionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `Rs. ${v}K`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(v: number, name: string) => [name === 'rate' ? `${v}%` : `Rs. ${v.toFixed(0)}K`]} />
                  <Bar dataKey="earned" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Commission Earned" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Vendor Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vendors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No vendors yet.</p>
                ) : (
                  vendors.map((s, i) => (
                    <div key={String(s.id)} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                        <div>
                          <p className="font-medium text-sm">{String(s.name)}</p>
                          <p className="text-xs text-muted-foreground">{String(s.products ?? 0)} products • {String(s.orders ?? 0)} orders</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-sm">Rs. {(Number(s.revenue ?? 0) / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-muted-foreground">{String(s.commission ?? 0)}% commission</p>
                        </div>
                        <Badge variant={s.status === 'approved' ? 'default' : 'secondary'} className={cn("text-xs", s.status === 'approved' && "bg-emerald-500")}>{String(s.status)}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
