import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UnifiedAuthLoginPage from "@/components/auth/UnifiedAuthLoginPage";
import { sanitizeNextPath } from "@/lib/authRedirect";
import { clearPostLogoutLoginPath, consumePostLogoutLoginPath } from "@/lib/portalLoginPaths";
import { getAuthToken, mapWebsiteProductToUi, setAuthToken, websiteApi } from "@/lib/api";
import { consumePendingCartIntent } from "@/lib/pendingCartIntent";
import { useCart } from "@/contexts/CartContext";

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const applyPendingAddToCart = useCallback(async () => {
    const intent = consumePendingCartIntent();
    if (!intent || !getAuthToken()) return;

    let product = intent.productSnapshot;
    if (!product) {
      try {
        const detail = await websiteApi.productDetail(intent.productId);
        product = mapWebsiteProductToUi(detail);
      } catch {
        return;
      }
    }

    addToCart(
      product,
      intent.quantity,
      intent.listingScope ? { listingScope: intent.listingScope } : undefined,
    );
  }, [addToCart]);

  const { data: categories = [] } = useQuery({
    queryKey: ["website", "categories", "login-pills"],
    queryFn: () => websiteApi.categories(),
    staleTime: 60_000,
  });

  const categoryPills = useMemo(() => {
    const flat: { name: string; icon?: string }[] = [];
    for (const c of categories.slice(0, 8)) {
      flat.push({ name: c.name, icon: c.icon });
    }
    return flat;
  }, [categories]);

  useEffect(() => {
    if (searchParams.get("token")) return;
    if (searchParams.get("oauth_error")) return;
    if (getAuthToken()) return;

    const state = location.state as { from?: string } | null | undefined;
    if (state?.from === "/checkout") {
      clearPostLogoutLoginPath();
      return;
    }
    if (searchParams.get("shop") === "1") {
      clearPostLogoutLoginPath();
      return;
    }

    const portalLogin = consumePostLogoutLoginPath();
    if (portalLogin) {
      navigate(portalLogin, { replace: true });
    }
  }, [searchParams, location.state, navigate]);

  useEffect(() => {
    const token = searchParams.get("token");
    const surface = searchParams.get("surface");
    const redir = searchParams.get("redirect");
    const err = searchParams.get("oauth_error");

    if (err) {
      setOauthError(err);
      const p = new URLSearchParams(searchParams);
      p.delete("oauth_error");
      navigate({ pathname: "/login", search: p.toString() ? `?${p.toString()}` : "" }, { replace: true });
      return;
    }

    if (token && (surface === "admin" || surface === "vendor" || surface === "portal")) {
      setAuthToken(token, surface);
      const next = sanitizeNextPath(searchParams.get("next"));
      const target = next ?? redir ?? "/portal/dashboard";
      void (async () => {
        await applyPendingAddToCart();
        navigate(target, { replace: true });
      })();
    }
  }, [searchParams, navigate, applyPendingAddToCart]);

  return (
    <>
      {oauthError ? (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/10 text-destructive text-sm text-center py-2 px-4 border-b border-destructive/20">
          {oauthError}
        </div>
      ) : null}
      <UnifiedAuthLoginPage
        categoryPills={categoryPills}
        formProps={{
          navigateToRedirect: false,
          onSuccess: ({ redirect }) => {
            void (async () => {
              await applyPendingAddToCart();
              navigate(redirect, { replace: true });
            })();
          },
        }}
      />
    </>
  );
};

export default Login;
