import { MOBILE_TABBAR_HEIGHT } from "@/components/layout/MobileFooterNav";

export const CHATBOARD_FAB_HOST_CLASS = "kp-chatboard-fab-host";

/** Gap between the mobile tab bar and the chat launcher (matches floating cart clearance). */
export const CHATBOARD_FAB_GAP_PX = 16;

/**
 * Third-party chat launchers we pin above the mobile tab bar.
 * Chat Board / Support Board use `#sbchat`; others are common embed IDs.
 */
export const CHATBOARD_LAUNCHER_SELECTORS = [
  `.${CHATBOARD_FAB_HOST_CLASS}`,
  "#sbchat",
  ".sb-chat",
  "#tawk-bubble-container",
  ".tawk-min-container",
  "#tawk-chatbox-container",
  ".intercom-lightweight-app-launcher",
  "#crisp-chatbox",
  "#crisp-chatbox-button",
] as const;

const MOBILE_MQ = "(max-width: 767px)";

function readTabBarHeightPx(): number {
  if (typeof document === "undefined") return MOBILE_TABBAR_HEIGHT;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--kp-mobile-tabbar-height")
    .trim();
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : MOBILE_TABBAR_HEIGHT;
}

/** True when the storefront mobile tab bar is shown (browser or Flutter WebView). */
export function shouldPinChatBoardFab(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("native-app-shell")) return true;
  return window.matchMedia(MOBILE_MQ).matches;
}

export function getChatBoardFabBottomCss(): string {
  const tabbar = readTabBarHeightPx();
  return `calc(${tabbar}px + ${CHATBOARD_FAB_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
}

function applyFabPosition(el: HTMLElement): void {
  el.style.setProperty("position", "fixed", "important");
  el.style.setProperty("bottom", getChatBoardFabBottomCss(), "important");
  el.style.setProperty("right", "12px", "important");
  el.style.setProperty("left", "auto", "important");
  el.style.setProperty("top", "auto", "important");
  el.style.setProperty("z-index", "10000", "important");
  el.style.setProperty("margin", "0", "important");
}

function clearFabPosition(el: HTMLElement): void {
  for (const prop of ["position", "bottom", "right", "left", "top", "z-index", "margin"] as const) {
    el.style.removeProperty(prop);
  }
}

/** Pin chat launcher widgets above the mobile tab bar; no-op on desktop web. */
export function repositionChatBoardFab(): void {
  if (typeof document === "undefined") return;

  const pin = shouldPinChatBoardFab();

  for (const selector of CHATBOARD_LAUNCHER_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (pin) applyFabPosition(node);
      else clearFabPosition(node);
    });
  }
}
