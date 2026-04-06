import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportChartCard({
  title,
  subtitle,
  children,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-border/80 shadow-md overflow-hidden", className)}>
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground font-normal pt-0.5">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
