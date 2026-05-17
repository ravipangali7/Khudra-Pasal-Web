import type { CSSProperties } from "react";
import type { WebsiteAppPromotionBanner } from "@/lib/api";
import { PLAY_STORE_URL } from "@/config/appDownload";

export const APP_PROMO_VISIT_TOKEN_KEY = "kp_app_promo_token";

/** Banner is shown only when the API returns a non-empty headline. */
export function isAppPromotionBannerActive(
  banner: WebsiteAppPromotionBanner | null | undefined,
): banner is WebsiteAppPromotionBanner {
  return Boolean(banner?.headline?.trim());
}

export function readAppPromoVisitToken(): string {
  try {
    return localStorage.getItem(APP_PROMO_VISIT_TOKEN_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function storeAppPromoVisitToken(token: string): void {
  try {
    localStorage.setItem(APP_PROMO_VISIT_TOKEN_KEY, token);
  } catch {
    /* private mode */
  }
}

export function resolveAppPromotionStoreUrl(
  banner: WebsiteAppPromotionBanner,
  visitToken?: string,
): string {
  const fromAdmin = banner.store_url?.trim();
  const base = fromAdmin || PLAY_STORE_URL;
  if (base === "#") return base;
  const token = visitToken?.trim() || readAppPromoVisitToken();
  if (!token) return base;
  try {
    const url = new URL(base);
    url.searchParams.set("referrer", `kp_token=${encodeURIComponent(token)}`);
    return url.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}referrer=${encodeURIComponent(`kp_token=${token}`)}`;
  }
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
