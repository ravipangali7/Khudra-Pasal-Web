import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  onClick?: () => void;
}

const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  colorClass = "border-l-primary",
  onClick,
}: StatCardProps) => {
  return (
    <Card 
      className={cn(
        "border-l-4 transition-all hover:shadow-md",
        colorClass,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium mt-1",
                trend.isPositive ? "text-emerald-600" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={cn(
            "p-2.5 rounded-xl",
            colorClass.replace('border-l-', 'bg-').replace('-500', '-100')
          )}>
            <Icon className={cn(
              "w-5 h-5",
              colorClass.replace('border-l-', 'text-')
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
