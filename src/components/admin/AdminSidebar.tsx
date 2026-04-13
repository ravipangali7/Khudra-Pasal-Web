import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  /** Extra content at the top of an expanded group (e.g. super admin card under Support). */
  expandedGroupTopSlot?: Record<string, ReactNode>;
}

function subtreeContainsActive(node: SidebarItem, activeId: string): boolean {
  if (node.id === activeId) return true;
  return node.children?.some((c) => subtreeContainsActive(c, activeId)) ?? false;
}

function parentChainToActive(items: SidebarItem[], activeId: string): string[] {
  function walk(nodes: SidebarItem[], chain: string[]): string[] | null {
    for (const n of nodes) {
      if (n.id === activeId) return chain;
      if (n.children?.length) {
        const sub = walk(n.children, [...chain, n.id]);
        if (sub) return sub;
      }
    }
    return null;
  }
  return walk(items, []) ?? [];
}

export default function AdminSidebar({
  items,
  activeItem,
  onItemClick,
  collapsed = false,
  expandedGroupTopSlot,
}: AdminSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const ancestorIds = useMemo(() => parentChainToActive(items, activeItem), [items, activeItem]);
  const chainKey = ancestorIds.join('|');

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) next.add(id);
      return Array.from(next);
    });
  }, [activeItem, chainKey]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const renderItem = (item: SidebarItem, depth = 0) => {
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedGroups.includes(item.id);
    const hasActiveDescendant = hasChildren && item.children!.some((c) => subtreeContainsActive(c, activeItem));
    const isLeafActive = activeItem === item.id;
    const Icon = item.icon;

    if (collapsed && depth === 0) {
      const collapsedActive =
        isLeafActive || (hasChildren && hasActiveDescendant);
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'w-10 h-10 mx-auto my-1',
                collapsedActive && 'bg-orange-50 text-primary dark:bg-orange-950/40',
              )}
              onClick={() => (hasChildren ? toggleGroup(item.id) : onItemClick(item.id))}
            >
              <Icon className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    if (hasChildren) {
      const parentHighlighted = hasActiveDescendant || isExpanded;
      return (
        <div key={item.id} className="mb-1">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start h-auto min-h-10 px-2 py-2 rounded-lg',
              parentHighlighted && 'text-primary font-semibold',
            )}
            onClick={() => toggleGroup(item.id)}
          >
            <Icon
              className={cn(
                'w-4 h-4 mr-2 shrink-0',
                parentHighlighted ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span className="flex-1 text-left text-sm">{item.label}</span>
            {item.badge != null && item.badge !== '' && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
                  item.badgeColor === 'destructive' && 'bg-destructive text-destructive-foreground',
                  item.badgeColor === 'warning' && 'bg-orange-500 text-white',
                  (!item.badgeColor || item.badgeColor === 'default') && 'bg-muted text-muted-foreground',
                )}
              >
                {item.badge}
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 ml-1 shrink-0 text-primary" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-1 shrink-0 text-muted-foreground" />
            )}
          </Button>
          {isExpanded && (
            <div className="mt-0.5 space-y-0.5 pl-1.5">
              {expandedGroupTopSlot?.[item.id] ? (
                <div className="mb-2 px-0.5">{expandedGroupTopSlot[item.id]}</div>
              ) : null}
              {item.children!.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start h-9 px-2 rounded-lg my-0.5',
            depth > 0 && 'pl-3',
            isLeafActive
              ? 'bg-orange-50 text-primary font-medium hover:bg-orange-50/90 dark:bg-orange-950/35 dark:text-primary dark:hover:bg-orange-950/45'
              : 'text-foreground',
          )}
          onClick={() => onItemClick(item.id)}
        >
          <Icon
            className={cn(
              'w-3.5 h-3.5 mr-2 shrink-0',
              isLeafActive ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="flex-1 text-left text-sm">{item.label}</span>
          {item.badge != null && item.badge !== '' && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-semibold rounded-full',
                item.badgeColor === 'destructive' && 'bg-destructive text-destructive-foreground',
                item.badgeColor === 'warning' && 'bg-orange-500 text-white',
                (!item.badgeColor || item.badgeColor === 'default') && 'bg-muted text-muted-foreground',
              )}
            >
              {item.badge}
            </span>
          )}
        </Button>
      </div>
    );
  };

  return (
    <ScrollArea className="h-full py-2">
      <div className={cn('px-2', collapsed && 'px-1')}>
        {items.map((item) => renderItem(item))}
      </div>
    </ScrollArea>
  );
}
