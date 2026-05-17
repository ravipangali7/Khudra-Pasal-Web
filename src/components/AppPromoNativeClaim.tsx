import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { readAppPromoVisitToken } from "@/lib/appPromotionBanner";
import { useNativeAppShell } from "@/hooks/useNativeAppShell";

/** In the Flutter WebView, claim app install for banner first-order discount after sign-in. */
export default function AppPromoNativeClaim() {
  const inNativeApp = useNativeAppShell();
  const location = useLocation();
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!inNativeApp || claimedRef.current) return;
    if (!getAuthToken()) return;
    if (
      location.pathname === "/login" ||
      location.pathname === "/signup" ||
      location.pathname.startsWith("/admin")
    ) {
      return;
    }
    claimedRef.current = true;
    const token = readAppPromoVisitToken();
    void authApi.claimAppPromotionInstall(token || undefined).catch(() => {
      claimedRef.current = false;
    });
  }, [inNativeApp, location.pathname]);

  return null;
}
