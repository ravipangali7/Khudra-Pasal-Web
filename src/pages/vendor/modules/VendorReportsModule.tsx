import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vendorApi } from '@/lib/api';

export default function VendorReportsModule() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, refetch } = useQuery({
    queryKey: ['vendor', 'reports', from, to],
    queryFn: () => vendorApi.reportsSummary({ from: from || undefined, to: to || undefined }),
  });

  const daily = useMemo(() => (data?.daily as { day: string; sales: number; orders: number }[]) || [], [data]);
  const cats = useMemo(
    () => (data?.category_breakdown as { name: string; value: number }[]) || [],
    [data],
  );
  const status = useMemo(() => (data?.order_status as { name: string; value: number }[]) || [], [data]);
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const downloadCsv = async () => {
    const blob = await vendorApi.reportsExportCsv({ from: from || undefined, to: to || undefined });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-orders-${from || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="secondary" onClick={() => void refetch()}>
          Apply
        </Button>
        <Button variant="outline" onClick={() => void downloadCsv()}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gross sales</p>
            <p className="text-xl font-bold">Rs. {Math.round(Number(data?.gross_sales ?? 0)).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Settled (wallet)</p>
            <p className="text-xl font-bold text-emerald-600">
              Rs. {Math.round(Number(data?.wallet_settled_total ?? 0)).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Earnings (est.)</p>
            <p className="text-xl font-bold text-muted-foreground">
              Rs. {Math.round(Number(data?.earnings_estimate ?? 0)).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily sales</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No data for range</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex justify-center">
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground self-center">No breakdown</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {cats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order status</CardTitle>
        </CardHeader>
        <CardContent className="h-56 flex justify-center">
          {status.length === 0 ? (
            <p className="text-sm text-muted-foreground self-center">No orders in range</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {status.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
