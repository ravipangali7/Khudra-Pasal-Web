/** Google Play listing — override with VITE_PLAY_STORE_URL when published. */
export const PLAY_STORE_URL =
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || "#";

/** @deprecated Prefer `WEB_APP_DOWNLOAD_HEADLINE` from `@/config/webPromotions`. */
export const APP_DOWNLOAD_DISCOUNT_LABEL = "Download the app and get 20% discount offer";
