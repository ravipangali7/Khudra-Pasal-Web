import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SalesChartPeriod } from './SalesOrdersChart';

const PERIODS: { key: SalesChartPeriod; label: string }[] = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
];

function formatRs(v: number) {
  if (v >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `Rs. ${(v / 1_000).toFixed(1)}k`;
  return `Rs. ${Math.round(v).toLocaleString()}`;
}

type ProductAnalyticsRow = {
  name: string;
  sales: number;
  orders: number;
  signups: number;
};

type ProductAnalyticsSectionProps = {
  rows: ProductAnalyticsRow[];
  period: SalesChartPeriod;
  onPeriodChange: (p: SalesChartPeriod) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  totalSales: number | undefined;
  totalOrders: number | undefined;
  avgOrderValue: number | undefined;
  salesGrowth: number | null | undefined;
  ordersGrowth: number | null | undefined;
  topCategoryName: string | undefined;
  topCategorySales: number | undefined;
  topVendorName: string | undefined;
  topVendorSales: number | undefined;
  onOpenReports: () => void;
};

export function ProductAnalyticsSection({
  rows,
  period,
  onPeriodChange,
  isLoading,
  isError,
  onRetry,
  totalSales,
  totalOrders,
  avgOrderValue,
  salesGrowth,
  ordersGrowth,
  topCategoryName,
  topCategorySales,
  topVendorName,
  topVendorSales,
  onOpenReports,
}: ProductAnalyticsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-1 justify-end">
          {PERIODS.map((p) => (
            <Skeleton key={p.key} className="h-7 w-16" />
          ))}
        </div>
        <Skeleton className="h-[220px] w-full rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>Could not load product analytics.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const hasChartData = rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 justify-end">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant={period === p.key ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-7 text-xs', period === p.key && 'bg-primary text-primary-foreground')}
            onClick={() => onPeriodChange(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {hasChartData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis
              yAxisId="sales"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v) => formatRs(Number(v))}
              width={66}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              allowDecimals={false}
              width={34}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'Sales') return [formatRs(value), name];
                return [Math.round(value).toLocaleString(), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              yAxisId="sales"
              type="monotone"
              dataKey="sales"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 2 }}
              name="Sales"
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="orders"
              stroke="hsl(270, 55%, 45%)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Orders"
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="signups"
              stroke="hsl(36, 95%, 48%)"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Signups"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
          No analytics data in this range.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/50 bg-muted/35 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total sales</p>
          <p className="text-sm font-semibold text-primary tabular-nums">{formatRs(totalSales ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Growth: {salesGrowth == null ? '—' : `${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/35 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total orders</p>
          <p className="text-sm font-semibold tabular-nums">{(totalOrders ?? 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Growth: {ordersGrowth == null ? '—' : `${ordersGrowth >= 0 ? '+' : ''}${ordersGrowth.toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/35 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average order value</p>
          <p className="text-sm font-semibold tabular-nums">{formatRs(avgOrderValue ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Per order in selected range</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/35 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top performers</p>
          <p className="text-xs font-medium truncate">{topCategoryName ?? 'No category data'}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            Category: {topCategorySales != null ? formatRs(topCategorySales) : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            Vendor: {topVendorName ?? '—'} {topVendorSales != null ? `(${formatRs(topVendorSales)})` : ''}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onOpenReports}>
          Open detailed reports
        </Button>
      </div>
    </div>
  );
}
