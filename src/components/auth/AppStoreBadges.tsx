const PLAY_BADGE =
  "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg";
const APP_STORE_BADGE =
  "https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg";

export default function AppStoreBadges() {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <img
        src={PLAY_BADGE}
        alt="Get it on Google Play"
        className="h-10 w-auto cursor-pointer hover:opacity-90 transition-opacity"
      />
      <img
        src={APP_STORE_BADGE}
        alt="Download on the App Store"
        className="h-10 w-auto cursor-pointer hover:opacity-90 transition-opacity"
      />
    </div>
  );
}
