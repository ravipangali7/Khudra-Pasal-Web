import type { ReactNode } from "react";

/** Backend `view_key` / API `viewKey` values for the family portal surface (see `nav_seed` / migration). */
export const FAMILY_PORTAL_VIEW_KEYS = [
  "dashboard",
  "members",
  "members-requests",
  "product-approval-requests",
  "wallets",
  "wallets-payout",
  "wallets-withdraw",
  "spending-limits",
  "product-restrictions",
  "auto-approval",
  "history",
  "kyc",
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
  productApprovalRequests: () => ReactNode;
  wallets: () => ReactNode;
  walletsPayout: () => ReactNode;
  walletsWithdraw: () => ReactNode;
  spendingLimits: () => ReactNode;
  productRestrictions: () => ReactNode;
  autoApproval: () => ReactNode;
  history: () => ReactNode;
  kyc: () => ReactNode;
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
    "product-approval-requests": f.productApprovalRequests,
    wallets: f.wallets,
    "wallets-payout": f.walletsPayout,
    "wallets-withdraw": f.walletsWithdraw,
    "spending-limits": f.spendingLimits,
    "product-restrictions": f.productRestrictions,
    "auto-approval": f.autoApproval,
    history: f.history,
    kyc: f.kyc,
    products: f.products,
    "my-orders": f.myOrders,
    profile: f.profile,
    support: f.support,
  };
}
