import type { SidebarItem } from '@/components/admin/AdminSidebar';
import { BookText, PackagePlus, Truck, Warehouse } from 'lucide-react';

/** Sidebar keys removed from `nav_seed` but possibly still in DB until `seed_navigation` runs. */
const HIDDEN_ADMIN_NAV_IDS = new Set([
  'delivery',
  'wallet-loyalty',
  'wallet-flagged',
  'security',
  'flags',
  'shipping-methods',
  'shipping-calculator',
]);

function stripHiddenAdminNav(nodes: SidebarItem[]): SidebarItem[] {
  return nodes
    .filter((n) => !HIDDEN_ADMIN_NAV_IDS.has(n.id))
    .map((n) => ({
      ...n,
      children: n.children?.length ? stripHiddenAdminNav(n.children) : undefined,
    }));
}

/** Canonical Inventory group — matches vendor portal (`nav_seed` VENDOR_NAV / ADMIN_NAV). */
export const ADMIN_INVENTORY_SIDEBAR_GROUP: SidebarItem = {
  id: 'inventory',
  label: 'Inventory',
  icon: Warehouse,
  children: [
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'stock-purchases', label: 'Stock purchases', icon: PackagePlus },
    { id: 'ledger', label: 'Ledger', icon: BookText },
  ],
};

function cloneInventoryGroup(): SidebarItem {
  return {
    ...ADMIN_INVENTORY_SIDEBAR_GROUP,
    children: ADMIN_INVENTORY_SIDEBAR_GROUP.children!.map((c) => ({ ...c })),
  };
}

function isLegacyPurchaseSection(item: SidebarItem): boolean {
  const id = item.id.toLowerCase();
  if (id === 'purchase' || id === 'purchase-insights' || id === 'purchase_insights') return true;
  const lab = item.label.trim().toLowerCase();
  if (lab === 'purchase' && (item.children?.length ?? 0) > 0) return true;
  if (lab === 'purchase insights') return true;
  return false;
}

function mergeInventoryChildren(node: SidebarItem): SidebarItem {
  const canon = cloneInventoryGroup();
  const byId = new Map((node.children ?? []).map((c) => [c.id, c]));
  const mergedChildren = canon.children!.map((c) => {
    const existing = byId.get(c.id);
    if (!existing) return c;
    return { ...c, ...existing, icon: c.icon, label: c.label };
  });
  return { ...node, ...canon, children: mergedChildren };
}

function dedupeInventoryTopLevel(nodes: SidebarItem[]): SidebarItem[] {
  let seen = false;
  return nodes.filter((n) => {
    if (n.id !== 'inventory') return true;
    if (seen) return false;
    seen = true;
    return true;
  });
}

function normalizeTree(nodes: SidebarItem[]): SidebarItem[] {
  const out: SidebarItem[] = [];
  for (const node of nodes) {
    if (isLegacyPurchaseSection(node)) {
      out.push(cloneInventoryGroup());
      continue;
    }
    const next: SidebarItem = {
      ...node,
      children: node.children?.length ? normalizeTree(node.children) : undefined,
    };
    if (next.id === 'inventory' && next.children?.length) {
      out.push(mergeInventoryChildren(next));
    } else {
      out.push(next);
    }
  }
  return dedupeInventoryTopLevel(out);
}

/** Rewrites legacy “Purchase” (and related) nav to the same Inventory tree as the vendor portal. */
export function normalizeAdminSidebarItems(items: SidebarItem[]): SidebarItem[] {
  if (!items.length) return items;
  return stripHiddenAdminNav(normalizeTree(items));
}
