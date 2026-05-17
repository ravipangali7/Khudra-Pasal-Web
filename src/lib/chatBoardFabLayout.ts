import { MOBILE_TABBAR_HEIGHT } from "@/components/layout/MobileFooterNav";

export const CHATBOARD_FAB_HOST_CLASS = "kp-chatboard-fab-host";
export const CHATBOARD_FAB_REPOSITION_EVENT = "kp-reposition-chat-fab";

/** Minimum gap between the tab bar top edge and the chat launcher bottom edge. */
export const CHATBOARD_FAB_GAP_PX = 12;

const MOBILE_TABBAR_SELECTOR = ".mobile-tabbar-fixed";
const MOBILE_MQ = "(max-width: 767px)";

/** Chat Board root and other third-party launcher roots (not inner controls). */
export const CHATBOARD_LAUNCHER_SELECTORS = [
  `.${CHATBOARD_FAB_HOST_CLASS}`,
  "#sbchat",
  "#tawk-bubble-container",
  ".tawk-min-container",
  "#tawk-chatbox-container",
  ".intercom-lightweight-app-launcher",
  "#crisp-chatbox",
  "#crisp-chatbox-button",
] as const;

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

function getMobileTabBarElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(MOBILE_TABBAR_SELECTOR);
}

/**
 * Distance from the viewport bottom to place the launcher’s bottom edge,
 * based on the live tab bar geometry (includes safe-area padding on the bar).
 */
export function getChatBoardFabBottomPx(): number {
  if (typeof window === "undefined") return MOBILE_TABBAR_HEIGHT + CHATBOARD_FAB_GAP_PX;

  const tabbar = getMobileTabBarElement();
  if (tabbar) {
    const tabTop = tabbar.getBoundingClientRect().top;
    return Math.max(
      window.innerHeight - tabTop + CHATBOARD_FAB_GAP_PX,
      MOBILE_TABBAR_HEIGHT + CHATBOARD_FAB_GAP_PX,
    );
  }

  const safe = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)") || "0",
    10,
  );
  return readTabBarHeightPx() + CHATBOARD_FAB_GAP_PX + (Number.isFinite(safe) ? safe : 0);
}

export function getChatBoardFabBottomCss(): string {
  return `${getChatBoardFabBottomPx()}px`;
}

function syncFabBottomCssVar(bottomPx: number): void {
  document.documentElement.style.setProperty("--kp-chatboard-fab-bottom", `${bottomPx}px`);
}

function applyFixedFab(el: HTMLElement, bottomPx: number): void {
  el.style.setProperty("position", "fixed", "important");
  el.style.setProperty("bottom", `${bottomPx}px`, "important");
  el.style.setProperty("right", "12px", "important");
  el.style.setProperty("left", "auto", "important");
  el.style.setProperty("top", "auto", "important");
  el.style.setProperty("z-index", "10001", "important");
  el.style.setProperty("margin", "0", "important");
  el.style.setProperty("pointer-events", "auto", "important");
}

function clearFixedFab(el: HTMLElement): void {
  for (const prop of ["position", "bottom", "right", "left", "top", "z-index", "margin", "pointer-events"] as const) {
    el.style.removeProperty(prop);
  }
}

function getFabHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.${CHATBOARD_FAB_HOST_CLASS}`);
}

/** Mount Chat Board inside our host so one fixed anchor controls viewport offset. */
function mountChatBoardInHost(sbchat: HTMLElement, host: HTMLElement): void {
  if (sbchat.parentElement !== host) {
    host.appendChild(sbchat);
  }
  sbchat.style.setProperty("position", "absolute", "important");
  sbchat.style.setProperty("bottom", "0", "important");
  sbchat.style.setProperty("right", "0", "important");
  sbchat.style.setProperty("left", "auto", "important");
  sbchat.style.setProperty("top", "auto", "important");
  sbchat.style.setProperty("margin", "0", "important");
  sbchat.style.removeProperty("z-index");
}

function collectLauncherElements(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const list: HTMLElement[] = [];
  const add = (el: HTMLElement | null) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    list.push(el);
  };

  for (const selector of CHATBOARD_LAUNCHER_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach(add);
  }

  const sbchat = document.getElementById("sbchat");
  if (sbchat instanceof HTMLElement) add(sbchat);

  return list;
}

/** Push launchers up until nothing intersects the mobile tab bar. */
function resolveTabBarCollisions(elements: HTMLElement[], bottomPx: number): number {
  const tabbar = getMobileTabBarElement();
  if (!tabbar) return bottomPx;

  const tabTop = tabbar.getBoundingClientRect().top;
  let resolved = bottomPx;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    const overflow = rect.bottom - (tabTop - CHATBOARD_FAB_GAP_PX);
    if (overflow > 0) {
      resolved = Math.max(resolved, resolved + overflow);
    }
  }

  return resolved;
}

/** Pin chat launcher widgets above the mobile tab bar; no-op on desktop web. */
export function repositionChatBoardFab(): void {
  if (typeof document === "undefined") return;

  const pin = shouldPinChatBoardFab();

  if (!pin) {
    document.documentElement.style.removeProperty("--kp-chatboard-fab-bottom");
    collectLauncherElements().forEach((el) => {
      if (el.classList.contains(CHATBOARD_FAB_HOST_CLASS)) {
        el.style.removeProperty("pointer-events");
        return;
      }
      clearFixedFab(el);
      if (el.id === "sbchat") {
        for (const prop of ["position", "bottom", "right", "left", "top", "margin"] as const) {
          el.style.removeProperty(prop);
        }
      }
    });
    return;
  }

  const host = getFabHost();
  const sbchat = document.getElementById("sbchat");

  if (host) {
    host.style.setProperty("pointer-events", "none", "important");
    if (sbchat instanceof HTMLElement) {
      mountChatBoardInHost(sbchat, host);
    }
  }

  let bottomPx = getChatBoardFabBottomPx();
  const launchers = collectLauncherElements();
  const collisionTargets = launchers.filter(
    (el) => !(sbchat instanceof HTMLElement && el === sbchat && el.parentElement === host),
  );
  bottomPx = resolveTabBarCollisions(collisionTargets, bottomPx);
  syncFabBottomCssVar(bottomPx);

  if (host) {
    applyFixedFab(host, bottomPx);
  } else if (sbchat instanceof HTMLElement) {
    applyFixedFab(sbchat, bottomPx);
  }

  for (const el of launchers) {
    if (el === host || el === sbchat) continue;
    applyFixedFab(el, bottomPx);
  }

  const after = collectLauncherElements().filter(
    (el) => !(sbchat instanceof HTMLElement && el === sbchat && el.parentElement === host),
  );
  const adjusted = resolveTabBarCollisions(after, bottomPx);
  if (adjusted > bottomPx) {
    syncFabBottomCssVar(adjusted);
    if (host) applyFixedFab(host, adjusted);
    for (const el of after) {
      if (el === host || el === sbchat) continue;
      applyFixedFab(el, adjusted);
    }
  }
}

/** Exposed for Flutter WebView (`webview_screen.dart`) after each navigation. */
export function registerChatBoardFabRepositionGlobal(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __kpRepositionChatFab?: () => void }).__kpRepositionChatFab =
    repositionChatBoardFab;
}
