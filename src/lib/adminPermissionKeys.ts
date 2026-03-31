/**
 * Admin nav permission keys (aligned with server nav_seed + Role.permissions / admin_access).
 * Parent keys grant access to their subtree in the admin sidebar.
 */
export const ADMIN_ROLE_PERMISSION_KEYS: readonly [string, string][] = [
  ['dashboard', 'Dashboard'],
  ['pos', 'POS'],
  ['catalog', 'Catalog'],
  ['products', 'Products'],
  ['po-billing', 'PO & Billing'],
  ['orders', 'Orders'],
  ['marketing', 'Marketing'],
  ['cms', 'CMS'],
  ['finance', 'Finance'],
  ['users', 'Users'],
  ['employees', 'Employees & roles'],
  ['delivery', 'Delivery'],
  ['families', 'Families'],
  ['wallet-master', 'Wallet'],
  ['support-tickets', 'Support tickets'],
  ['security', 'Security'],
  ['reports', 'Reports'],
  ['reels-admin', 'KhudraReels'],
  ['shipping', 'Shipping'],
  ['settings', 'Settings'],
  ['sellers', 'Sellers / vendors'],
];

/** Map legacy permission keys from DB to current nav keys. */
export function normalizeRolePermissions(
  raw: Record<string, unknown> | undefined,
): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const tmp: Record<string, unknown> = { ...raw };
  if ('vendors' in tmp) {
    const v = Boolean(tmp.vendors);
    tmp.sellers = Boolean(tmp.sellers) || v;
    delete tmp.vendors;
  }
  if ('wallet' in tmp) {
    const w = Boolean(tmp.wallet);
    tmp['wallet-master'] = Boolean(tmp['wallet-master']) || w;
    delete tmp.wallet;
  }
  return Object.fromEntries(
    Object.entries(tmp).map(([k, v]) => [k, Boolean(v)]),
  ) as Record<string, boolean>;
}
