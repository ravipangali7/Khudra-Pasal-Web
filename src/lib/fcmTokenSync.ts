import { authApi, getAuthToken } from "@/lib/api";
import { FCM_LAST_SENT_TOKEN_STORAGE_KEY, getFcmRegistrationToken } from "@/lib/firebaseMessaging";
import { isNativeAppShell } from "@/lib/nativeAppShell";

/** Web → Flutter: request native token delivery into WebView. */
export const FCM_SYNC_REQUEST_EVENT = "khudra-fcm-sync-request";

/** Flutter → Web: native FCM token ready for API registration. */
export const NATIVE_FCM_TOKEN_EVENT = "khudra-native-fcm-token";

const PORTAL_ROOT_RE = /^\/(portal|admin|family-portal|child-portal|vendor)\/?$/;
const DASHBOARD_SUFFIX_RE = /\/dashboard\/?$/;

export function isHomePath(pathname: string): boolean {
  const p = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return p === "/" || p === "/homepage";
}

export function isDashboardPath(pathname: string): boolean {
  const p = (pathname.split("?")[0]?.split("#")[0] ?? pathname).replace(/\/$/, "") || "/";
  if (DASHBOARD_SUFFIX_RE.test(p)) return true;
  return PORTAL_ROOT_RE.test(p);
}

export function shouldForceFcmSyncForPath(pathname: string): boolean {
  return isHomePath(pathname) || isDashboardPath(pathname);
}

export function notifyNativeFcmSync(): void {
  if (typeof window === "undefined" || !isNativeAppShell()) return;
  window.dispatchEvent(new CustomEvent(FCM_SYNC_REQUEST_EVENT));
}

let syncInFlight: Promise<void> | null = null;

export type FcmPlatform = "web" | "android" | "ios";

async function postFcmToken(token: string, platform: FcmPlatform, force: boolean): Promise<void> {
  if (!force) {
    try {
      const prev = localStorage.getItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY) ?? "";
      if (token === prev) return;
    } catch {
      /* ignore */
    }
  }

  await authApi.registerFcmToken({ fcm_token: token, platform });
  try {
    localStorage.setItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

/** Register a token from Flutter native shell (always upserts on server). */
export async function registerNativeFcmToken(token: string): Promise<void> {
  const t = token.trim();
  if (!t || !getAuthToken()) return;
  await postFcmToken(t, "android", true);
}

/**
 * Fetch FCM token (Chrome) or request native delivery (WebView), then POST `/auth/fcm-token/`.
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
    await postFcmToken(token, "web", options?.force === true);
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

export function requestFcmTokenSync(options?: { force?: boolean }): void {
  if (!getAuthToken()) return;
  if (isNativeAppShell()) {
    notifyNativeFcmSync();
    return;
  }
  void syncFcmTokenToBackend(options);
}

/** Listen for native Android token before React mount (idempotent). */
export function bootstrapNativeFcmTokenListener(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __kpNativeFcmListener?: boolean };
  if (w.__kpNativeFcmListener) return;
  w.__kpNativeFcmListener = true;

  window.addEventListener(NATIVE_FCM_TOKEN_EVENT, (ev) => {
    const token = (ev as CustomEvent<{ token?: string }>).detail?.token;
    if (!token) return;
    void registerNativeFcmToken(token);
  });
}
