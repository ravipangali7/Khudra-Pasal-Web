import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AdminWalletTransactionRow } from '@/lib/api';
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

type WalletRow = { name: string; topup: number; transfer: number; withdrawal: number };

type WalletActivitySectionProps = {
  chartRows: WalletRow[];
  period: SalesChartPeriod;
  onPeriodChange: (p: SalesChartPeriod) => void;
  chartLoading: boolean;
  chartError: boolean;
  onRetryChart: () => void;
  totalBalance: number | undefined;
  inflow: number | undefined;
  outflow: number | undefined;
  recentTx: AdminWalletTransactionRow[] | undefined;
  txLoading: boolean;
  txError: boolean;
  onRetryTx: () => void;
};

export function WalletActivitySection({
  chartRows,
  period,
  onPeriodChange,
  chartLoading,
  chartError,
  onRetryChart,
  totalBalance,
  inflow,
  outflow,
  recentTx,
  txLoading,
  txError,
  onRetryTx,
}: WalletActivitySectionProps) {
  return (
    <div className="space-y-4">
      {chartLoading ? (
        <div className="space-y-2">
          <div className="flex gap-1 justify-end">
            {PERIODS.map((p) => (
              <Skeleton key={p.key} className="h-7 w-16" />
            ))}
          </div>
          <Skeleton className="h-[220px] w-full rounded-md" />
        </div>
      ) : chartError ? (
        <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>Could not load wallet activity.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetryChart}>
            Retry
          </Button>
        </div>
      ) : (
        <>
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
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => formatRs(Number(v))}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v: number) => formatRs(v)}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="topup"
                stroke="hsl(142, 71%, 40%)"
                fill="hsl(142, 71%, 40%)"
                fillOpacity={0.12}
                name="Top-ups"
              />
              <Area
                type="monotone"
                dataKey="transfer"
                stroke="hsl(36, 95%, 48%)"
                fill="hsl(36, 95%, 48%)"
                fillOpacity={0.12}
                name="Transfers"
              />
              <Area
                type="monotone"
                dataKey="withdrawal"
                stroke="hsl(270, 55%, 45%)"
                fill="hsl(270, 55%, 45%)"
                fillOpacity={0.12}
                name="Withdrawals"
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      <div className="grid grid-cols-3 gap-2 text-center rounded-lg bg-muted/40 p-3 border border-border/50">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total balance</p>
          <p className="text-sm font-bold text-primary tabular-nums">
            {totalBalance != null ? formatRs(totalBalance) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Inflow (period)</p>
          <p className="text-sm font-semibold text-emerald-600 tabular-nums">
            {inflow != null ? formatRs(inflow) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Outflow (period)</p>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 tabular-nums">
            {outflow != null ? formatRs(outflow) : '—'}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Recent transactions</p>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : txError ? (
          <p className="text-xs text-destructive">
            Could not load transactions.{' '}
            <button type="button" className="underline" onClick={onRetryTx}>
              Retry
            </button>
          </p>
        ) : (recentTx?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No recent wallet transactions.</p>
        ) : (
          <ul className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentTx!.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 text-xs rounded-md bg-muted/30 px-2 py-2 border border-border/40"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate capitalize">{t.type.replace(/_/g, ' ')}</p>
                  <p className="text-muted-foreground truncate">{t.user}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('font-semibold tabular-nums', t.amount < 0 ? 'text-destructive' : '')}>
                    {t.amount < 0 ? '' : '+'}
                    {formatRs(Math.abs(t.amount))}
                  </p>
                  <Badge variant="outline" className="text-[9px] mt-0.5 capitalize">
                    {t.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
