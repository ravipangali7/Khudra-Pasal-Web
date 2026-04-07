import { useLayoutEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminSidebar, { type SidebarItem } from '@/components/admin/AdminSidebar';
import UnifiedAuthLoginPage from '@/components/auth/UnifiedAuthLoginPage';
import { vendorApi, getAuthToken, clearAllAuthTokens, getLoginSurface, setLoginSurface } from '@/lib/api';
import { PORTAL_LOGIN_PATH, navigateToPortalLogin, setPostLogoutLoginPath } from '@/lib/portalLoginPaths';
import { useSessionHomeRedirect } from '@/lib/sessionHomeRedirect';
import { mapApiNavToAdminItems } from '@/lib/navIcons';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  buildVendorModulePath,
  getDefaultVendorModuleId,
  isKnownVendorModuleId,
  parseVendorRoute,
  renderVendorModule,
} from './moduleRegistry';
import { VendorRouteContext } from './vendorRouteContext';
import { VendorReelViewerProvider } from '@/modules/reels/vendor/VendorReelViewerContext';
import { cn } from '@/lib/utils';

const VENDOR_SIDEBAR_EXCLUDED_IDS = new Set(['faq', 'faqs', 'settings']);

function filterExcludedVendorNavItems(items: SidebarItem[]): SidebarItem[] {
  return items
    .filter((i) => !VENDOR_SIDEBAR_EXCLUDED_IDS.has(i.id))
    .map((i) => ({
      ...i,
      children: i.children?.length ? filterExcludedVendorNavItems(i.children) : undefined,
    }));
}

export default function VendorPortal() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionTick, setSessionTick] = useState(0);
  const hasToken = Boolean(getAuthToken());
  const sessionHome = useSessionHomeRedirect(hasToken);
  const surface = getLoginSurface();
  const legacyProbe = hasToken && surface === null;
  const vendorQueriesEnabled = surface === 'vendor';
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  const handleVendorLogout = async () => {
    setLogoutPending(true);
    try {
      await vendorApi.logout();
    } catch {
      // Best-effort server-side logout; always clear local session.
    } finally {
      setPostLogoutLoginPath(PORTAL_LOGIN_PATH.vendor);
      clearAllAuthTokens();
      setSessionTick((t) => t + 1);
      setLogoutPending(false);
      setLogoutOpen(false);
      navigateToPortalLogin(navigate, 'vendor');
    }
  };

  const surfaceProbeQuery = useQuery({
    queryKey: ['vendor', 'surface-probe', sessionTick],
    queryFn: () => vendorApi.me(),
    enabled: legacyProbe,
    retry: false,
  });

  const vendorProfileDenied =
    surface === 'not_vendor' ||
    (legacyProbe &&
      surfaceProbeQuery.isError &&
      surfaceProbeQuery.error instanceof Error &&
      surfaceProbeQuery.error.message.includes('Vendor profile required'));

  useLayoutEffect(() => {
    if (surfaceProbeQuery.isSuccess && surfaceProbeQuery.data && getLoginSurface() !== 'vendor') {
      setLoginSurface('vendor');
      setSessionTick((t) => t + 1);
    }
  }, [surfaceProbeQuery.isSuccess, surfaceProbeQuery.data]);

  useLayoutEffect(() => {
    const err = surfaceProbeQuery.error;
    if (!surfaceProbeQuery.isError || !(err instanceof Error)) return;
    if (!err.message.includes('Vendor profile required')) return;
    if (getLoginSurface() === 'not_vendor') return;
    setLoginSurface('not_vendor');
    setSessionTick((t) => t + 1);
  }, [surfaceProbeQuery.isError, surfaceProbeQuery.error]);

  const { data: navData, isError: navError, isLoading: navLoading } = useQuery({
    queryKey: ['vendor', 'navigation', sessionTick],
    queryFn: () => vendorApi.navigation(),
    enabled: vendorQueriesEnabled,
    retry: false,
  });

  const { data: vMe } = useQuery({
    queryKey: ['vendor', 'me', sessionTick],
    queryFn: () => vendorApi.me(),
    enabled: vendorQueriesEnabled,
    retry: false,
  });

  const { data: vSummary } = useQuery({
    queryKey: ['vendor', 'summary', sessionTick],
    queryFn: () => vendorApi.summary(),
    enabled: vendorQueriesEnabled,
    retry: false,
    refetchInterval: vendorQueriesEnabled ? 30_000 : false,
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: vendorNotifResp } = useQuery({
    queryKey: ['vendor', 'notifications'],
    queryFn: () => vendorApi.notifications(),
    enabled: vendorQueriesEnabled && notificationsOpen,
    refetchInterval: notificationsOpen ? 8_000 : false,
  });
  const vendorNotifications = vendorNotifResp?.results ?? [];
  const markReadMutation = useMutation({
    mutationFn: (body: { all?: boolean; ids?: string[] }) => vendorApi.notificationsMarkRead(body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications'] }),
    onError: (e: Error) => toast.error(e.message || 'Could not mark notification as read.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorApi.deleteNotification(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vendor', 'notifications'] }),
    onError: (e: Error) => toast.error(e.message || 'Could not delete notification.'),
  });
  const handleNotificationActivate = async (id: string, isRead: boolean, destination: string) => {
    if (!isRead) {
      try {
        await markReadMutation.mutateAsync({ ids: [id] });
      } catch {
        // Keep navigation flow even if read status update fails.
      }
    }
    setNotificationsOpen(false);
    if (destination.startsWith('http://') || destination.startsWith('https://')) {
      window.open(destination, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(destination);
  };

  const vendorNumericId = useMemo(() => {
    const id = (vMe as { id?: unknown } | undefined)?.id;
    if (id == null || id === '') return null;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [vMe]);

  const sidebarItems = useMemo(
    () => filterExcludedVendorNavItems(mapApiNavToAdminItems(navData?.items)),
    [navData],
  );
  const routeState = useMemo(() => parseVendorRoute(location.pathname), [location.pathname]);
  const activeSection = routeState.moduleId;

  const normalizeModuleId = (id: string) => (id === 'add-product' ? 'all-products' : id);

  const vendorRouteCtx = useMemo(
    () => ({
      moduleId: routeState.moduleId,
      action: routeState.action,
      itemId: routeState.itemId,
      navigateToList: () => navigate(buildVendorModulePath('all-products')),
      navigateToAdd: () => navigate(buildVendorModulePath('all-products', 'add')),
      navigateToEdit: (id: string) => navigate(buildVendorModulePath('all-products', 'edit', id)),
    }),
    [navigate, routeState.action, routeState.itemId, routeState.moduleId],
  );
  const setActiveSection = (id: string) => {
    if (id === 'add-product') {
      navigate(buildVendorModulePath('all-products', 'add'));
      return;
    }
    navigate(buildVendorModulePath(normalizeModuleId(id)));
  };

  if (!hasToken) {
    return (
      <UnifiedAuthLoginPage
        formProps={{
          navigateToRedirect: false,
          onSuccess: () => setSessionTick((t) => t + 1),
          oauthNext: '/vendor/dashboard',
          authPortal: 'vendor',
        }}
      />
    );
  }

  if (sessionHome.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading vendor portal…
      </div>
    );
  }
  if (sessionHome.redirectTarget) {
    return <Navigate to={sessionHome.redirectTarget} replace />;
  }

  if (legacyProbe && surfaceProbeQuery.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verifying vendor access…
      </div>
    );
  }

  if (
    legacyProbe &&
    surfaceProbeQuery.isError &&
    surfaceProbeQuery.error instanceof Error &&
    !surfaceProbeQuery.error.message.includes('Vendor profile required')
  ) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Could not verify vendor access. Check your connection and try again.
          </p>
          <Button
            variant="outline"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['vendor', 'surface-probe'] })}
          >
            Retry
          </Button>
          <Button variant="ghost" onClick={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          pending={logoutPending}
          title="Log out?"
          description="You will be signed out of the vendor portal on this device."
          confirmLabel="Log out"
          onConfirm={() => handleVendorLogout()}
        />
      </>
    );
  }

  if (surface === 'admin') {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            The vendor dashboard is for seller accounts. You are signed in with an admin session.
          </p>
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          pending={logoutPending}
          title="Log out?"
          description="You will be signed out of the vendor portal on this device."
          confirmLabel="Log out"
          onConfirm={() => handleVendorLogout()}
        />
      </>
    );
  }

  if (surface === 'portal') {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            The vendor dashboard requires a linked seller store. Sign in with your vendor credentials, or open the
            customer or family portal instead.
          </p>
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          pending={logoutPending}
          title="Log out?"
          description="You will be signed out of the vendor portal on this device."
          confirmLabel="Log out"
          onConfirm={() => handleVendorLogout()}
        />
      </>
    );
  }

  if (vendorProfileDenied) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            No vendor profile is linked to this account. Use a seller account to access the vendor dashboard.
          </p>
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          pending={logoutPending}
          title="Log out?"
          description="You will be signed out of the vendor portal on this device."
          confirmLabel="Log out"
          onConfirm={() => handleVendorLogout()}
        />
      </>
    );
  }

  if (!vendorQueriesEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading vendor portal…
      </div>
    );
  }

  if (navError) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Vendor navigation could not be loaded. Sign in with a vendor account.
          </p>
          <Button variant="outline" onClick={() => setLogoutOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          pending={logoutPending}
          title="Log out?"
          description="You will be signed out of the vendor portal on this device."
          confirmLabel="Log out"
          onConfirm={() => handleVendorLogout()}
        />
      </>
    );
  }

  if (navLoading || !sidebarItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading vendor portal…
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

  const fallbackModule = availableIds.has(getDefaultVendorModuleId())
    ? getDefaultVendorModuleId()
    : sidebarItems[0]?.children?.[0]?.id ?? sidebarItems[0]?.id ?? getDefaultVendorModuleId();

  if (location.pathname === '/vendor' || location.pathname === '/vendor/') {
    return <Navigate to={buildVendorModulePath(fallbackModule)} replace />;
  }

  if (!isKnownVendorModuleId(activeSection) || !availableIds.has(activeSection)) {
    return <Navigate to={buildVendorModulePath(fallbackModule)} replace />;
  }

  const sidebar = (
    <AdminSidebar
      items={sidebarItems}
      activeItem={activeSection}
      onItemClick={(moduleId) => navigate(buildVendorModulePath(normalizeModuleId(moduleId)))}
    />
  );

  return (
    <AdminLayout
      sidebar={sidebar}
      title="Vendor Portal"
      subtitle={String((vMe as { store_name?: string } | undefined)?.store_name || 'Seller workspace')}
      notifications={Math.max(0, vSummary?.pending_orders ?? 0)}
      onNotificationsClick={() => setNotificationsOpen(true)}
      hideHeaderLogout
      onProfileClick={() => navigate('/vendor/store')}
      avatarImageUrl={(vMe as { logo_url?: string } | undefined)?.logo_url?.trim() || null}
      avatarFallback="SA"
      headerRight={
        <Button variant="outline" size="sm" onClick={() => setLogoutOpen(true)}>
          Log out
        </Button>
      }
    >
      <VendorReelViewerProvider vendorNumericId={vendorNumericId}>
        <VendorRouteContext.Provider value={vendorRouteCtx}>
          {renderVendorModule({ activeSection, setActiveSection })}
        </VendorRouteContext.Provider>
      </VendorReelViewerProvider>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        pending={logoutPending}
        title="Log out?"
        description="You will be signed out of the vendor portal on this device."
        confirmLabel="Log out"
        onConfirm={() => handleVendorLogout()}
      />

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[min(90vh,760px)] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>Notifications</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Order alerts and updates for your store. Refreshes every few seconds while open.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
            {vendorNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No notifications yet.</p>
            ) : (
              <ul className="space-y-3">
                {vendorNotifications.map((n) => {
                  const ordersPath = buildVendorModulePath('all-orders');
                  const rawUrl = (n.action_url || '').trim();
                  const destination = rawUrl || ordersPath;
                  const unread = n.is_read === false;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'rounded-lg border p-3 text-sm shadow-sm transition-colors cursor-pointer hover:bg-muted/50',
                        unread ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                      )}
                      onClick={() => void handleNotificationActivate(n.id, Boolean(n.is_read), destination)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          await handleNotificationActivate(n.id, Boolean(n.is_read), destination);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug text-foreground">
                          {n.title}
                          {unread && (
                            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {n.time ? new Date(n.time).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{n.message}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotificationsOpen(false);
                            navigate(ordersPath);
                          }}
                        >
                          View orders
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteMutation.mutateAsync(n.id);
                          }}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="sr-only">Delete notification</span>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
