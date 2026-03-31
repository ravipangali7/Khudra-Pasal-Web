import { useState } from 'react';
import {
  TrendingUp, ShoppingCart, Users, AlertTriangle, Plus, Ticket,
  Clock, Shield, Lock, CheckCircle, XCircle, ShieldAlert, Package,
  Wallet, Building2, Truck, DollarSign, BarChart3, Bell
} from 'lucide-react';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { mapWebsiteProductToUi, websiteApi } from '@/lib/api';

interface DashboardModuleProps {
  onNavigate: (section: string) => void;
}

export default function DashboardModule({ onNavigate }: DashboardModuleProps) {
  const [freezeAllOpen, setFreezeAllOpen] = useState(false);
  const { data: summary } = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: () => adminApi.summary(),
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const { data: recentOrdersApi } = useQuery({
    queryKey: ['admin-dashboard-recent-orders'],
    queryFn: () => adminApi.recentOrders(),
    retry: false,
  });
  const { data: salesSeriesApi } = useQuery({
    queryKey: ['admin-dashboard-sales-series'],
    queryFn: () => adminApi.salesSeries(7),
    retry: false,
  });
  const { data: productsApi } = useQuery({
    queryKey: ['admin-dashboard-products'],
    queryFn: () => websiteApi.products({ page_size: 50 }),
    retry: false,
  });
  const { data: usersApi } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: () => adminApi.users({ page_size: 50 }),
    retry: false,
  });
  const fallbackChartRows: Array<{ name: string; sales: number; orders: number; topups: number; purchases: number; transfers: number }> = [];
  const mappedProducts = (productsApi?.results || []).map(mapWebsiteProductToUi);
  const kycRequests = (usersApi?.results || [])
    .filter((user) => user.kyc_status !== 'verified')
    .map((user) => ({
      id: String(user.id),
      name: user.name,
      type: user.kyc_status,
      document: `KYC (${user.kyc_status})`,
      submitted: '—',
    }));
  const flaggedActivities: Array<{ id: string; title: string; severity: string; user: string; timestamp: string }> = [];
  const chartRows =
    salesSeriesApi && salesSeriesApi.length > 0
      ? salesSeriesApi.map((item) => ({
          name: new Date(item.day).toLocaleDateString(undefined, { weekday: 'short' }),
          sales: item.sales,
          orders: item.orders,
          topups: item.sales * 0.55,
          purchases: item.sales * 0.35,
          transfers: item.sales * 0.1,
        }))
      : fallbackChartRows;
  const uiRecentOrders = recentOrdersApi?.map((order) => ({
    id: order.order_number,
    customer: order.customer_name,
    total: Number(order.total),
    items: 1,
    status: order.status,
    date: order.created_at,
    payment: order.payment_method,
    seller: order.seller_name || 'In-House',
  })) || [];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* KPI Cards - 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <AdminStatCard icon={DollarSign} title="Today's Sales" value={`Rs. ${Math.round(summary?.today_sales ?? 0).toLocaleString()}`} trend={{ value: 12, label: 'vs yesterday', isPositive: true }} color="green" />
        <AdminStatCard icon={ShoppingCart} title="Orders" value={`${summary?.today_orders ?? 0}`} trend={{ value: 8, label: 'vs yesterday', isPositive: true }} color="blue" />
        <AdminStatCard
          icon={Wallet}
          title="Platform wallet"
          subtitle="commission balance only"
          value={`Rs. ${(summary?.platform_wallet_balance ?? 0).toLocaleString()}`}
          color="purple"
        />
        <AdminStatCard icon={Building2} title="Vendors" value={`${summary?.total_vendors ?? 0}`} trend={{ value: 6, label: 'new this month', isPositive: true }} color="cyan" />
        <AdminStatCard icon={Users} title="Customers" value={`${summary?.total_users ?? 0}`} subtitle="live user count" color="orange" />
        <AdminStatCard icon={Truck} title="Delivery Men" value={`${summary?.delivery_men_count ?? 0}`} subtitle="registered" color="red" />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales & Orders (Weekly)</CardTitle>
              <div className="flex gap-1">
                {['Daily', 'Weekly', 'Monthly'].map(p => (
                  <Button key={p} variant={p === 'Weekly' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs">{p}</Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`Rs. ${(v/1000).toFixed(0)}K`]} />
                <Bar dataKey="sales" fill="hsl(36, 100%, 50%)" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="orders" fill="hsl(270, 80%, 35%)" radius={[4, 4, 0, 0]} name="Orders" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Wallet Activity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`Rs. ${(v/1000).toFixed(0)}K`]} />
                <Area type="monotone" dataKey="topups" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} name="Top-ups" />
                <Area type="monotone" dataKey="purchases" stroke="hsl(36, 100%, 50%)" fill="hsl(36, 100%, 50%)" fillOpacity={0.1} name="Purchases" />
                <Area type="monotone" dataKey="transfers" stroke="hsl(270, 80%, 35%)" fill="hsl(270, 80%, 35%)" fillOpacity={0.1} name="Transfers" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onNavigate('orders-all')}>View All</Button>
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
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Payment</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uiRecentOrders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-primary">{order.id}</td>
                      <td className="px-4 py-3">{order.customer}</td>
                      <td className="px-4 py-3 font-semibold">Rs. {order.total.toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{order.payment}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'shipped' ? 'secondary' :
                          order.status === 'processing' ? 'outline' : 'destructive'
                        } className={cn("text-xs capitalize", order.status === 'delivered' && "bg-emerald-500")}>
                          {order.status}
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
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
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('users-kyc')}>
              <Shield className="w-4 h-4 mr-2" /> Review KYC ({kycRequests.length})
            </Button>
            <Button className="w-full justify-start" variant="destructive" onClick={() => setFreezeAllOpen(true)}>
              <Lock className="w-4 h-4 mr-2" /> Emergency Freeze All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security + KYC */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" /> Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {flaggedActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{activity.user}</span>
                    <Badge variant={activity.severity === 'high' ? 'destructive' : activity.severity === 'medium' ? 'secondary' : 'outline'} className="text-[10px]">{activity.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.type} • {activity.time}</p>
                </div>
                <Button variant="ghost" size="sm">Review</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" /> Pending KYC ({kycRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kycRequests.slice(0, 3).map((kyc) => (
              <div key={kyc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{kyc.name}</p>
                  <p className="text-xs text-muted-foreground">{kyc.document} • {kyc.submitted}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600"><CheckCircle className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><XCircle className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => onNavigate('users-kyc')}>View All KYC Requests</Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Products + Low Stock */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Selling Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mappedProducts.slice(0, 4).map((product, idx) => (
              <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category} • {product.seller}</p>
                </div>
                <span className="font-semibold text-sm">Rs. {product.price.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mappedProducts.filter((p) => p.inStock === false || Number(p.unit?.split(' ')[0] || 0) < 20).map(product => (
              <div key={product.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'} className="text-xs">{product.stock} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Platform Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: 'Active Wallets', value: `${summary?.total_users ?? 0}` },
              { label: 'Avg Order Value', value: `Rs. ${Math.round((summary?.today_sales ?? 0) / Math.max(1, summary?.today_orders ?? 1)).toLocaleString()}` },
              { label: 'Today Orders', value: `${summary?.today_orders ?? 0}`, className: 'text-emerald-600' },
              { label: 'Total Vendors', value: `${summary?.total_vendors ?? 0}` },
              { label: 'Pending KYC', value: `${kycRequests.length}`, className: 'text-orange-500' },
              { label: 'Platform wallet', value: `Rs. ${(summary?.platform_wallet_balance ?? 0).toLocaleString()}`, className: 'text-primary' },
            ].map((item, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-3 text-center">
                <p className={cn("text-xl font-bold text-foreground", item.className)}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Freeze Dialog */}
      <AlertDialog open={freezeAllOpen} onOpenChange={setFreezeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Lock className="w-5 h-5" /> Emergency Freeze All Wallets
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately freeze ALL wallets platform-wide. No transactions will be allowed. This action requires OTP verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Freeze All (OTP Required)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
