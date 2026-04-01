import type { SidebarItem } from '@/components/portal/PortalSidebar';
import {
  Heart,
  HelpCircle,
  LayoutDashboard,
  Package,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  User,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';

export type CustomerPortalUserRole = 'normal' | 'parent' | 'child';

/**
 * Default customer portal menu when `/portal/navigation/` returns no items
 * (e.g. DB not seeded). Mirrors server `PORTAL_MAIN_NAV` / nav_seed.
 */
export function getCustomerPortalSidebarFallback(role: CustomerPortalUserRole): SidebarItem[] {
  const head: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  ];
  const parentOnly: SidebarItem[] =
    role === 'parent'
      ? [
          { id: 'child-accounts', label: 'Child Accounts', icon: Users },
          { id: 'family-wallet', label: 'Family Wallet', icon: UsersRound },
        ]
      : [];
  const tail: SidebarItem[] = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'switch-portal', label: 'Switch Portal', icon: RefreshCcw },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];
  return [...head, ...parentOnly, ...tail];
}
