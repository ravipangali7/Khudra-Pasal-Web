import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import AuthBrandingPanelLogin from "@/components/auth/AuthBrandingPanelLogin";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import AdminLoginForm from "@/components/auth/AdminLoginForm";
import { sanitizeNextPath } from "@/lib/authRedirect";
import { getAuthToken, getLoginSurface, setAuthToken } from "@/lib/api";
import { PORTAL_LOGIN_PATH } from "@/lib/portalLoginPaths";

const DEFAULT_ADMIN_AFTER_LOGIN = "/admin/dashboard";

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [oauthError, setOauthError] = useState<string | null>(null);

  const postLoginTarget = useMemo(
    () => sanitizeNextPath(searchParams.get("next")) ?? DEFAULT_ADMIN_AFTER_LOGIN,
    [searchParams],
  );

  const authed = Boolean(getAuthToken());
  const surface = getLoginSurface();
  const isAdminSession = authed && (surface === "admin" || surface === null);

  useEffect(() => {
    const token = searchParams.get("token");
    const surfaceParam = searchParams.get("surface");
    const err = searchParams.get("oauth_error");

    if (err) {
      setOauthError(err);
      const p = new URLSearchParams(searchParams);
      p.delete("oauth_error");
      navigate(
        { pathname: PORTAL_LOGIN_PATH.admin, search: p.toString() ? `?${p.toString()}` : "" },
        { replace: true },
      );
      return;
    }

    if (token && surfaceParam === "admin") {
      setAuthToken(token, "admin");
      navigate(postLoginTarget, { replace: true });
    }
  }, [searchParams, navigate, postLoginTarget]);

  if (isAdminSession) {
    return <Navigate to={postLoginTarget} replace />;
  }

  return (
    <AuthSplitShell
      left={<AuthBrandingPanelLogin />}
      right={
        <div className="flex-1 flex flex-col bg-white min-h-[50vh] lg:min-h-screen">
          {oauthError ? (
            <div className="bg-destructive/10 text-destructive text-sm text-center py-2 px-4 border-b border-destructive/20 shrink-0">
              {oauthError}
            </div>
          ) : null}
          <header className="p-4 lg:p-6 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors w-fit text-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to store
            </Link>
          </header>
          <main className="flex-1 flex items-center justify-center p-4 lg:p-8 pb-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8 lg:mb-10">
                <Link to="/" className="inline-block lg:hidden">
                  <img src={logo} alt="Khudra Pasal" className="h-14 w-auto mx-auto mb-4" />
                </Link>
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">Admin sign-in</h1>
                <p className="text-neutral-500">Sign in with Gmail, or use your email or mobile number and password.</p>
              </div>
              <AdminLoginForm
                postLoginTarget={postLoginTarget}
                onSuccess={(redirect) => navigate(redirect, { replace: true })}
              />
            </div>
          </main>
        </div>
      }
    />
  );
}
