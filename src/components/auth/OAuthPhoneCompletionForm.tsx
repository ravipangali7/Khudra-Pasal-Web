import { useState } from "react";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { authApi, type UnifiedAuthSuccess } from "@/lib/api";
import { cn } from "@/lib/utils";
import PhonePrefixField from "./PhonePrefixField";
import { AUTH_ORANGE, LOGIN_CTA_GRADIENT } from "./constants";

export type OAuthPhoneCompletionFormProps = {
  className?: string;
  pendingToken: string;
  title?: string;
  description?: string;
  onComplete: (payload: UnifiedAuthSuccess) => void;
};

/**
 * After Google/Facebook OAuth, the server redirects with `oauth_pending` until the user
 * verifies a Nepal mobile number via OTP.
 */
export default function OAuthPhoneCompletionForm({
  className,
  pendingToken,
  title = "Add your mobile number",
  description = "Enter your Nepal mobile number to finish signing in. We’ll send a one-time code to verify it.",
  onComplete,
}: OAuthPhoneCompletionFormProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const digits = phone.replace(/\D/g, "").slice(0, 10);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const r = await authApi.sendOAuthPhoneOtp({ pending_token: pendingToken, phone: digits });
      if (r.debug_otp) {
        console.info("[dev] OAuth phone OTP:", r.debug_otp);
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
      const r = await authApi.verifyOAuthPhone({
        pending_token: pendingToken,
        phone: digits,
        otp: code,
      });
      onComplete(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-sm text-neutral-800">
        <p className="font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-neutral-600">{description}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-5 sm:p-6 shadow-sm">
        {step === "phone" ? (
          <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
            <div>
              <label htmlFor="oauth-complete-phone" className="block text-sm font-medium text-neutral-800 mb-2">
                Mobile Number
              </label>
              <PhonePrefixField
                id="oauth-complete-phone"
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
                  Send OTP
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & continue"}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your number is safe with us</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
