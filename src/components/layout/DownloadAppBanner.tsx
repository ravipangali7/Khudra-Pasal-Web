import { Smartphone, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { APP_DOWNLOAD_DISCOUNT_LABEL, PLAY_STORE_URL } from "@/config/appDownload";
import { useNativeAppShell } from "@/hooks/useNativeAppShell";

const DISMISS_KEY = "khudrapasal_download_banner_dismissed";

/**
 * Mobile browser promo — hidden inside the Flutter WebView shell (users already have the app).
 */
const DownloadAppBanner = () => {
  const inNativeApp = useNativeAppShell();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (inNativeApp || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const onGetAppClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (PLAY_STORE_URL === "#") e.preventDefault();
  };

  return (
    <DownloadAppBannerInner
      onDismiss={dismiss}
      onGetAppClick={onGetAppClick}
      label={APP_DOWNLOAD_DISCOUNT_LABEL}
    />
  );
};

function DownloadAppBannerInner({
  onDismiss,
  onGetAppClick,
  label,
}: {
  onDismiss: () => void;
  onGetAppClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  label: string;
}) {
  return (
    <div
      className="download-app-banner md:hidden sticky top-0 z-[10000] border-b border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-violet-700 text-primary-foreground shadow-md"
      role="region"
      aria-label="Download the Khudra Pasal app"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 pr-1">
        <Smartphone className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">Download the Khudra Pasal app</p>
          <p className="text-[11px] leading-tight opacity-90">{label}</p>
        </div>
        <a
          href={PLAY_STORE_URL}
          onClick={onGetAppClick}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm transition-opacity hover:opacity-90"
          aria-disabled={PLAY_STORE_URL === "#" ? true : undefined}
        >
          Get app
        </a>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1.5 opacity-80 transition-opacity hover:opacity-100"
          aria-label="Dismiss download app banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default DownloadAppBanner;
