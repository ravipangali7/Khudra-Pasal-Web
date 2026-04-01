import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi, setAuthToken } from "@/lib/api";

type GoogleCredentialButtonProps = {
  redirectTo: string;
};

export default function GoogleCredentialButton({ redirectTo }: GoogleCredentialButtonProps) {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse: CredentialResponse) => {
        try {
          const idToken = credentialResponse.credential;
          if (!idToken) throw new Error("Google did not return a credential.");
          const data = await authApi.loginWithGoogleCredential(idToken);
          setAuthToken(data.access, "portal");
          if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
            window.location.href = redirectTo;
            return;
          }
          window.location.href = "/portal/dashboard";
        } catch (error) {
          const message = error instanceof Error ? error.message : "Google login failed.";
          console.error(message);
          alert(message);
        }
      }}
      onError={() => {
        alert("Google sign-in was unsuccessful.");
      }}
      useOneTap
      theme="outline"
      size="large"
      text="continue_with"
      shape="rectangular"
    />
  );
}
