import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

import type { ApiNavNode } from "@/lib/api";
import type { SidebarItem as AdminSidebarItem } from "@/components/admin/AdminSidebar";
import type { SidebarItem as PortalSidebarItem } from "@/components/portal/PortalSidebar";

/** Resolve Lucide icon name from API navigation (PascalCase export name). */
export function navIcon(name: string): LucideIcon {
  const Icon = (Icons as unknown as Record<string, LucideIcon | undefined>)[name];
  return Icon ?? Icons.Circle;
}

export function mapApiNavToAdminItems(nodes: ApiNavNode[] | undefined): AdminSidebarItem[] {
  if (!nodes?.length) return [];
  const mapOne = (n: ApiNavNode): AdminSidebarItem => ({
    id: n.id,
    label: n.label,
    icon: navIcon(n.icon),
    badge: n.badge,
    badgeColor: n.badge ? "warning" : undefined,
    children: n.children?.length ? n.children.map(mapOne) : undefined,
  });
  return nodes.map(mapOne);
}

export function mapApiNavToPortalItems(nodes: ApiNavNode[] | undefined): PortalSidebarItem[] {
  if (!nodes?.length) return [];
  const mapOne = (n: ApiNavNode): PortalSidebarItem => ({
    id: n.id,
    viewKey: n.viewKey,
    label: n.label,
    icon: navIcon(n.icon),
    badge: n.badge,
    children: n.children?.length ? n.children.map(mapOne) : undefined,
  });
  return nodes.map(mapOne);
}
