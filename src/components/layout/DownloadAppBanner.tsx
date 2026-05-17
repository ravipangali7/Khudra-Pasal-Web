import { Smartphone, X } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appPromotionBannerStyle,
  isAppPromotionBannerActive,
  readAppPromoVisitToken,
  resolveAppPromotionStoreUrl,
  storeAppPromoVisitToken,
} from "@/lib/appPromotionBanner";
import { websiteApi } from "@/lib/api";
import { useWebPromotionsEnabled } from "@/hooks/useWebBrowser";
import { cn } from "@/lib/utils";

/**
 * Sticky top banner — content from admin settings. Dismiss hides until page refresh only.
 */
const DownloadAppBanner = () => {
  const promosEnabled = useWebPromotionsEnabled();
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  const { data: storeInfo } = useQuery({
    queryKey: ["website", "store-info"],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: promosEnabled,
  });

  const banner = storeInfo?.app_promotion_banner;
  const active = isAppPromotionBannerActive(banner);

  if (!promosEnabled || !active || dismissed || !banner) return null;

  const dismiss = () => setDismissed(true);

  const visitToken = readAppPromoVisitToken();

  const onGetAppClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    const storeUrl = resolveAppPromotionStoreUrl(banner, visitToken);
    if (storeUrl === "#") {
      e.preventDefault();
      return;
    }
    try {
      const res = await websiteApi.appPromotionBannerClick(visitToken || undefined);
      if (res.visit_token) {
        storeAppPromoVisitToken(res.visit_token);
      }
    } catch {
      /* still open store */
    }
    void queryClient.invalidateQueries({ queryKey: ["website", "store-info"] });
  };

  const headline = banner.headline.trim();
  const subline = banner.subline?.trim();
  const ctaLabel = banner.cta_label?.trim() || "Get app";
  const gradientStyle = appPromotionBannerStyle(banner);
  const href = resolveAppPromotionStoreUrl(banner, visitToken);

  return (
    <div
      className={cn(
        "download-app-banner web-promo sticky top-0 z-[10000] border-b border-primary/20 text-primary-foreground shadow-md",
        !gradientStyle && "bg-gradient-to-r from-primary via-primary/95 to-violet-700",
      )}
      style={gradientStyle}
      role="region"
      aria-label={headline}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 pr-1 md:gap-3 md:px-4 md:py-3">
        <Smartphone className="h-5 w-5 shrink-0 opacity-90 md:h-6 md:w-6" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight md:text-sm">{headline}</p>
          {subline ? (
            <p className="text-[11px] leading-tight opacity-90 md:text-xs">{subline}</p>
          ) : null}
        </div>
        <a
          href={href}
          onClick={onGetAppClick}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm transition-opacity hover:opacity-90 md:px-4 md:text-xs"
        >
          {ctaLabel}
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 opacity-80 transition-opacity hover:opacity-100"
          aria-label="Dismiss download app banner for this page"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  );
};

export default DownloadAppBanner;
