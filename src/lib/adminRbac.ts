import type { UserRole } from "@/contexts/AuthContext";
import type { SidebarItem } from "@/components/admin/AdminSidebar";

function filterNav(
  items: SidebarItem[],
  allowed: Set<string>
): SidebarItem[] {
  const out: SidebarItem[] = [];
  for (const item of items) {
    const kids = item.children ? filterNav(item.children, allowed) : undefined;
    const keepSelf = allowed.has(item.id);
    if (kids?.length || keepSelf) {
      out.push({
        ...item,
        ...(kids?.length ? { children: kids } : {}),
      });
    }
  }
  return out;
}

/** Filter admin sidebar by `User.role` from API. */
export function filterSidebarForRole(
  role: UserRole | undefined,
  items: SidebarItem[]
): SidebarItem[] {
  if (!role || role === "super_admin") return items;
  if (role === "staff") return items;

  if (role === "viewer") {
    return filterNav(
      items,
      new Set(["dashboard", "orders", "orders-all", "reports"])
    );
  }

  if (role === "finance") {
    return filterNav(
      items,
      new Set([
        "dashboard",
        "orders",
        "orders-all",
        "finance",
        "transactions",
        "refunds",
        "withdrawals",
      ])
    );
  }

  if (role === "moderator") {
    return filterNav(
      items,
      new Set([
        "dashboard",
        "products",
        "all-products",
        "product-approvals",
        "reviews",
        "reels-admin",
        "orders",
        "orders-all",
        "catalog",
        "categories",
      ])
    );
  }

  /* normal / parent / child — should not reach admin; show minimal */
  return filterNav(items, new Set(["dashboard"]));
}
