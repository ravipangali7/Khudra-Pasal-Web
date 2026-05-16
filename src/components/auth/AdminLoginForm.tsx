import { useState } from "react";
import { Loader2 } from "lucide-react";
import { adminApi, setAuthToken, type UnifiedAuthSuccess } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import GoogleCredentialButton from "./GoogleCredentialButton";
import { LOGIN_CTA_GRADIENT } from "./constants";

export type AdminLoginFormProps = {
  className?: string;
  postLoginTarget: string;
  onSuccess: (redirect: string) => void;
};

export default function AdminLoginForm({ className, postLoginTarget, onSuccess }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finishAuth = (token: string, redirect: string) => {
    setAuthToken(token, "admin");
    onSuccess(redirect);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      const r = await adminApi.login(trimmedEmail, password);
      finishAuth(r.token, postLoginTarget);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <GoogleCredentialButton
        flow="login"
        nextPath={postLoginTarget}
        disabled={loading}
        onAuthSuccess={(payload) => {
          if ("requires_oauth_phone" in payload && payload.requires_oauth_phone) {
            setError("Complete your account phone number before using the admin portal.");
            return;
          }
          const success = payload as UnifiedAuthSuccess;
          finishAuth(success.token, success.redirect || postLoginTarget);
        }}
        onError={(message) => setError(message)}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">or sign in with email</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      <form onSubmit={(e) => void handlePasswordLogin(e)} className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/40 p-5 sm:p-6 shadow-sm">
        <div>
          <label htmlFor="admin-login-email" className="block text-sm font-medium text-neutral-800 mb-2">
            Email
          </label>
          <Input
            id="admin-login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="admin-login-password" className="block text-sm font-medium text-neutral-800 mb-2">
            Password
          </label>
          <Input
            id="admin-login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity active:scale-[0.99]"
          style={{ background: LOGIN_CTA_GRADIENT }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
        </button>
      </form>
    </div>
  );
}
