import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type SalesChartPeriod = '7' | '30' | '90';

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

type Row = { name: string; sales: number; orders: number };

type SalesOrdersChartProps = {
  rows: Row[];
  period: SalesChartPeriod;
  onPeriodChange: (p: SalesChartPeriod) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function SalesOrdersChart({
  rows,
  period,
  onPeriodChange,
  isLoading,
  isError,
  onRetry,
}: SalesOrdersChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1 justify-end">
          {PERIODS.map((p) => (
            <Skeleton key={p.key} className="h-7 w-16" />
          ))}
        </div>
        <Skeleton className="h-[250px] w-full rounded-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>Could not load sales data.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1 justify-end mb-2">
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
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis
            yAxisId="sales"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickFormatter={(v) => formatRs(Number(v))}
            width={72}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            allowDecimals={false}
            width={36}
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
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar
            yAxisId="sales"
            dataKey="sales"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            name="Sales"
          />
          <Line
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="hsl(270, 55%, 45%)"
            strokeWidth={2}
            dot={{ r: 2 }}
            name="Orders"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}
