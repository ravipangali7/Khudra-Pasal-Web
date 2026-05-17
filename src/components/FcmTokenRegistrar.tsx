import { useEffect, useRef, type MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { FCM_LAST_SENT_TOKEN_STORAGE_KEY, getFcmRegistrationToken } from "@/lib/firebaseMessaging";

const VISIBILITY_RESYNC_MS = 400;
const FCM_SYNC_RETRY_MS = [0, 2_500, 8_000];

/** Sync when authenticated except on auth entry pages (no session yet). */
function shouldSyncFcmForPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/signup" || pathname === "/admin/login") return false;
  return true;
}

function hasRegisteredFcmToken(): boolean {
  try {
    return Boolean(localStorage.getItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY));
  } catch {
    return false;
  }
}

async function syncFcmIfNeeded(busyRef: MutableRefObject<boolean>): Promise<void> {
  if (busyRef.current) return;
  busyRef.current = true;
  try {
    const token = await getFcmRegistrationToken();
    if (!token) return;
    let prev = "";
    try {
      prev = localStorage.getItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY) ?? "";
    } catch {
      /* ignore */
    }
    if (token === prev) return;
    await authApi.registerFcmToken({ fcm_token: token });
    try {
      localStorage.setItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  } catch {
    /* permission denied, network, etc. */
  } finally {
    busyRef.current = false;
  }
}

async function syncFcmWithRetries(busyRef: MutableRefObject<boolean>): Promise<void> {
  for (let i = 0; i < FCM_SYNC_RETRY_MS.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, FCM_SYNC_RETRY_MS[i]));
    if (!getAuthToken() || !shouldSyncFcmForPath(window.location.pathname)) return;
    await syncFcmIfNeeded(busyRef);
    if (hasRegisteredFcmToken()) return;
  }
}

/**
 * When the user is signed in, registers the FCM web token with the API (deduped).
 * Re-syncs on route change, auth change, and when the tab becomes visible (token rotation / permission edge cases).
 */
export default function FcmTokenRegistrar() {
  const location = useLocation();
  const busyRef = useRef(false);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!getAuthToken() || !shouldSyncFcmForPath(location.pathname)) return;
    void syncFcmWithRetries(busyRef);
  }, [location.pathname]);

  useEffect(() => {
    const onAuth = () => {
      if (!getAuthToken() || !shouldSyncFcmForPath(window.location.pathname)) return;
      void syncFcmWithRetries(busyRef);
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
        void syncFcmWithRetries(busyRef);
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
