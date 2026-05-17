import { MOBILE_TABBAR_HEIGHT } from '@/components/layout/MobileFooterNav';

/** Gap between the tab bar top edge and the chat launcher FAB. */
export const CHATBOARD_FAB_GAP_PX = 12;

/** CSS `bottom` offset so the chat launcher clears the mobile tab bar. */
export const CHATBOARD_FAB_BOTTOM_CSS = `calc(${MOBILE_TABBAR_HEIGHT}px + ${CHATBOARD_FAB_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;

/**
 * Common third-party chat launcher roots. Scripts may inject these after load.
 * `.kp-chatboard-fab-host` is our wrapper for inline chatboard HTML from admin settings.
 */
export const CHATBOARD_LAUNCHER_SELECTORS = [
  '.kp-chatboard-fab-host',
  '#tawk-bubble-container',
  '.tawk-min-container',
  '#tawk-chatbox-container',
  '.intercom-lightweight-app-launcher',
  '#intercom-container .intercom-launcher-frame',
  '#crisp-chatbox',
  '#crisp-chatbox-button',
  '.crisp-client .cc-tlyw',
  '[data-testid="chat-widget-bubble"]',
] as const;

function applyFabPosition(el: HTMLElement) {
  el.style.setProperty('position', 'fixed', 'important');
  el.style.setProperty('bottom', CHATBOARD_FAB_BOTTOM_CSS, 'important');
  el.style.setProperty('right', '12px', 'important');
  el.style.setProperty('left', 'auto', 'important');
  el.style.setProperty('top', 'auto', 'important');
  el.style.setProperty('z-index', '10000', 'important');
  el.style.setProperty('margin', '0', 'important');
}

/** Move chatboard / chat-widget launchers above the mobile bottom tab bar. */
export function repositionChatBoardFab(): void {
  const selector = CHATBOARD_LAUNCHER_SELECTORS.join(',');
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    applyFabPosition(el);
  });
}
