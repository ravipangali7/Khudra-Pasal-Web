import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseVapidKey, getFirebaseWebConfig } from "@/lib/firebaseWebConfig";

let appInstance: FirebaseApp | null = null;

function getOrInitApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (appInstance) return appInstance;
  const config = getFirebaseWebConfig();
  if (!config.apiKey) return null;
  appInstance = getApps().length ? getApps()[0]! : initializeApp(config);
  return appInstance;
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
