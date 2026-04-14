import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi, type GoogleJwtAuthSuccess } from "@/lib/api";

type GoogleCredentialButtonProps = {
  flow: "login" | "register";
  nextPath: string;
  disabled?: boolean;
  onAuthSuccess: (payload: GoogleJwtAuthSuccess) => void;
  onError: (message: string) => void;
};

export default function GoogleCredentialButton({
  flow,
  nextPath,
  disabled = false,
  onAuthSuccess,
  onError,
}: GoogleCredentialButtonProps) {
  const handleCredential = async (res: CredentialResponse) => {
    const credential = (res.credential || "").trim();
    if (!credential) {
      onError("Google did not return a credential. Please try again.");
      return;
    }
    try {
      const out = await authApi.loginWithGoogleCredential({
        access_token: credential,
        flow,
        next: nextPath,
      });
      onAuthSuccess(out);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <GoogleLogin
        onSuccess={(res) => {
          void handleCredential(res);
        }}
        onError={() => onError("Google sign-in failed. Please try again.")}
        shape="pill"
        size="large"
        text={flow === "register" ? "signup_with" : "continue_with"}
        width="380"
        useOneTap={false}
      />
    </div>
  );
}
