import type { NavigateFunction } from "react-router-dom";
import { getAuthToken, getLoginSurface, portalApi } from "@/lib/api";
import { buildAdminModulePath } from "@/pages/admin/moduleRegistry";
import { buildVendorModulePath } from "@/pages/vendor/moduleRegistry";
import { portalProfileHrefForRole } from "@/lib/portalNavigation";

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

/** When already under a portal shell, profile lives on the same base path. */
export function customerPortalProfileFromPathname(pathname: string): string | null {
  if (pathname.startsWith("/family-portal")) return "/family-portal/profile";
  if (pathname.startsWith("/child-portal")) return "/child-portal/profile";
  if (pathname.startsWith("/portal")) return "/portal/profile";
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
