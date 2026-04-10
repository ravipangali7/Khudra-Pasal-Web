import type { NavigateFunction } from "react-router-dom";
import { getAuthToken, getLoginSurface, portalApi } from "@/lib/api";
import { buildAdminModulePath } from "@/pages/admin/moduleRegistry";
import { buildVendorModulePath } from "@/pages/vendor/moduleRegistry";
import {
  portalOrdersHrefForRole,
  portalProfileHrefForRole,
  portalWalletHrefForRole,
} from "@/lib/portalNavigation";

/** Routes that represent “profile” for bottom-nav active state. */
export function isMobileProfileShellRoute(pathname: string): boolean {
  if (pathname === "/signup") return true;
  if (pathname.startsWith("/portal/profile")) return true;
  if (pathname.startsWith("/family-portal/profile")) return true;
  if (pathname.startsWith("/child-portal/profile")) return true;
  if (pathname.startsWith("/admin/account-profile")) return true;
  if (/^\/vendor\/store(\/|$)/.test(pathname)) return true;
  return false;
}

/** Bottom-nav “Wallet” active state (customer / family / child / vendor / admin). */
export function isMobileWalletShellRoute(pathname: string): boolean {
  if (pathname.startsWith("/portal/wallet")) return true;
  if (pathname === "/portal/kyc") return true;
  if (pathname.startsWith("/family-portal/wallets")) return true;
  if (pathname === "/child-portal/wallet" || pathname.startsWith("/child-portal/wallet-")) return true;
  if (pathname.startsWith("/admin/wallet")) return true;
  if (
    /^\/vendor\/(wallet|earnings|payout-accounts|withdrawals|transactions)(\/|$)/.test(pathname)
  ) {
    return true;
  }
  return false;
}

/** Bottom-nav “Orders” active state. */
export function isMobileOrdersShellRoute(pathname: string): boolean {
  if (pathname.startsWith("/portal/orders")) return true;
  if (pathname.startsWith("/family-portal/my-orders")) return true;
  if (pathname.startsWith("/child-portal/my-orders")) return true;
  if (pathname.startsWith("/admin/orders")) return true;
  if (/^\/vendor\/(all-orders|pending|returns)(\/|$)/.test(pathname)) return true;
  return false;
}

/** When already under a portal shell, profile lives on the same base path. */
export function customerPortalProfileFromPathname(pathname: string): string | null {
  if (pathname.startsWith("/family-portal")) return "/family-portal/profile";
  if (pathname.startsWith("/child-portal")) return "/child-portal/profile";
  if (pathname.startsWith("/portal")) return "/portal/profile";
  return null;
}

function customerPortalWalletFromPathname(pathname: string): string | null {
  if (pathname.startsWith("/family-portal")) return "/family-portal/wallets-overview";
  if (pathname.startsWith("/child-portal")) return "/child-portal/wallet";
  if (pathname.startsWith("/portal")) return "/portal/wallet";
  return null;
}

function customerPortalOrdersFromPathname(pathname: string): string | null {
  if (pathname.startsWith("/family-portal")) return "/family-portal/my-orders";
  if (pathname.startsWith("/child-portal")) return "/child-portal/my-orders";
  if (pathname.startsWith("/portal")) return "/portal/orders";
  return null;
}

/**
 * Mobile footer / reels footer: signup when logged out; otherwise the correct profile surface
 * (customer / family / child / admin / vendor).
 */
export async function navigateToMobileProfile(
  navigate: NavigateFunction,
  pathname: string,
): Promise<void> {
  if (!getAuthToken()) {
    navigate("/signup");
    return;
  }

  const inPortalShell = customerPortalProfileFromPathname(pathname);
  if (inPortalShell) {
    navigate(inPortalShell);
    return;
  }

  if (pathname.startsWith("/admin")) {
    navigate(buildAdminModulePath("account-profile"));
    return;
  }
  if (pathname.startsWith("/vendor")) {
    navigate(buildVendorModulePath("store"));
    return;
  }

  const surface = getLoginSurface();
  if (surface === "admin") {
    navigate(buildAdminModulePath("account-profile"));
    return;
  }
  if (surface === "vendor") {
    navigate(buildVendorModulePath("store"));
    return;
  }

  try {
    const me = await portalApi.me();
    navigate(portalProfileHrefForRole(me.role));
  } catch {
    navigate("/portal/profile");
  }
}

/**
 * Mobile bottom nav Wallet: logged out → customer portal login; logged in → wallet for current surface.
 */
export async function navigateToMobileWallet(
  navigate: NavigateFunction,
  pathname: string,
): Promise<void> {
  if (!getAuthToken()) {
    navigate("/portal/wallet");
    return;
  }

  const inPortalShell = customerPortalWalletFromPathname(pathname);
  if (inPortalShell) {
    navigate(inPortalShell);
    return;
  }

  if (pathname.startsWith("/admin")) {
    navigate(buildAdminModulePath("wallet-master"));
    return;
  }
  if (pathname.startsWith("/vendor")) {
    navigate(buildVendorModulePath("wallet"));
    return;
  }

  const surface = getLoginSurface();
  if (surface === "admin") {
    navigate(buildAdminModulePath("wallet-master"));
    return;
  }
  if (surface === "vendor") {
    navigate(buildVendorModulePath("wallet"));
    return;
  }

  try {
    const me = await portalApi.me();
    navigate(portalWalletHrefForRole(me.role));
  } catch {
    navigate("/portal/wallet");
  }
}

/**
 * Mobile bottom nav Orders: logged out → customer portal login; logged in → orders for current surface.
 */
export async function navigateToMobileOrders(
  navigate: NavigateFunction,
  pathname: string,
): Promise<void> {
  if (!getAuthToken()) {
    navigate("/portal/orders");
    return;
  }

  const inPortalShell = customerPortalOrdersFromPathname(pathname);
  if (inPortalShell) {
    navigate(inPortalShell);
    return;
  }

  if (pathname.startsWith("/admin")) {
    navigate(buildAdminModulePath("orders-all"));
    return;
  }
  if (pathname.startsWith("/vendor")) {
    navigate(buildVendorModulePath("all-orders"));
    return;
  }

  const surface = getLoginSurface();
  if (surface === "admin") {
    navigate(buildAdminModulePath("orders-all"));
    return;
  }
  if (surface === "vendor") {
    navigate(buildVendorModulePath("all-orders"));
    return;
  }

  try {
    const me = await portalApi.me();
    navigate(portalOrdersHrefForRole(me.role));
  } catch {
    navigate("/portal/orders");
  }
}
