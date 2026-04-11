/**
 * Default post-auth path for OAuth `next` and login fallbacks.
 * Align with server `primary_spa_redirect` (customer → `/portal`). Override per deploy via VITE_REDIRECT_AFTER_LOGIN.
 */
export const DEFAULT_REDIRECT_AFTER_LOGIN =
  (import.meta.env.VITE_REDIRECT_AFTER_LOGIN as string | undefined)?.trim() || "/portal";
