import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi, HttpStatusError, type GoogleCredentialAuthResult } from "@/lib/api";

type GoogleCredentialButtonProps = {
  flow: "login" | "register";
  nextPath: string;
  disabled?: boolean;
  onAuthSuccess: (payload: GoogleCredentialAuthResult, meta: { credential: string }) => void;
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
    let out: GoogleCredentialAuthResult;
    try {
      out = await authApi.loginWithGoogleCredential({
        access_token: credential,
        flow,
        next: nextPath,
      });
    } catch (err: unknown) {
      if (flow === "login" && err instanceof HttpStatusError && err.status === 404) {
        try {
          out = await authApi.loginWithGoogleCredential({
            access_token: credential,
            flow: "register",
            next: nextPath,
          });
        } catch (err2: unknown) {
          onError(err2 instanceof Error ? err2.message : "Google sign-in failed.");
          return;
        }
      } else {
        onError(err instanceof Error ? err.message : "Google sign-in failed.");
        return;
      }
    }
    onAuthSuccess(out, { credential });
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
