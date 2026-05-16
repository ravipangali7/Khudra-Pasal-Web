import { useEffect, useState } from "react";
import { isNativeAppShell, NATIVE_APP_CHANGED_EVENT } from "@/lib/nativeAppShell";

export function useNativeAppShell(): boolean {
  const [inApp, setInApp] = useState(() => isNativeAppShell());

  useEffect(() => {
    setInApp(isNativeAppShell());
    const sync = () => setInApp(isNativeAppShell());
    window.addEventListener(NATIVE_APP_CHANGED_EVENT, sync);
    return () => window.removeEventListener(NATIVE_APP_CHANGED_EVENT, sync);
  }, []);

  return inApp;
}
