import { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: 'default' | 'destructive' | 'warning';
  children?: SidebarItem[];
}

interface AdminSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed?: boolean;
}

export default function AdminSidebar({ items, activeItem, onItemClick, collapsed = false }: AdminSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const renderItem = (item: SidebarItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.includes(item.id);
    const isActive = activeItem === item.id || item.children?.some(child => activeItem === child.id);
    const Icon = item.icon;

    if (collapsed && depth === 0) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-10 h-10 mx-auto my-1",
                isActive && "bg-primary/10 text-primary"
              )}
              onClick={() => hasChildren ? toggleGroup(item.id) : onItemClick(item.id)}
            >
              <Icon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-10 px-3 my-0.5",
            depth > 0 && "pl-8 h-9",
            isActive && !hasChildren && "bg-primary/10 text-primary font-medium",
            hasChildren && isActive && "text-primary"
          )}
          onClick={() => hasChildren ? toggleGroup(item.id) : onItemClick(item.id)}
        >
          <Icon className={cn("w-4 h-4 mr-3", depth > 0 && "w-3.5 h-3.5")} />
          <span className="flex-1 text-left text-sm">{item.label}</span>
          {item.badge && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
              item.badgeColor === 'destructive' && "bg-destructive text-destructive-foreground",
              item.badgeColor === 'warning' && "bg-orange-500 text-white",
              (!item.badgeColor || item.badgeColor === 'default') && "bg-muted text-muted-foreground"
            )}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            isExpanded ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />
          )}
        </Button>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-border">
            {item.children!.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full py-2">
      <div className={cn("px-2", collapsed && "px-1")}>
        {items.map(item => renderItem(item))}
      </div>
    </ScrollArea>
  );
}
