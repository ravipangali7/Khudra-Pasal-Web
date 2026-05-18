import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getAuthToken } from "@/lib/api";
import {
  requestFcmTokenSync,
  shouldForceFcmSyncForPath,
} from "@/lib/fcmTokenSync";

const VISIBILITY_RESYNC_MS = 400;

/** Skip token fetch on auth entry pages when there is no session yet. */
function shouldSyncFcmForPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/signup" || pathname === "/admin/login") {
    return false;
  }
  return true;
}

/**
 * Registers FCM with the API when signed in.
 * Instant forced sync on login (auth change), home, and any account dashboard.
 * Re-syncs on route change and when the tab becomes visible (token rotation).
 */
export default function FcmTokenRegistrar() {
  const location = useLocation();
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!getAuthToken() || !shouldSyncFcmForPath(location.pathname)) return;
    requestFcmTokenSync({ force: shouldForceFcmSyncForPath(location.pathname) });
  }, [location.pathname]);

  useEffect(() => {
    const onAuth = () => {
      if (!getAuthToken()) return;
      requestFcmTokenSync({ force: true });
    };
    window.addEventListener("khudra-auth-changed", onAuth);
    return () => window.removeEventListener("khudra-auth-changed", onAuth);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!getAuthToken() || !shouldSyncFcmForPath(window.location.pathname)) return;
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = setTimeout(() => {
        visibilityTimerRef.current = null;
        const path = window.location.pathname;
        requestFcmTokenSync({ force: shouldForceFcmSyncForPath(path) });
      }, VISIBILITY_RESYNC_MS);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
  }, []);

  return null;
}
