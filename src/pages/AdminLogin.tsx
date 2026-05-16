import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import UnifiedAuthLoginPage from "@/components/auth/UnifiedAuthLoginPage";
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
    <>
      {oauthError ? (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/10 text-destructive text-sm text-center py-2 px-4 border-b border-destructive/20">
          {oauthError}
        </div>
      ) : null}
      <UnifiedAuthLoginPage
        variant="admin"
        formProps={{
          navigateToRedirect: false,
          onSuccess: ({ redirect }) => navigate(redirect, { replace: true }),
          postLoginNext: postLoginTarget,
          oauthNext: postLoginTarget,
          authPortal: "admin",
          showSignUpLink: false,
        }}
      />
    </>
  );
}
