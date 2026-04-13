import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, ChevronLeft, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SidebarItem {
  id: string;
  /** Stable identifier returned from backend navigation. */
  viewKey?: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  children?: SidebarItem[];
}

interface PortalSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  title?: string;
  collapsible?: boolean;
  className?: string;
  /**
   * Messenger-style super admin card under Support / Help nav ids.
   * Shown below a leaf item, or at the top of an expanded group (e.g. vendor Support → tickets).
   */
  supportContact?: { forItemIds: string[]; children: ReactNode };
}

function subtreeHasActiveItem(node: SidebarItem, activeId: string): boolean {
  if (!node.children?.length) return false;
  return node.children.some(
    (c) => c.id === activeId || subtreeHasActiveItem(c, activeId),
  );
}

const PortalSidebar = ({
  items,
  activeItem,
  onItemClick,
  title,
  collapsible = true,
  className,
  supportContact,
}: PortalSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  /** Ids of every item on the path to `activeItem` that has children (keeps submenus open for nested routes). */
  const requiredExpandedIds = useMemo(() => {
    const findPath = (list: SidebarItem[], acc: SidebarItem[]): SidebarItem[] | null => {
      for (const item of list) {
        if (item.id === activeItem) return [...acc, item];
        if (item.children?.length) {
          const p = findPath(item.children, [...acc, item]);
          if (p) return p;
        }
      }
      return null;
    };
    const path = findPath(items, []);
    if (!path?.length) return [];
    const ids: string[] = [];
    for (const node of path) {
      if (node.children?.length) ids.push(node.id);
    }
    return ids;
  }, [items, activeItem]);

  // Merge required ancestors on navigate; only toggleGroup removes ids (explicit collapse).
  useEffect(() => {
    if (collapsed) return;
    setExpandedGroups((prev) => [...new Set([...prev, ...requiredExpandedIds])]);
  }, [collapsed, requiredExpandedIds]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const showHeaderRow = collapsible || Boolean(title?.trim());

  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col h-full",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {showHeaderRow ? (
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!collapsed && title && (
            <h2 className="font-semibold text-foreground truncate">{title}</h2>
          )}
          {collapsible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>
      ) : null}

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2 min-h-0">
        <nav className="space-y-1">
          {items.map((item) => {
            const descendantActive = subtreeHasActiveItem(item, activeItem);
            const parentRowActive = activeItem === item.id || descendantActive;
            const contactIds = supportContact?.forItemIds ?? [];
            const showContactLeaf =
              Boolean(supportContact) && contactIds.includes(item.id) && !item.children?.length;
            const showContactGroup =
              Boolean(supportContact) && contactIds.includes(item.id) && Boolean(item.children?.length);
            return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.children) {
                    toggleGroup(item.id);
                  } else {
                    onItemClick(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group",
                  parentRowActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 shrink-0",
                  parentRowActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                    {item.children && (
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        expandedGroups.includes(item.id) && "rotate-90"
                      )} />
                    )}
                  </>
                )}
              </button>

              {!collapsed && showContactLeaf ? (
                <div className="mt-2 mb-1 px-1">{supportContact!.children}</div>
              ) : null}

              {/* Children */}
              {!collapsed && item.children && expandedGroups.includes(item.id) && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  {showContactGroup ? (
                    <div className="mb-2 -ml-1 pr-1">{supportContact!.children}</div>
                  ) : null}
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onItemClick(child.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                        activeItem === child.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <child.icon className="w-4 h-4" />
                      <span className="truncate">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
};

export default PortalSidebar;
