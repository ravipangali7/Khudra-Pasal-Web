import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminRecentOrder } from '@/lib/api';
import { SalesOrdersChart, type SalesChartPeriod } from './SalesOrdersChart';

function formatRs(v: number) {
  if (v >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `Rs. ${(v / 1_000).toFixed(1)}k`;
  return `Rs. ${Math.round(v).toLocaleString()}`;
}

type ChartRow = { name: string; sales: number; orders: number };

type SalesOrdersSectionProps = {
  rows: ChartRow[];
  period: SalesChartPeriod;
  onPeriodChange: (p: SalesChartPeriod) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  recentOrders: AdminRecentOrder[] | undefined;
  ordersLoading: boolean;
  ordersError: boolean;
  onRetryOrders: () => void;
};

export function SalesOrdersSection({
  rows,
  period,
  onPeriodChange,
  isLoading,
  isError,
  onRetry,
  recentOrders,
  ordersLoading,
  ordersError,
  onRetryOrders,
}: SalesOrdersSectionProps) {
  return (
    <div className="space-y-4">
      <SalesOrdersChart
        rows={rows}
        period={period}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
      />

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Recent sales and orders</p>
        {ordersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : ordersError ? (
          <p className="text-xs text-destructive">
            Could not load orders.{' '}
            <button type="button" className="underline" onClick={onRetryOrders}>
              Retry
            </button>
          </p>
        ) : (recentOrders?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No orders in this period.</p>
        ) : (
          <ul className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentOrders!.map((o) => {
              const total = Number(o.total);
              return (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 text-xs rounded-md bg-muted/30 px-2 py-2 border border-border/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">Order {o.order_number}</p>
                    <p className="text-muted-foreground truncate">{o.customer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">{formatRs(Number.isFinite(total) ? total : 0)}</p>
                    <Badge variant="outline" className="text-[9px] mt-0.5 capitalize">
                      {o.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
