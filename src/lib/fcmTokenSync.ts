import { authApi, getAuthToken } from "@/lib/api";
import { FCM_LAST_SENT_TOKEN_STORAGE_KEY, getFcmRegistrationToken } from "@/lib/firebaseMessaging";
import { isNativeAppShell } from "@/lib/nativeAppShell";

/** Web → Flutter Android: native FCM POST when JS messaging is unavailable in WebView. */
export const FCM_SYNC_REQUEST_EVENT = "khudra-fcm-sync-request";

const PORTAL_ROOT_RE = /^\/(portal|admin|family-portal|child-portal|vendor)\/?$/;
const DASHBOARD_SUFFIX_RE = /\/dashboard\/?$/;

export function isHomePath(pathname: string): boolean {
  const p = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return p === "/" || p === "/homepage";
}

/** Any account dashboard (customer, family, child, vendor, admin). */
export function isDashboardPath(pathname: string): boolean {
  const p = (pathname.split("?")[0]?.split("#")[0] ?? pathname).replace(/\/$/, "") || "/";
  if (DASHBOARD_SUFFIX_RE.test(p)) return true;
  return PORTAL_ROOT_RE.test(p);
}

/** Login success, home, or a dashboard — always re-POST so the current user owns the device token. */
export function shouldForceFcmSyncForPath(pathname: string): boolean {
  return isHomePath(pathname) || isDashboardPath(pathname);
}

export function notifyNativeFcmSync(): void {
  if (typeof window === "undefined" || !isNativeAppShell()) return;
  window.dispatchEvent(new CustomEvent(FCM_SYNC_REQUEST_EVENT));
}

let syncInFlight: Promise<void> | null = null;

/**
 * Fetch FCM token (browser) or ping native shell, then POST `/auth/fcm-token/` for the signed-in user.
 */
export async function syncFcmTokenToBackend(options?: { force?: boolean }): Promise<void> {
  if (typeof window === "undefined" || !getAuthToken()) return;

  if (isNativeAppShell()) {
    notifyNativeFcmSync();
    return;
  }

  if (syncInFlight) {
    await syncInFlight.catch(() => undefined);
    return;
  }

  const run = async () => {
    const token = await getFcmRegistrationToken();
    if (!token) return;

    const force = options?.force === true;
    if (!force) {
      try {
        const prev = localStorage.getItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY) ?? "";
        if (token === prev) return;
      } catch {
        /* ignore */
      }
    }

    await authApi.registerFcmToken({ fcm_token: token });
    try {
      localStorage.setItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  };

  syncInFlight = run();
  try {
    await syncInFlight;
  } catch {
    /* permission denied, network, etc. */
  } finally {
    syncInFlight = null;
  }
}

/** Entry point for registrars and auth hooks. */
export function requestFcmTokenSync(options?: { force?: boolean }): void {
  if (!getAuthToken()) return;
  if (isNativeAppShell()) {
    notifyNativeFcmSync();
    return;
  }
  void syncFcmTokenToBackend(options);
}
