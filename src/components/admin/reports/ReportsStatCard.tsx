import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ReportsStatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Growth vs previous period; null = hide trend */
  trendPct?: number | null;
  trendLabel?: string;
  className?: string;
};

export function ReportsStatCard({
  title,
  value,
  icon: Icon,
  trendPct,
  trendLabel = "vs prev. period",
  className,
}: ReportsStatCardProps) {
  const showTrend = trendPct != null && Number.isFinite(trendPct);
  const positive = showTrend && trendPct >= 0;

  return (
    <Card
      className={cn(
        "shadow-md border-border/80 border-l-4 border-l-primary/70 overflow-hidden",
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{value}</p>
            {showTrend ? (
              <div className="flex items-center gap-1.5 pt-1">
                {positive ? (
                  <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <TrendingDown className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    positive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {positive ? "↑" : "↓"} {Math.abs(trendPct).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground truncate">{trendLabel}</span>
              </div>
            ) : null}
          </div>
          <div
            className="rounded-xl p-3 shrink-0 bg-primary/10 text-primary shadow-sm"
            aria-hidden
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
