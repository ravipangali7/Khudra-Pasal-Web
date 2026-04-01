import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SidebarItem } from "@/components/portal/PortalSidebar";

/** Default dashboard URL for a portal user from `/portal/me/` `role` (parent / child / normal). */
export function portalDashboardHrefForRole(role: string | undefined): string {
  if (role === "parent") return "/family-portal/dashboard";
  if (role === "child") return "/child-portal/dashboard";
  return "/portal/dashboard";
}

/** Find a sidebar node by its route id (API `id` / nav `key`). */
export function findSidebarNodeById(
  items: SidebarItem[],
  id: string,
): SidebarItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const found = findSidebarNodeById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Resolve which registered view to render: prefer API `viewKey`, else node id, else URL segment.
 */
export function resolvePortalNavViewKey(
  node: SidebarItem | null,
  fallbackSegmentId: string,
): string {
  const vk = node?.viewKey?.trim();
  if (vk) return vk;
  return node?.id ?? fallbackSegmentId;
}

/** Collect all sidebar item ids including nested children. */
export function flattenSidebarIds(items: SidebarItem[]): Set<string> {
  const s = new Set<string>();
  const walk = (list: SidebarItem[]) => {
    for (const i of list) {
      s.add(i.id);
      if (i.children?.length) walk(i.children);
    }
  };
  walk(items);
  return s;
}

/**
 * URL segment after base path (e.g. `/portal/wallet` → `wallet`).
 * Derives active section from React Router location for portal deep links and back/forward.
 */
export function usePortalSectionPath(basePath: string, sidebarItems: SidebarItem[], defaultId = "dashboard") {
  const location = useLocation();
  const navigate = useNavigate();

  const segment = useMemo(() => {
    const prefix = basePath.replace(/\/$/, "");
    let rest = location.pathname.startsWith(prefix + "/")
      ? location.pathname.slice(prefix.length + 1)
      : location.pathname === prefix
        ? ""
        : "";
    rest = rest.split("/")[0] ?? "";
    return rest || defaultId;
  }, [location.pathname, basePath, defaultId]);

  const validIds = useMemo(() => flattenSidebarIds(sidebarItems), [sidebarItems]);

  const goTo = (id: string) => {
    const prefix = basePath.replace(/\/$/, "");
    navigate(`${prefix}/${id}`);
  };

  /** When nav is loaded, unknown paths should redirect (handled by caller with `<Navigate />`). */
  const isSegmentKnown = validIds.size === 0 || validIds.has(segment);

  return { segment, goTo, navigate, validIds, isSegmentKnown };
}
