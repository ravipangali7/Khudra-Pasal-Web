/**
 * Set by the Flutter WebView shell (UA token + injected localStorage).
 * In-app: hide site footer + download banner; keep bottom tab navigation visible.
 */
export const NATIVE_APP_STORAGE_KEY = "khudrapasal_native_app";
export const NATIVE_APP_UA_TOKEN = "KhudraPasalApp";
export const NATIVE_APP_HTML_CLASS = "native-app-shell";
export const NATIVE_APP_CHANGED_EVENT = "khudra-native-shell-change";

export function isNativeAppShell(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(NATIVE_APP_STORAGE_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  return new RegExp(NATIVE_APP_UA_TOKEN, "i").test(navigator.userAgent);
}

/** Marks the document as the in-app WebView shell (idempotent). */
export function markNativeAppShell(): void {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem(NATIVE_APP_STORAGE_KEY, "1");
  } catch {
    /* quota / private mode */
  }
  document.documentElement.classList.add(NATIVE_APP_HTML_CLASS);
  window.dispatchEvent(new CustomEvent(NATIVE_APP_CHANGED_EVENT));
}

/** Runs before React mount — avoids a flash of mobile chrome in the WebView. */
export function bootstrapNativeAppShell(): void {
  if (!isNativeAppShell()) return;
  markNativeAppShell();
}
