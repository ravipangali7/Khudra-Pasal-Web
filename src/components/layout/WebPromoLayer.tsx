import DownloadAppBanner from "@/components/layout/DownloadAppBanner";
import { WebOnly } from "@/components/layout/WebOnly";
import { useWebPromotionsEnabled } from "@/hooks/useWebBrowser";

/**
 * Web-only marketing shell (download offers, future campaigns).
 * Not mounted in the Flutter WebView — native shell uses `native-app-shell` + CSS fail-safe.
 */
const WebPromoLayer = () => {
  const promosEnabled = useWebPromotionsEnabled();
  if (!promosEnabled) return null;

  return (
    <WebOnly promo className="web-promo-layer">
      <DownloadAppBanner />
      {/* Future: flash sale ticker, referral strip, seasonal campaigns */}
    </WebOnly>
  );
};

export default WebPromoLayer;
