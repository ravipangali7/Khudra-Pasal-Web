import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { authApi, setAuthToken, type AuthPortalKey, type GoogleJwtAuthSuccess } from "@/lib/api";
import { DEFAULT_REDIRECT_AFTER_LOGIN } from "@/config/authDefaults";
import { sanitizeNextPath } from "@/lib/authRedirect";
import { cn } from "@/lib/utils";
import PhonePrefixField from "./PhonePrefixField";
import { AUTH_ORANGE, LOGIN_CTA_GRADIENT } from "./constants";
import OAuthPhoneCompletionForm from "./OAuthPhoneCompletionForm";
import GoogleCredentialButton from "./GoogleCredentialButton";

export type UnifiedLoginFormProps = {
  className?: string;
  navigateToRedirect?: boolean;
  onSuccess?: (payload: { redirect: string }) => void;
  /** When set, overrides reading `next` from the URL (portal embeds). */
  postLoginNext?: string | null;
  oauthNext?: string;
  /** Which portal surface is signing in (server enforces User.role). */
  authPortal?: AuthPortalKey;
  showSignUpLink?: boolean;
};

export default function UnifiedLoginForm({
  className,
  navigateToRedirect = true,
  onSuccess,
  postLoginNext: postLoginNextProp,
  oauthNext: oauthNextProp,
  authPortal = "portal",
  showSignUpLink = true,
}: UnifiedLoginFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fromQuery = sanitizeNextPath(searchParams.get("next"));
  const postLoginNext = postLoginNextProp === undefined ? fromQuery : postLoginNextProp;
  const oauthNext = oauthNextProp ?? postLoginNext ?? DEFAULT_REDIRECT_AFTER_LOGIN;

  const loginReturnPath = useMemo(
    () => "/login" + (searchParams.toString() ? `?${searchParams.toString()}` : ""),
    [searchParams],
  );
  const oauthPendingToken = searchParams.get("oauth_pending");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, "").slice(0, 10);

  const finishAuth = (r: { token: string; surface: "admin" | "vendor" | "portal"; redirect: string }) => {
    setAuthToken(r.token, r.surface);
    const target = postLoginNext != null && postLoginNext !== "" ? postLoginNext : r.redirect;
    onSuccess?.({ redirect: target });
    if (navigateToRedirect) {
      navigate(target, { replace: true });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.sendOtp({ phone: digits, purpose: "login" });
      if (r.debug_otp) {
        console.info("[dev] OTP:", r.debug_otp);
      }
      setStep("otp");
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.verifyOtp({
        phone: digits,
        otp: code,
        purpose: "login",
        portal: authPortal,
      });
      finishAuth(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  if (oauthPendingToken) {
    return (
      <OAuthPhoneCompletionForm
        className={className}
        pendingToken={oauthPendingToken}
        onComplete={(r) => {
          finishAuth({ token: r.token, surface: r.surface, redirect: r.redirect });
        }}
      />
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <GoogleCredentialButton
        flow="login"
        nextPath={oauthNext}
        disabled={loading}
        onAuthSuccess={(payload: GoogleJwtAuthSuccess) => {
          if ("requires_oauth_phone" in payload && payload.requires_oauth_phone) {
            navigate(`${loginReturnPath}${loginReturnPath.includes("?") ? "&" : "?"}oauth_pending=${encodeURIComponent(payload.pending_token)}`, { replace: true });
            return;
          }
          finishAuth(payload);
        }}
        onError={(message) => setError(message)}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">or login with phone</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-5 sm:p-6 shadow-sm">
        {step === "phone" ? (
          <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
            <div>
              <label htmlFor="unified-login-phone" className="block text-sm font-medium text-neutral-800 mb-2">
                Mobile Number
              </label>
              <PhonePrefixField
                id="unified-login-phone"
                value={digits}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                autoFocus
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity active:scale-[0.99]"
              style={{ background: LOGIN_CTA_GRADIENT }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue with OTP
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your number is safe with us</span>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4">
            <button
              type="button"
              className="text-sm text-neutral-500 hover:text-neutral-800"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
            >
              Change number
            </button>
            <p className="text-sm text-neutral-600">
              Enter the code sent to <span className="font-semibold text-neutral-900">+977 {digits}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full text-center text-2xl tracking-[0.4em] font-semibold py-3 rounded-xl border-2 border-neutral-200 focus:outline-none focus:border-orange-400"
              style={{ borderColor: otp ? AUTH_ORANGE : undefined }}
              placeholder="••••••"
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: LOGIN_CTA_GRADIENT }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & sign in"}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your number is safe with us</span>
            </div>
          </form>
        )}
      </div>

      {showSignUpLink ? (
        <p className="text-sm text-neutral-600 text-center">
          Don&apos;t have an account?{" "}
          <Link
            to={
              authPortal === "family-portal"
                ? `/signup?portal=family-portal&next=${encodeURIComponent(oauthNext)}`
                : authPortal === "child-portal"
                  ? `/signup?portal=portal&next=${encodeURIComponent(oauthNext)}`
                  : "/signup"
            }
            className="font-semibold hover:underline"
            style={{ color: AUTH_ORANGE }}
          >
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}
