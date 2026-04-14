import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, ArrowRight, Shield, ChevronLeft, Loader2, CheckCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { authApi, setAuthToken, type AuthPortalKey, type GoogleJwtAuthSuccess } from "@/lib/api";
import { DEFAULT_REDIRECT_AFTER_LOGIN } from "@/config/authDefaults";
import { sanitizeNextPath } from "@/lib/authRedirect";
import AuthBrandingPanelSignup from "@/components/auth/AuthBrandingPanelSignup";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import PhonePrefixField from "@/components/auth/PhonePrefixField";
import OAuthPhoneCompletionForm from "@/components/auth/OAuthPhoneCompletionForm";
import GoogleCredentialButton from "@/components/auth/GoogleCredentialButton";
import { AUTH_ORANGE, SIGNUP_CTA_GRADIENT } from "@/components/auth/constants";

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"info" | "otp">("info");
  const [formData, setFormData] = useState({ name: "", phone: "", familyName: "" });
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const digits = formData.phone.replace(/\D/g, "").slice(0, 10);

  const nextSanitized = sanitizeNextPath(searchParams.get("next"));
  const oauthNext = nextSanitized ?? DEFAULT_REDIRECT_AFTER_LOGIN;
  const nextPathOnly = (nextSanitized?.split("?")[0] ?? "").split("#")[0] ?? "";
  const isJoinFamilyReturn = nextPathOnly.startsWith("/join-family/");

  const signupPortal = (searchParams.get("portal") || "portal").trim().toLowerCase() as AuthPortalKey;
  const isFamilySignup = signupPortal === "family-portal" && !isJoinFamilyReturn;
  const referralRef = (searchParams.get("ref") ?? "").trim().slice(0, 32) || undefined;
  const oauthPendingToken = searchParams.get("oauth_pending");

  const signupReturnPath = useMemo(
    () => "/signup" + (searchParams.toString() ? `?${searchParams.toString()}` : ""),
    [searchParams],
  );

  useEffect(() => {
    const err = searchParams.get("oauth_error");
    if (!err) return;
    setOauthError(err);
    const p = new URLSearchParams(searchParams);
    p.delete("oauth_error");
    navigate(
      { pathname: "/signup", search: p.toString() ? `?${p.toString()}` : "" },
      { replace: true },
    );
  }, [searchParams, navigate]);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    try {
      const r = await authApi.sendOtp({
        phone: digits,
        purpose: "signup",
        name: formData.name.trim(),
        ...(isFamilySignup ? { portal: "family-portal" as const } : {}),
        ...(referralRef ? { ref: referralRef } : {}),
      });
      if (r.debug_otp) console.info("[dev] signup OTP:", r.debug_otp);
      setStep("otp");
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setIsLoading(true);
    try {
      const r = await authApi.verifyOtp({
        phone: digits,
        otp: code,
        purpose: "signup",
        name: formData.name.trim(),
        ...(isFamilySignup
          ? {
              portal: "family-portal" as const,
              ...(formData.familyName.trim()
                ? { family_name: formData.familyName.trim().slice(0, 100) }
                : {}),
            }
          : {}),
        ...(referralRef ? { ref: referralRef } : {}),
      });
      setAuthToken(r.token, r.surface);
      const target =
        nextSanitized && nextSanitized !== "" ? nextSanitized : r.redirect;
      navigate(target, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {oauthError ? (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/10 text-destructive text-sm text-center py-2 px-4 border-b border-destructive/20">
          {oauthError}
        </div>
      ) : null}
      <AuthSplitShell
      left={<AuthBrandingPanelSignup />}
      right={
        <div className="flex-1 flex flex-col bg-white min-h-[50vh] lg:min-h-screen">
          <header className="p-4 lg:p-6 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors w-fit text-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to shop
            </Link>
          </header>

          <main className="flex-1 flex items-center justify-center p-4 lg:p-8 pb-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-6 lg:mb-8">
                <Link to="/" className="inline-block lg:hidden">
                  <img src={logo} alt="Khudra Pasal" className="h-14 w-auto mx-auto mb-4" />
                </Link>
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
                  {oauthPendingToken ? "Almost there" : "Create Account"}
                </h1>
                <p className="text-neutral-500">
                  {oauthPendingToken
                    ? "Verify your mobile number to finish creating your account."
                    : isJoinFamilyReturn
                      ? "Create your account to continue to the family invitation."
                      : isFamilySignup
                        ? "Set up your family portal — we’ll create your family group automatically."
                        : "Join KhudraPasal today"}
                </p>
              </div>

              {oauthPendingToken ? (
                <OAuthPhoneCompletionForm
                  pendingToken={oauthPendingToken}
                  title="Verify your mobile number"
                  description="Enter your Nepal mobile number to finish signing up. We’ll send a one-time code to verify it."
                  onComplete={(r) => {
                    setAuthToken(r.token, r.surface);
                    const target =
                      nextSanitized && nextSanitized !== "" ? nextSanitized : r.redirect;
                    navigate(target, { replace: true });
                  }}
                />
              ) : (
                <>
              <div className="mb-6 flex justify-center">
                <GoogleCredentialButton
                  flow="register"
                  nextPath={oauthNext}
                  disabled={isLoading}
                  onAuthSuccess={(payload: GoogleJwtAuthSuccess) => {
                    if ("requires_oauth_phone" in payload && payload.requires_oauth_phone) {
                      navigate(
                        `${signupReturnPath}${signupReturnPath.includes("?") ? "&" : "?"}oauth_pending=${encodeURIComponent(payload.pending_token)}`,
                        { replace: true },
                      );
                      return;
                    }
                    setAuthToken(payload.token, payload.surface);
                    const target = nextSanitized && nextSanitized !== "" ? nextSanitized : payload.redirect;
                    navigate(target, { replace: true });
                  }}
                  onError={(message) => setError(message)}
                />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">
                  or sign up with phone
                </span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition-colors",
                      step === "info" ? "bg-orange-500" : "bg-emerald-500",
                    )}
                  >
                    {step === "otp" ? <CheckCircle className="w-5 h-5" /> : "1"}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium hidden sm:block",
                      step === "info" ? "text-neutral-900" : "text-neutral-500",
                    )}
                  >
                    Your Info
                  </span>
                </div>
                <div className="w-12 h-0.5 bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                      step === "otp"
                        ? "bg-orange-500 text-white"
                        : "bg-neutral-200 text-neutral-500",
                    )}
                  >
                    2
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium hidden sm:block",
                      step === "otp" ? "text-neutral-900" : "text-neutral-500",
                    )}
                  >
                    Verify OTP
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
                {step === "info" ? (
                  <form onSubmit={(e) => void handleInfoSubmit(e)} className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-800 mb-2">Full Name</label>
                      <div
                        className="relative rounded-xl border-2 bg-neutral-50/80 pl-12 pr-4"
                        style={{ borderColor: `${AUTH_ORANGE}55` }}
                      >
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                          className="w-full py-3.5 bg-transparent focus:outline-none text-neutral-900 placeholder:text-neutral-400"
                          placeholder="Enter your full name"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-800 mb-2">Mobile Number</label>
                      <PhonePrefixField
                        value={digits}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                        }
                      />
                    </div>
                    {isFamilySignup ? (
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 mb-2">
                          Family name <span className="text-neutral-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.familyName}
                          onChange={(e) => setFormData((p) => ({ ...p, familyName: e.target.value }))}
                          className="w-full py-3.5 px-4 rounded-xl border-2 border-neutral-200 bg-neutral-50/80 focus:outline-none focus:border-orange-400 text-neutral-900"
                          placeholder={`e.g. ${formData.name.trim() ? `${formData.name.trim()}'s Family` : "The Sharma Family"}`}
                        />
                      </div>
                    ) : null}
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 text-white font-semibold rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                      style={{ background: SIGNUP_CTA_GRADIENT }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Get OTP</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                    <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>Your information is secure and encrypted</span>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={(e) => void handleOtpSubmit(e)} className="p-6 space-y-5">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("info");
                        setOtp("");
                        setError("");
                      }}
                      className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Change details
                    </button>
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Verify Mobile</h2>
                      <p className="text-sm text-neutral-500">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-medium text-neutral-900">+977 {digits}</span>
                      </p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full text-center text-2xl tracking-[0.35em] font-bold py-3 rounded-xl border-2 border-neutral-200 focus:outline-none focus:border-orange-400"
                      placeholder="••••••"
                      autoFocus
                    />
                    {error ? <p className="text-xs text-destructive text-center">{error}</p> : null}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 text-white font-semibold rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: SIGNUP_CTA_GRADIENT }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
                  <p className="text-sm text-neutral-600">
                    Already have an account?{" "}
                    <Link
                      to="/login?shop=1"
                      className="font-semibold hover:underline"
                      style={{ color: AUTH_ORANGE }}
                    >
                      Login
                    </Link>
                  </p>
                </div>
              </div>
                </>
              )}
              <p className="text-xs text-neutral-500 text-center mt-6 px-4">
                By creating an account, you agree to our{" "}
                <a href="#" className="underline hover:text-neutral-800">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:text-neutral-800">
                  Privacy Policy
                </a>
              </p>
            </div>
          </main>
        </div>
      }
    />
    </>
  );
};

export default Signup;
