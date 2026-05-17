import { useEffect } from "react";
import { repositionChatBoardFab } from "@/lib/chatBoardFabLayout";
import { NATIVE_APP_CHANGED_EVENT } from "@/lib/nativeAppShell";

const MOBILE_MQ = "(max-width: 767px)";

/**
 * Keeps the injected chatboard / third-party launcher above the mobile tab bar
 * when the widget mounts or updates after load (inline styles, SPA navigation).
 */
export function useChatBoardFabPosition(): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => repositionChatBoardFab());
    };

    schedule();

    const mq = window.matchMedia(MOBILE_MQ);
    const onMq = () => schedule();
    mq.addEventListener("change", onMq);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener(NATIVE_APP_CHANGED_EVENT, schedule);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const delays = [400, 1200, 3000, 6000];
    const timers = delays.map((ms) => window.setTimeout(schedule, ms));

    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener(NATIVE_APP_CHANGED_EVENT, schedule);
      observer.disconnect();
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);
}
