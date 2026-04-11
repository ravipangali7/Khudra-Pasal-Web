import { useMemo, useState } from "react";
import AdminNotificationsModal from "@/components/admin/AdminNotificationsModal";
import LogoutConfirmDialog from "@/components/auth/LogoutConfirmDialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminSidebar from "@/components/admin/AdminSidebar";
import UnifiedAuthLoginPage from "@/components/auth/UnifiedAuthLoginPage";
import {
  adminApi,
  clearAllAuthTokens,
  getApiErrorHttpStatus,
  getAuthToken,
  getLoginSurface,
  isAdminPortalAccessDenied,
} from "@/lib/api";
import { PORTAL_LOGIN_PATH, navigateToPortalLogin, setPostLogoutLoginPath } from "@/lib/portalLoginPaths";
import { normalizeAdminSidebarItems } from "@/lib/adminNavNormalize";
import { mapApiNavToAdminItems } from "@/lib/navIcons";
import {
  buildAdminModulePath,
  getDefaultAdminModuleId,
  isKnownAdminModuleId,
  parseAdminPath,
  renderAdminModule,
} from "./admin/moduleRegistry";
import { AdminRouteContext } from "./admin/adminRouteContext";

export default function SuperAdminDashboard() {
  const [sessionTick, setSessionTick] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const authed = Boolean(getAuthToken());
  const loginSurface = getLoginSurface();
  const wrongSurfaceForAdmin =
    authed && (loginSurface === "portal" || loginSurface === "vendor");
  const adminShellQueriesEnabled =
    authed && !wrongSurfaceForAdmin && (loginSurface === "admin" || loginSurface === null || loginSurface === "not_vendor");

  const { data: navData, isError: navError, isLoading: navLoading, error: navQueryError } = useQuery({
    queryKey: ["admin", "navigation", sessionTick],
    queryFn: () => adminApi.navigation(),
    enabled: adminShellQueriesEnabled,
    retry: false,
  });

  const { data: summary, error: summaryQueryError } = useQuery({
    queryKey: ["super-admin-summary", sessionTick],
    queryFn: () => adminApi.summary(),
    enabled: adminShellQueriesEnabled,
    retry: false,
  });

  const { data: adminInbox = [] } = useQuery({
    queryKey: ["admin", "me-notifications"],
    queryFn: () => adminApi.meNotifications(),
    enabled: adminShellQueriesEnabled,
    refetchInterval: adminShellQueriesEnabled ? 30_000 : false,
  });

  const adminUnreadCount = useMemo(
    () => adminInbox.filter((n) => n.is_read === false).length,
    [adminInbox],
  );

  const { data: adminProfile, error: profileQueryError } = useQuery({
    queryKey: ["admin", "profile", sessionTick],
    queryFn: () => adminApi.profile(),
    enabled: adminShellQueriesEnabled,
    retry: false,
  });

  const gateAuthFailure = useMemo(() => {
    if (!adminShellQueriesEnabled) return null;
    for (const err of [navQueryError, profileQueryError, summaryQueryError]) {
      if (!err) continue;
      const status = getApiErrorHttpStatus(err);
      if (status === 401 || isAdminPortalAccessDenied(err)) return err;
    }
    return null;
  }, [adminShellQueriesEnabled, navQueryError, profileQueryError, summaryQueryError]);

  const sidebarItems = useMemo(
    () => normalizeAdminSidebarItems(mapApiNavToAdminItems(navData?.items)),
    [navData],
  );
  const routeState = useMemo(() => parseAdminPath(location.pathname), [location.pathname]);
  const activeSection = routeState.moduleId;

  const adminLogin = (
    <UnifiedAuthLoginPage
      variant="admin"
      formProps={{
        navigateToRedirect: false,
        onSuccess: () => setSessionTick((t) => t + 1),
        oauthNext: "/admin/dashboard",
        authPortal: "admin",
      }}
    />
  );

  if (!authed) {
    return adminLogin;
  }

  if (wrongSurfaceForAdmin) {
    return adminLogin;
  }

  if (gateAuthFailure) {
    clearAllAuthTokens();
    return adminLogin;
  }

  if (navError) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Admin navigation could not be loaded. You may be signed in with a non-admin account.
          </p>
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            Sign out and try again
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          title="Sign out?"
          description="You will be signed out so you can try another account."
          confirmLabel="Sign out"
          onConfirm={() => {
            clearAllAuthTokens();
            setSessionTick((t) => t + 1);
            setLogoutOpen(false);
          }}
        />
      </>
    );
  }

  if (navLoading || !sidebarItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading navigation…
      </div>
    );
  }

  const availableIds = new Set<string>();
  const flattenIds = (nodes: typeof sidebarItems) => {
    for (const n of nodes) {
      availableIds.add(n.id);
      if (n.children?.length) flattenIds(n.children);
    }
  };
  flattenIds(sidebarItems);
  const EXTRA_ADMIN_MODULE_IDS = new Set<string>(["account-profile", "support-tickets"]);
  for (const id of EXTRA_ADMIN_MODULE_IDS) {
    availableIds.add(id);
  }

  const fallbackModule = availableIds.has(getDefaultAdminModuleId())
    ? getDefaultAdminModuleId()
    : sidebarItems[0]?.children?.[0]?.id ?? sidebarItems[0]?.id ?? getDefaultAdminModuleId();

  if (!isKnownAdminModuleId(activeSection) || !availableIds.has(activeSection)) {
    return <Navigate to={buildAdminModulePath(fallbackModule)} replace />;
  }

  const sidebar = (
    <AdminSidebar
      items={sidebarItems}
      activeItem={activeSection}
      onItemClick={(moduleId) => navigate(buildAdminModulePath(moduleId))}
    />
  );

  const routeCtx = {
    moduleId: activeSection,
    action: routeState.action,
    itemId: routeState.itemId,
    navigateToList: () => navigate(buildAdminModulePath(activeSection)),
    navigateToAdd: () => navigate(buildAdminModulePath(activeSection, "add")),
    navigateToEdit: (id: string) => navigate(buildAdminModulePath(activeSection, "edit", id)),
    navigateToView: (id: string) => navigate(buildAdminModulePath(activeSection, "view", id)),
  };

  return (
    <>
      <AdminLayout
        sidebar={sidebar}
        title="Super Admin"
        subtitle={
          summary?.today_orders != null
            ? `Khudrapasal Command Center · ${summary.today_orders} orders today`
            : "Khudrapasal Command Center"
        }
        notifications={adminUnreadCount}
        onNotificationsClick={() => setNotificationsOpen(true)}
        onProfileClick={() => navigate(buildAdminModulePath("account-profile"))}
        avatarImageUrl={adminProfile?.avatar_url || null}
        avatarFallback={
          adminProfile?.name?.trim()
            ? adminProfile.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "SA"
            : "SA"
        }
        onHeaderLogout={() => setLogoutOpen(true)}
      >
        <AdminRouteContext.Provider value={routeCtx}>
          {renderAdminModule(activeSection, (next) => navigate(buildAdminModulePath(next)))}
        </AdminRouteContext.Provider>
      </AdminLayout>
      <AdminNotificationsModal open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        pending={logoutPending}
        title="Log out?"
        description="You will be signed out of the admin portal on this device."
        confirmLabel="Log out"
        onConfirm={async () => {
          setLogoutPending(true);
          try {
            setPostLogoutLoginPath(PORTAL_LOGIN_PATH.admin);
            clearAllAuthTokens();
            navigateToPortalLogin(navigate, "admin");
          } finally {
            setLogoutPending(false);
            setLogoutOpen(false);
          }
        }}
      />
    </>
  );
}
