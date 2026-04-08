import GoogleCredentialButton from "./GoogleCredentialButton";

type SocialAuthButtonsProps = {
  mode: "login" | "signup";
  oauthNext: string;
};

export default function SocialAuthButtons({ mode, oauthNext }: SocialAuthButtonsProps) {
  return (
    <div className="mb-6">
      <div className="w-full flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-1 shadow-sm">
        <GoogleCredentialButton redirectTo={oauthNext} />
      </div>
    </div>
  );
}
