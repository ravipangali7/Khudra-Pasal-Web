import type { NavigateFunction } from "react-router-dom";

const POST_LOGOUT_LOGIN_KEY = "khudrapasal_post_logout_login";
const POST_LOGOUT_TTL_MS = 120_000;

/** Canonical SPA paths for signing in per portal (shop uses `/login`). */
export const PORTAL_LOGIN_PATH = {
  shop: "/login",
  admin: "/admin/login",
  vendor: "/vendor/login",
  portal: "/portal/login",
  family: "/family-portal/login",
  child: "/child-portal/login",
} as const;

export type PortalLoginKind = Exclude<keyof typeof PORTAL_LOGIN_PATH, "shop">;

const REDIRECT_WHITELIST = new Set<string>([
  PORTAL_LOGIN_PATH.admin,
  PORTAL_LOGIN_PATH.vendor,
  PORTAL_LOGIN_PATH.portal,
  PORTAL_LOGIN_PATH.family,
  PORTAL_LOGIN_PATH.child,
]);

export function isWhitelistedPortalLoginPath(path: string): boolean {
  return REDIRECT_WHITELIST.has(path);
}

type StoredHint = { path: string; exp: number };

function parseHint(raw: string | null): StoredHint | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const path = (o as { path?: unknown }).path;
    const exp = (o as { exp?: unknown }).exp;
    if (typeof path !== "string" || typeof exp !== "number") return null;
    return { path, exp };
  } catch {
    return null;
  }
}

/** Call before clearing auth so a later visit to `/login` can forward to the portal login page. */
export function setPostLogoutLoginPath(path: string): void {
  if (!isWhitelistedPortalLoginPath(path)) return;
  if (typeof sessionStorage === "undefined") return;
  const payload: StoredHint = { path, exp: Date.now() + POST_LOGOUT_TTL_MS };
  sessionStorage.setItem(POST_LOGOUT_LOGIN_KEY, JSON.stringify(payload));
}

export function clearPostLogoutLoginPath(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(POST_LOGOUT_LOGIN_KEY);
}

/** Returns a valid path or null; removes expired or invalid entries. */
export function consumePostLogoutLoginPath(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(POST_LOGOUT_LOGIN_KEY);
  sessionStorage.removeItem(POST_LOGOUT_LOGIN_KEY);
  const hint = parseHint(raw);
  if (!hint) return null;
  if (Date.now() > hint.exp) return null;
  if (!isWhitelistedPortalLoginPath(hint.path)) return null;
  return hint.path;
}

export function navigateToPortalLogin(navigate: NavigateFunction, kind: PortalLoginKind): void {
  navigate(PORTAL_LOGIN_PATH[kind], { replace: true });
}
