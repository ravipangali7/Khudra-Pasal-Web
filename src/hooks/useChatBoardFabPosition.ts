import { useEffect } from "react";
import {
  CHATBOARD_FAB_REPOSITION_EVENT,
  registerChatBoardFabRepositionGlobal,
  repositionChatBoardFab,
} from "@/lib/chatBoardFabLayout";
import { NATIVE_APP_CHANGED_EVENT } from "@/lib/nativeAppShell";

const MOBILE_MQ = "(max-width: 767px)";

/**
 * Keeps the injected chatboard / third-party launcher above the mobile tab bar
 * when the widget mounts or updates after load (inline styles, SPA navigation).
 */
export function useChatBoardFabPosition(): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    registerChatBoardFabRepositionGlobal();

    let raf = 0;
    let debounce = 0;

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => repositionChatBoardFab());
    };

    const schedule = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(run, 80);
    };

    run();

    const mq = window.matchMedia(MOBILE_MQ);
    mq.addEventListener("change", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener(NATIVE_APP_CHANGED_EVENT, schedule);
    window.addEventListener(CHATBOARD_FAB_REPOSITION_EVENT, schedule);

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const delays = [200, 600, 1500, 3500, 8000];
    const timers = delays.map((ms) => window.setTimeout(run, ms));

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(debounce);
      mq.removeEventListener("change", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener(NATIVE_APP_CHANGED_EVENT, schedule);
      window.removeEventListener(CHATBOARD_FAB_REPOSITION_EVENT, schedule);
      observer.disconnect();
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);
}
