import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { getFirebaseVapidKey, getFirebaseWebConfig } from "@/lib/firebaseWebConfig";

let appInstance: FirebaseApp | null = null;

/** localStorage key for deduping POST /auth/fcm-token/; cleared on logout so a new user re-registers the same device token. */
export const FCM_LAST_SENT_TOKEN_STORAGE_KEY = "khudrapasal_last_sent_fcm_token";

export function clearFcmTokenRegistrationDedup(): void {
  try {
    localStorage.removeItem(FCM_LAST_SENT_TOKEN_STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}

function getOrInitApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (appInstance) return appInstance;
  const config = getFirebaseWebConfig();
  if (!config.apiKey) return null;
  appInstance = getApps().length ? getApps()[0]! : initializeApp(config);
  return appInstance;
}

export type ForegroundPushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Subscribes to FCM messages while the app is in the foreground. Returns an unsubscribe function.
 * Background display is handled by `public/firebase-messaging-sw.js`.
 */
export function subscribeForegroundPushNotifications(
  onPayload: (payload: ForegroundPushPayload) => void,
): () => void {
  let unsub: (() => void) | undefined;
  let cancelled = false;
  void (async () => {
    if (typeof window === "undefined") return;
    const supported = await isSupported().catch(() => false);
    if (!supported || cancelled) return;
    const app = getOrInitApp();
    if (!app || cancelled) return;
    let messaging: Messaging;
    try {
      messaging = getMessaging(app);
    } catch {
      return;
    }
    if (cancelled) return;
    unsub = onMessage(messaging, (payload) => {
      const title =
        (payload.notification?.title ??
          (typeof payload.data?.title === "string" ? payload.data.title : "")) ||
        "Khudra Pasal";
      const body =
        (payload.notification?.body ??
          (typeof payload.data?.body === "string" ? payload.data.body : "")) || "";
      onPayload({ title, body, data: payload.data as Record<string, string> | undefined });
    });
  })();
  return () => {
    cancelled = true;
    unsub?.();
  };
}

export async function getFcmRegistrationToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const vapidKey = getFirebaseVapidKey();
  if (!vapidKey) return null;

  const app = getOrInitApp();
  if (!app) return null;

  let messaging: Messaging;
  try {
    messaging = getMessaging(app);
  } catch {
    return null;
  }

  if (Notification.permission === "denied") return null;

  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token || null;
  } catch {
    return null;
  }
}
