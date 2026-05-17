import type { CSSProperties } from "react";
import type { WebsiteAppPromotionBanner } from "@/lib/api";
import { PLAY_STORE_URL } from "@/config/appDownload";

/** sessionStorage key — dismiss per browser tab */
export const WEB_APP_DOWNLOAD_BANNER_DISMISS_KEY = "khudrapasal_download_banner_dismissed";

export function resolveAppPromotionStoreUrl(banner: WebsiteAppPromotionBanner): string {
  const fromAdmin = banner.store_url?.trim();
  if (fromAdmin) return fromAdmin;
  return PLAY_STORE_URL;
}

/** Banner is shown only when the API returns a non-empty headline. */
export function isAppPromotionBannerActive(
  banner: WebsiteAppPromotionBanner | null | undefined,
): banner is WebsiteAppPromotionBanner {
  return Boolean(banner?.headline?.trim());
}

export function appPromotionBannerStyle(
  banner: WebsiteAppPromotionBanner,
): CSSProperties | undefined {
  const from = banner.gradient_from?.trim();
  const to = banner.gradient_to?.trim();
  if (!from && !to) return undefined;
  const start = from || "hsl(var(--primary))";
  const end = to || "rgb(109 40 217)";
  return {
    background: `linear-gradient(to right, ${start}, ${start}f2 50%, ${end})`,
  };
}
