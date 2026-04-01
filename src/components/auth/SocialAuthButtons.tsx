import { getOAuthStartUrl } from "@/lib/api";
import GoogleCredentialButton from "./GoogleCredentialButton";

type SocialAuthButtonsProps = {
  mode: "login" | "signup";
  oauthNext: string;
};

export default function SocialAuthButtons({ mode, oauthNext }: SocialAuthButtonsProps) {
  const fbLabel = mode === "login" ? "Continue with Facebook" : "Sign up with Facebook";

  return (
    <div className="space-y-3 mb-6">
      <div className="w-full flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-1 shadow-sm">
        <GoogleCredentialButton redirectTo={oauthNext} />
      </div>
      <button
        type="button"
        onClick={() => {
          window.location.href = getOAuthStartUrl("facebook", oauthNext);
        }}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white transition-colors font-medium text-sm"
      >
        <svg width="20" height="20" fill="white" viewBox="0 0 24 24" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        {fbLabel}
      </button>
    </div>
  );
}
