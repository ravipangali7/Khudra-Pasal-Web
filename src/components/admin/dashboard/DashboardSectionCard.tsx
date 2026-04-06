import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardSectionCardProps = {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: string;
  onCardClick?: () => void;
  headerRight?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

export function DashboardSectionCard({
  icon: Icon,
  title,
  description,
  onCardClick,
  headerRight,
  className,
  contentClassName,
  children,
}: DashboardSectionCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-border/80 bg-card',
        onCardClick && 'cursor-pointer hover:shadow-md hover:ring-1 hover:ring-primary/25 transition-all',
        className,
      )}
      onClick={onCardClick}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
    >
      <CardHeader className="pb-2 bg-muted/40 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-foreground font-semibold">
            {Icon ? <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden /> : null}
            {title}
          </CardTitle>
          {headerRight}
        </div>
        {description ? <p className="text-xs text-muted-foreground mt-1.5">{description}</p> : null}
      </CardHeader>
      <CardContent className={cn('pt-4', contentClassName)} onClick={(e) => e.stopPropagation()}>
        {children}
      </CardContent>
    </Card>
  );
}
