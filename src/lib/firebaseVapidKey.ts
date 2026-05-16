import { API_BASE } from "@/lib/api";
import { getFirebaseVapidKey } from "@/lib/firebaseWebConfig";

let cachedVapidKey: string | null | undefined;
let inFlight: Promise<string | null> | null = null;

/**
 * VAPID public key for FCM web token registration.
 * Order: `VITE_FIREBASE_VAPID_KEY` → GET `/api/website/firebase-messaging/` → null.
 */
export async function resolveFirebaseVapidKey(): Promise<string | null> {
  const fromEnv = getFirebaseVapidKey();
  if (fromEnv) return fromEnv;

  if (cachedVapidKey !== undefined) return cachedVapidKey;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const base = (API_BASE || "/api").replace(/\/$/, "");
      const res = await fetch(`${base}/website/firebase-messaging/`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        cachedVapidKey = null;
        return null;
      }
      const data = (await res.json()) as { vapid_key?: string };
      const key = (data.vapid_key ?? "").trim();
      cachedVapidKey = key || null;
      return cachedVapidKey;
    } catch {
      cachedVapidKey = null;
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function clearFirebaseVapidKeyCache(): void {
  cachedVapidKey = undefined;
}
