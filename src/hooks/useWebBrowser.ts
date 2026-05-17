import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useNativeAppShell } from "@/hooks/useNativeAppShell";

const ADMIN_PREFIX = "/admin";
const VENDOR_PREFIX = "/vendor";

/** True when running in a normal browser (not the Flutter in-app WebView). */
export function useWebBrowser(): boolean {
  const inNativeApp = useNativeAppShell();
  return !inNativeApp;
}

/**
 * Web-only marketing chrome (download banner, future promos).
 * Off in the native shell and on staff/vendor dashboards.
 */
export function useWebPromotionsEnabled(): boolean {
  const isWeb = useWebBrowser();
  const { pathname } = useLocation();

  return useMemo(() => {
    if (!isWeb) return false;
    if (pathname.startsWith(ADMIN_PREFIX)) return false;
    if (pathname.startsWith(VENDOR_PREFIX)) return false;
    return true;
  }, [isWeb, pathname]);
}
