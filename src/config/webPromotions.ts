import { PLAY_STORE_URL } from "@/config/appDownload";

/** Sticky top banner — web browsers only (hidden in Flutter WebView). */
export const WEB_APP_DOWNLOAD_HEADLINE =
  "Download the app and get 20% discount offer";

export const WEB_APP_DOWNLOAD_SUBLINE =
  "Exclusive deals on Android — install Khudra Pasal today";

export const WEB_APP_DOWNLOAD_CTA = "Get app";

/** sessionStorage key — dismiss per tab */
export const WEB_APP_DOWNLOAD_BANNER_DISMISS_KEY = "khudrapasal_download_banner_dismissed";

export const webAppDownloadPromo = {
  headline: WEB_APP_DOWNLOAD_HEADLINE,
  subline: WEB_APP_DOWNLOAD_SUBLINE,
  ctaLabel: WEB_APP_DOWNLOAD_CTA,
  storeUrl: PLAY_STORE_URL,
} as const;
