/**
 * Firebase web app config. Prefer VITE_* env vars; defaults match the Khudra Pasal project.
 * If you change env values, update `public/firebase-messaging-sw.js` to the same project.
 */
const DEFAULT_FIREBASE_WEB_CONFIG = {
  apiKey: "AIzaSyBmIqwM-aO3TBwjD4Fr-9s7VNJ57xs9oG8",
  authDomain: "khudra-pasal-f0cc3.firebaseapp.com",
  projectId: "khudra-pasal-f0cc3",
  storageBucket: "khudra-pasal-f0cc3.firebasestorage.app",
  messagingSenderId: "1079145523329",
  appId: "1:1079145523329:web:081e89b0f22e805afb0580",
  measurementId: "G-SCF006FTLB",
} as const;

function envStr(key: string): string {
  const v = import.meta.env[key as keyof ImportMetaEnv];
  return typeof v === "string" ? v.trim() : "";
}

export function getFirebaseWebConfig(): Record<string, string> {
  const apiKey = envStr("VITE_FIREBASE_API_KEY");
  if (apiKey) {
    return {
      apiKey,
      authDomain: envStr("VITE_FIREBASE_AUTH_DOMAIN") || DEFAULT_FIREBASE_WEB_CONFIG.authDomain,
      projectId: envStr("VITE_FIREBASE_PROJECT_ID") || DEFAULT_FIREBASE_WEB_CONFIG.projectId,
      storageBucket: envStr("VITE_FIREBASE_STORAGE_BUCKET") || DEFAULT_FIREBASE_WEB_CONFIG.storageBucket,
      messagingSenderId:
        envStr("VITE_FIREBASE_MESSAGING_SENDER_ID") || DEFAULT_FIREBASE_WEB_CONFIG.messagingSenderId,
      appId: envStr("VITE_FIREBASE_APP_ID") || DEFAULT_FIREBASE_WEB_CONFIG.appId,
      measurementId: envStr("VITE_FIREBASE_MEASUREMENT_ID") || DEFAULT_FIREBASE_WEB_CONFIG.measurementId,
    };
  }
  return { ...DEFAULT_FIREBASE_WEB_CONFIG };
}

export function getFirebaseVapidKey(): string {
  return envStr("VITE_FIREBASE_VAPID_KEY");
}
