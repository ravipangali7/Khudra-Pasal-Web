import type { ReactNode } from "react";

/** Backend `view_key` / API `viewKey` values for the family portal surface (see `nav_seed` / migration). */
export const FAMILY_PORTAL_VIEW_KEYS = [
  "dashboard",
  "members",
  "members-requests",
  "wallets",
  "spending-limits",
  "product-restrictions",
  "auto-approval",
  "history",
  "products",
  "my-orders",
  "profile",
  "support",
] as const;

export type FamilyPortalViewKey = (typeof FAMILY_PORTAL_VIEW_KEYS)[number];

export type FamilyPortalViewRenderFns = {
  dashboard: () => ReactNode;
  members: () => ReactNode;
  membersRequests: () => ReactNode;
  wallets: () => ReactNode;
  spendingLimits: () => ReactNode;
  productRestrictions: () => ReactNode;
  autoApproval: () => ReactNode;
  history: () => ReactNode;
  products: () => ReactNode;
  myOrders: () => ReactNode;
  profile: () => ReactNode;
  support: () => ReactNode;
};

/** Single map from `viewKey` → renderer; driven by navigation API, not URL id aliases. */
export function createFamilyPortalViewRegistry(
  f: FamilyPortalViewRenderFns,
): Record<string, () => ReactNode> {
  return {
    dashboard: f.dashboard,
    members: f.members,
    "members-requests": f.membersRequests,
    wallets: f.wallets,
    "spending-limits": f.spendingLimits,
    "product-restrictions": f.productRestrictions,
    "auto-approval": f.autoApproval,
    history: f.history,
    products: f.products,
    "my-orders": f.myOrders,
    profile: f.profile,
    support: f.support,
  };
}
