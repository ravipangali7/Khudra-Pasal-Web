import { Smartphone, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  appPromotionBannerStyle,
  isAppPromotionBannerActive,
  resolveAppPromotionStoreUrl,
  WEB_APP_DOWNLOAD_BANNER_DISMISS_KEY,
} from "@/lib/appPromotionBanner";
import { websiteApi } from "@/lib/api";
import { useWebPromotionsEnabled } from "@/hooks/useWebBrowser";
import { cn } from "@/lib/utils";

/**
 * Sticky top banner for web browsers — content from Super Admin → Settings → App Promotion Banner.
 * Hidden in the Flutter WebView and when no headline is configured.
 */
const DownloadAppBanner = () => {
  const promosEnabled = useWebPromotionsEnabled();
  const [dismissed, setDismissed] = useState(true);

  const { data: storeInfo } = useQuery({
    queryKey: ["website", "store-info", "app-promotion-banner"],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 60_000,
    enabled: promosEnabled,
  });

  const banner = storeInfo?.app_promotion_banner;
  const active = isAppPromotionBannerActive(banner);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(WEB_APP_DOWNLOAD_BANNER_DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!promosEnabled || !active || dismissed || !banner) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(WEB_APP_DOWNLOAD_BANNER_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const storeUrl = resolveAppPromotionStoreUrl(banner);
  const onGetAppClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (storeUrl === "#") e.preventDefault();
  };

  const headline = banner.headline.trim();
  const subline = banner.subline?.trim();
  const ctaLabel = banner.cta_label?.trim() || "Get app";
  const gradientStyle = appPromotionBannerStyle(banner);

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
          href={storeUrl}
          onClick={onGetAppClick}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm transition-opacity hover:opacity-90 md:px-4 md:text-xs"
          aria-disabled={storeUrl === "#" ? true : undefined}
        >
          {ctaLabel}
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 opacity-80 transition-opacity hover:opacity-100"
          aria-label="Dismiss download app banner"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  );
};

export default DownloadAppBanner;
