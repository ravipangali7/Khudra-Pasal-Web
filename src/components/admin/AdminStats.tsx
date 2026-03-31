import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'cyan';
  onClick?: () => void;
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-600 border-l-blue-500',
  green: 'bg-emerald-500/10 text-emerald-600 border-l-emerald-500',
  orange: 'bg-orange-500/10 text-orange-600 border-l-orange-500',
  purple: 'bg-purple-500/10 text-purple-600 border-l-purple-500',
  red: 'bg-red-500/10 text-red-600 border-l-red-500',
  cyan: 'bg-cyan-500/10 text-cyan-600 border-l-cyan-500',
};

export function AdminStatCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend, 
  color = 'blue',
  onClick 
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        "border-l-4 transition-all duration-200",
        colorMap[color],
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg", colorMap[color].split(' ')[0])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  stats: StatCardProps[];
  columns?: 2 | 3 | 4;
}

export function AdminStatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {stats.map((stat, idx) => (
        <AdminStatCard key={idx} {...stat} />
      ))}
    </div>
  );
}
