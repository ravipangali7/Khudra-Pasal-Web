import { useEffect, useRef, type MutableRefObject } from "react";
import { useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { getFcmRegistrationToken } from "@/lib/firebaseMessaging";

const LAST_SENT_KEY = "khudrapasal_last_sent_fcm_token";

function shouldSyncFcmForPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const prefixes = ["/portal", "/family-portal", "/child-portal", "/vendor"];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function syncFcmIfNeeded(busyRef: MutableRefObject<boolean>): Promise<void> {
  if (busyRef.current) return;
  busyRef.current = true;
  try {
    const token = await getFcmRegistrationToken();
    if (!token) return;
    let prev = "";
    try {
      prev = localStorage.getItem(LAST_SENT_KEY) ?? "";
    } catch {
      /* ignore */
    }
    if (token === prev) return;
    await authApi.registerFcmToken({ fcm_token: token });
    try {
      localStorage.setItem(LAST_SENT_KEY, token);
    } catch {
      /* ignore */
    }
  } catch {
    /* permission denied, network, etc. */
  } finally {
    busyRef.current = false;
  }
}

/**
 * When the user is signed in on home or a portal route, registers the FCM web token with the API (deduped).
 */
export default function FcmTokenRegistrar() {
  const location = useLocation();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!getAuthToken() || !shouldSyncFcmForPath(location.pathname)) return;
    void syncFcmIfNeeded(busyRef);
  }, [location.pathname]);

  useEffect(() => {
    const onAuth = () => {
      if (!getAuthToken() || !shouldSyncFcmForPath(window.location.pathname)) return;
      void syncFcmIfNeeded(busyRef);
    };
    window.addEventListener("khudra-auth-changed", onAuth);
    return () => window.removeEventListener("khudra-auth-changed", onAuth);
  }, []);

  return null;
}
