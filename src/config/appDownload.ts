/** Google Play listing — override with VITE_PLAY_STORE_URL when published. */
export const PLAY_STORE_URL =
  (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || "#";

export const APP_DOWNLOAD_DISCOUNT_LABEL = "20% off your first in-app order";
