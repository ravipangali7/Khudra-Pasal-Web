import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Wallet,
  Users,
  UsersRound,
  Receipt,
  User,
  Bell,
  Plus,
  ArrowDownLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Menu,
  X,
  Send,
  ShoppingCart,
  Store,
  Baby,
  FileText,
  Link2,
  LogOut,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PORTAL_LOGIN_PATH, navigateToPortalLogin, setPostLogoutLoginPath } from '@/lib/portalLoginPaths';
import { cn } from '@/lib/utils';
import { usePortalSectionPath } from '@/lib/portalNavigation';
import { toast } from 'sonner';
import {
  authApi,
  clearAllAuthTokens,
  extractResults,
  getAuthToken,
  isPortalKycBlockedError,
  isPortalPayoutRequiredError,
  mapWebsiteProductToUi,
  portalApi,
  setCheckoutPlacedPortal,
  websiteApi,
  type PortalOrderRow,
  type PortalSwitchPortalContext,
  type PortalWalletTxnRow,
  type WebsiteProduct,
} from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { mapApiNavToPortalItems } from '@/lib/navIcons';
import {
  ensureWishlistInCustomerPortalNav,
  getCustomerPortalSidebarFallback,
} from '@/lib/customerPortalSidebarFallback';
import PortalSidebar from '@/components/portal/PortalSidebar';
import UnifiedAuthLoginPage from '@/components/auth/UnifiedAuthLoginPage';
import WalletTransfer from '@/components/wallet/WalletTransfer';
import WalletHubPanel from '@/components/wallet/WalletHubPanel';
import PayoutAccountsManager from '@/components/wallet/PayoutAccountsManager';
import WalletWithdraw from '@/components/wallet/WalletWithdraw';
import WalletAddMoney from '@/components/wallet/WalletAddMoney';
import AIChatbot from '@/components/chat/AIChatbot';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AdminTable from '@/components/admin/AdminTable';
import PortalMyOrdersSection from '@/components/portal/PortalMyOrdersSection';
import PortalDashboardReelsStrip from '@/modules/reels/portal/PortalDashboardReelsStrip';
import PortalCustomerProfileModule from '@/components/portal/PortalCustomerProfileModule';
import ProfileMenu from '@/components/profile/ProfileMenu';
import PortalKycSection from '@/components/portal/PortalKycSection';
import PortalSupportSection from '@/components/portal/PortalSupportSection';
import PortalProductsCatalogSection from '@/components/portal/PortalProductsCatalogSection';
import PortalWishlistSection from '@/components/portal/PortalWishlistSection';
import PortalNotificationsModal from '@/components/portal/PortalNotificationsModal';
import { mapPortalNotificationUiType } from '@/lib/portalNotifications';
import { useSessionHomeRedirect } from '@/lib/sessionHomeRedirect';

type UserRole = 'normal' | 'parent' | 'child';

interface ChildAccount {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  spendingLimit: number;
  spent: number;
  lastActivity: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit' | 'transfer';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  from?: string;
  to?: string;
}

const CustomerPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [sessionTick, setSessionTick] = useState(0);
  const portalToken = Boolean(getAuthToken());
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addMoneyPrefill, setAddMoneyPrefill] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyType, setNewFamilyType] = useState('family');
  const [familyInviteOtp, setFamilyInviteOtp] = useState('');
  const [familyInviteErr, setFamilyInviteErr] = useState('');
  const [familyInviteSuccessMsg, setFamilyInviteSuccessMsg] = useState('');
  const [familyInviteTokenInput, setFamilyInviteTokenInput] = useState('');
  const [createFamilyErr, setCreateFamilyErr] = useState('');
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  const urlInviteToken = useMemo(
    () => (searchParams.get('family_invite_token') || '').trim(),
    [searchParams],
  );
  /** When URL carries a token, user can pick it from the dropdown or switch to manual entry. */
  const [inviteTokenMode, setInviteTokenMode] = useState<'url' | 'manual'>('manual');

  useEffect(() => {
    if (urlInviteToken) setInviteTokenMode('url');
  }, [urlInviteToken]);

  const performPortalLogout = useCallback(() => {
    setPostLogoutLoginPath(PORTAL_LOGIN_PATH.portal);
    clearAllAuthTokens();
    setSessionTick((t) => t + 1);
    setLogoutConfirmOpen(false);
    navigateToPortalLogin(navigate, 'portal');
  }, [navigate]);

  const authed = Boolean(portalToken);
  const sessionHome = useSessionHomeRedirect(authed);

  useEffect(() => {
    setCheckoutPlacedPortal('portal_main');
  }, []);

  const { data: navData, isError: navError, isLoading: navLoading } = useQuery({
    queryKey: ['portal', 'navigation', 'main', sessionTick],
    queryFn: () => portalApi.navigation('main'),
    enabled: authed,
    retry: false,
  });

  const { data: me } = useQuery({
    queryKey: ['portal', 'me', sessionTick],
    queryFn: () => portalApi.me(),
    enabled: authed,
    retry: false,
  });

  const { data: selfProfile } = useQuery({
    queryKey: ['portal', 'self-profile'],
    queryFn: () => portalApi.selfProfile(),
    enabled: authed,
    retry: false,
  });

  const userRole: UserRole =
    me?.role === 'parent' ? 'parent' : me?.role === 'child' ? 'child' : 'normal';

  const inFamilyGroup =
    userRole === 'parent' ||
    userRole === 'child' ||
    (userRole === 'normal' && Boolean(selfProfile?.family_group_name));

  const inviteTokenEffective =
    inviteTokenMode === 'url' && urlInviteToken
      ? urlInviteToken
      : familyInviteTokenInput.trim();

  const { data: summary } = useQuery({
    queryKey: ['portal', 'summary', sessionTick],
    queryFn: () => portalApi.summary(),
    enabled: authed,
    retry: false,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const {
    data: ordersResp,
    isError: ordersError,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ['portal', 'orders', 'main', sessionTick],
    queryFn: () => portalApi.ordersForSurface('main', { page_size: 100 }),
    enabled: authed,
    retry: false,
  });

  const { data: walletTxResp } = useQuery({
    queryKey: ['portal', 'transactions', sessionTick],
    queryFn: () => portalApi.transactions({ page_size: 100 }),
    enabled: authed,
    retry: false,
  });

  const { data: notificationsRaw = [] } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => portalApi.notifications(),
    enabled: authed,
    retry: false,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const markNotificationsReadMutation = useMutation({
    mutationFn: () => portalApi.notificationsMarkRead({ all: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
    },
  });

  const { data: childAccounts = [] } = useQuery({
    queryKey: ['portal', 'family-children', sessionTick],
    queryFn: () => portalApi.familyChildren(),
    enabled: authed && inFamilyGroup,
    retry: false,
  });

  const { data: inviteMeta } = useQuery({
    queryKey: ['website', 'family-invite-meta', inviteTokenEffective],
    queryFn: () => websiteApi.familyInviteMeta(inviteTokenEffective),
    enabled: authed && inviteTokenEffective.length > 0,
    retry: false,
  });

  const createFamilyMutation = useMutation({
    mutationFn: (payload: { name: string; type?: string }) => portalApi.createFamilyGroup(payload),
    onSuccess: () => {
      setCreateFamilyErr('');
      setPostLogoutLoginPath(PORTAL_LOGIN_PATH.family);
      clearAllAuthTokens();
      queryClient.clear();
      navigate('/family-portal/login');
    },
    onError: (e: Error) => {
      setCreateFamilyErr(e.message || 'Could not create family.');
    },
  });

  const acceptFamilyInviteMutation = useMutation({
    mutationFn: () =>
      portalApi.familyInviteAccept({
        token: inviteTokenEffective,
        phone: me?.phone ?? '',
        otp: familyInviteOtp,
      }),
    onSuccess: async (data) => {
      setFamilyInviteErr('');
      setFamilyInviteOtp('');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('family_invite_token');
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['portal'] });
      await queryClient.invalidateQueries({ queryKey: ['portal', 'self-profile'] });
      if (data.pending_approval) {
        setFamilyInviteSuccessMsg(
          'Join request sent. A parent can approve it from Family Portal → Join Requests.',
        );
        setSessionTick((t) => t + 1);
        return;
      }
      try {
        const nextMe = await portalApi.me();
        if (nextMe.role === 'child') {
          setPostLogoutLoginPath(PORTAL_LOGIN_PATH.child);
          clearAllAuthTokens();
          navigate('/child-portal/login');
          return;
        }
        if (nextMe.role === 'parent') {
          setPostLogoutLoginPath(PORTAL_LOGIN_PATH.family);
          clearAllAuthTokens();
          navigate('/family-portal/login');
          return;
        }
      } catch {
        /* ignore */
      }
      setSessionTick((t) => t + 1);
    },
    onError: (e: Error) => {
      setFamilyInviteErr(e.message || 'Could not submit join request.');
    },
  });

  const {
    data: marketplaceResp,
    isError: marketplaceError,
    isLoading: marketplaceLoading,
  } = useQuery({
    queryKey: ['portal', 'all-vendors-products', sessionTick],
    queryFn: () => websiteApi.productsAllVendors({ page_size: 36 }),
    enabled: authed,
    retry: false,
  });

  const walletBalance = summary?.wallet_balance ?? me?.wallet_balance ?? 0;
  const totalOrders = summary?.total_orders ?? 0;
  const pendingDeliveries = summary?.pending_deliveries ?? 0;
  const totalSpent = summary?.total_spent ?? 0;
  const notifications = summary?.notifications_count ?? 0;

  const orders = useMemo(() => {
    const rows = extractResults<PortalOrderRow>(ordersResp);
    return rows.map((o) => ({
      ...o,
      lines: o.lines ?? [],
      seller_id: o.seller_id ?? null,
    }));
  }, [ordersResp]);

  const transactions: Transaction[] = useMemo(() => {
    const rows = extractResults<PortalWalletTxnRow>(walletTxResp);
    return rows.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      description: tx.description,
      amount: tx.amount,
      status: tx.status,
      to: tx.to,
    }));
  }, [walletTxResp]);

  const marketplaceProducts: WebsiteProduct[] = useMemo(
    () => extractResults(marketplaceResp),
    [marketplaceResp],
  );

  const dashboardRecentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const handleDashboardAddToCart = useCallback(
    (product: WebsiteProduct) => {
      addToCart(mapWebsiteProductToUi(product));
    },
    [addToCart],
  );

  const handleBuyNow = useCallback(
    (product: WebsiteProduct) => {
      navigate('/checkout', {
        state: {
          from: `${location.pathname}${location.search}`,
          buyNow: {
            productId: product.id,
            productName: product.name,
            price: Number(product.price || 0),
            image: product.image_url || undefined,
            quantity: 1,
            sellerId: product.seller?.id,
            categorySlug: product.category_slug,
            parentCategorySlug: product.parent_category_slug ?? undefined,
            categoryAncestorSlugs: product.category_ancestor_slugs,
          },
        },
      });
    },
    [location.pathname, location.search, navigate],
  );

  const notificationsList = useMemo(
    () =>
      notificationsRaw.map((n) => ({
        id: n.id,
        type: mapPortalNotificationUiType(n.type),
        title: n.title?.trim() || 'Notification',
        message: (n.message || n.preview || '').trim(),
        time: n.time,
        urgent: n.urgent,
        isRead: n.is_read !== false,
      })),
    [notificationsRaw],
  );

  const displayInitials = (name?: string) => {
    if (!name?.trim()) return 'KP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const sidebarItems = useMemo(() => {
    const fromApi = ensureWishlistInCustomerPortalNav(mapApiNavToPortalItems(navData?.items));
    if (fromApi.length > 0) return fromApi;
    return getCustomerPortalSidebarFallback(userRole);
  }, [navData, userRole]);

  const { segment: activeSection, goTo, isSegmentKnown } = usePortalSectionPath('/portal', sidebarItems);

  const walletNavSections = new Set(['wallet', 'wallet-payout-accounts', 'wallet-withdraw']);

  const { data: payoutAccounts = [], isLoading: payoutAccountsLoading } = useQuery({
    queryKey: ['portal', 'payout-accounts', sessionTick],
    queryFn: async () => (await portalApi.payoutAccounts()).results,
    enabled: authed && walletNavSections.has(activeSection),
  });

  const { data: walletWithdrawals = [] } = useQuery({
    queryKey: ['portal', 'wallet-withdrawals', sessionTick],
    queryFn: async () => (await portalApi.walletWithdrawals()).results,
    enabled: authed && walletNavSections.has(activeSection),
  });

  const stayOnSwitchPortal = searchParams.get('stay') === '1';
  const { data: switchPortalContext } = useQuery<PortalSwitchPortalContext>({
    queryKey: ['portal', 'switch-portal-context', sessionTick],
    queryFn: () => portalApi.switchPortalContext(),
    enabled: authed && activeSection === 'switch-portal',
    retry: false,
  });

  useEffect(() => {
    if (activeSection !== 'switch-portal' || stayOnSwitchPortal || !switchPortalContext) return;
    if (switchPortalContext.has_child_portal_access) {
      navigate('/child-portal/dashboard', { replace: true });
      return;
    }
    if (switchPortalContext.has_family_portal_access) {
      navigate('/family-portal/dashboard', { replace: true });
    }
  }, [activeSection, navigate, stayOnSwitchPortal, switchPortalContext]);

  useEffect(() => {
    if (!authed || !walletNavSections.has(activeSection)) return;
    void queryClient.invalidateQueries({ queryKey: ['portal', 'me'] });
  }, [authed, activeSection, queryClient]);

  const formatPrice = (amount: number) => `Rs. ${amount.toLocaleString('en-NP')}`;

  const portalAdminTxRows = useMemo(
    () =>
      transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        order: [tx.description, tx.to ? `To: ${tx.to}` : ''].filter(Boolean).join(' · ') || '—',
        amount: tx.type === 'credit' ? tx.amount : -tx.amount,
        status: tx.status,
        date: tx.date,
      })),
    [transactions],
  );

  const invalidatePortalWallet = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['portal'] });
  }, [queryClient]);

  if (!portalToken) {
    return (
      <UnifiedAuthLoginPage
        formProps={{
          navigateToRedirect: false,
          onSuccess: () => setSessionTick((t) => t + 1),
          oauthNext: '/portal/dashboard',
          authPortal: 'portal',
        }}
      />
    );
  }

  if (sessionHome.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading portal…
      </div>
    );
  }
  if (sessionHome.redirectTarget) {
    return <Navigate to={sessionHome.redirectTarget} replace />;
  }

  if (navError) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Could not load portal menu. You may need a customer account (not vendor/admin).
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            Sign out
          </button>
        </div>
        <LogoutConfirmDialog
          open={logoutConfirmOpen}
          onOpenChange={setLogoutConfirmOpen}
          description="You will be signed out of the customer portal on this device."
          onConfirm={() => performPortalLogout()}
        />
      </>
    );
  }

  if (navLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading portal…
      </div>
    );
  }

  if (!isSegmentKnown && activeSection !== 'kyc') {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return (
    <>
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar shell: header + shared PortalSidebar + footer */}
      <div
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 flex h-screen w-64 flex-col bg-card border-r border-border transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">KhudraPasal</h1>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-muted rounded lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Customer Portal</p>
        </div>

        <div className="min-h-0 flex-1 flex flex-col">
          <PortalSidebar
            items={sidebarItems}
            activeItem={activeSection}
            onItemClick={(id) => {
              goTo(id);
              setSidebarOpen(false);
            }}
            collapsible={false}
            className="h-full min-h-0 flex-1 border-0 bg-transparent shadow-none rounded-none w-full"
          />
        </div>

        {/* User Info */}
        <div className="shrink-0 space-y-2 border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{displayInitials(me?.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{me?.name ?? '…'}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole} account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg border border-border hover:bg-muted"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-muted rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold capitalize hidden sm:block truncate">{activeSection.replace('-', ' ')}</h2>
            </div>

            {/* Stats Bar — wrap instead of horizontal scroll (avoids visible scrollbar) */}
            <div className="flex min-w-0 flex-wrap items-center justify-start sm:justify-end gap-2 md:gap-4">
              <div className="flex-shrink-0 px-3 py-1.5 bg-category-fresh/10 rounded-lg">
                <p className="text-[10px] text-muted-foreground">Balance</p>
                <p className="text-sm font-bold text-category-fresh">{formatPrice(walletBalance)}</p>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-primary/10 rounded-lg hidden sm:block">
                <p className="text-[10px] text-muted-foreground">Orders</p>
                <p className="text-sm font-bold">{totalOrders}</p>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-yellow-500/10 rounded-lg hidden md:block">
                <p className="text-[10px] text-muted-foreground">Pending</p>
                <p className="text-sm font-bold text-yellow-600">{pendingDeliveries}</p>
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-muted rounded-lg hidden lg:block">
                <p className="text-[10px] text-muted-foreground">Total Spent</p>
                <p className="text-sm font-bold">{formatPrice(totalSpent)}</p>
              </div>
              <Link
                to="/homepage"
                className="relative p-2 hover:bg-muted rounded-lg shrink-0 text-foreground"
                aria-label="Go to shop"
              >
                <Store className="w-5 h-5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-muted rounded-lg shrink-0"
                aria-label="Open shopping cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
              <ProfileMenu
                onProfileClick={() => goTo('profile')}
                avatarImageUrl={
                  (selfProfile?.logo_url || selfProfile?.avatar_url)?.trim()
                    ? String(selfProfile.logo_url || selfProfile.avatar_url)
                    : null
                }
                avatarFallback={displayInitials(me?.name)}
                align="end"
              />
              <button
                type="button"
                className="relative p-2 hover:bg-muted rounded-lg"
                aria-label="Open notifications"
                onClick={() => setNotificationsModalOpen(true)}
              >
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-destructive text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {userRole === 'normal' && !inFamilyGroup && (
                <section className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <h3 className="font-semibold">Start a family group</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a family to manage shared wallets and member invites. You will sign in to the family portal next.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Family name"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={createFamilyMutation.isPending || !newFamilyName.trim()}
                      onClick={() => {
                        setCreateFamilyErr('');
                        createFamilyMutation.mutate({
                          name: newFamilyName.trim(),
                          type: newFamilyType,
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      {createFamilyMutation.isPending ? 'Creating…' : 'Create family group'}
                    </button>
                  </div>
                  {createFamilyErr ? (
                    <p className="text-sm text-destructive">{createFamilyErr}</p>
                  ) : null}
                </section>
              )}

              {userRole === 'normal' && !inFamilyGroup && inviteTokenEffective.length > 0 && (
                <section className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <h3 className="font-semibold">Family invite</h3>
                  {familyInviteSuccessMsg ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{familyInviteSuccessMsg}</p>
                  ) : null}
                  {inviteMeta ? (
                    <p className="text-sm text-muted-foreground">
                      Join <span className="font-medium text-foreground">{inviteMeta.group_name}</span> as{' '}
                      <span className="capitalize">{inviteMeta.role}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading invite…</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Invite token</label>
                    {urlInviteToken ? (
                      <>
                        <select
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={inviteTokenMode}
                          onChange={(e) => setInviteTokenMode(e.target.value as 'url' | 'manual')}
                        >
                          <option value="url">
                            From invite link ({urlInviteToken.length > 14 ? `${urlInviteToken.slice(0, 10)}…` : urlInviteToken})
                          </option>
                          <option value="manual">Enter token manually</option>
                        </select>
                        {inviteTokenMode === 'manual' ? (
                          <input
                            type="text"
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                            value={familyInviteTokenInput}
                            onChange={(e) => setFamilyInviteTokenInput(e.target.value)}
                            placeholder="Paste token"
                          />
                        ) : null}
                      </>
                    ) : (
                      <input
                        type="text"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                        value={familyInviteTokenInput}
                        onChange={(e) => setFamilyInviteTokenInput(e.target.value)}
                        placeholder="Paste token if needed"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted"
                    onClick={() => {
                      setFamilyInviteErr('');
                      setFamilyInviteSuccessMsg('');
                      void authApi.sendOtp({
                        phone: me?.phone ?? '',
                        purpose: 'family_invite',
                        invite_token: inviteTokenEffective,
                      });
                    }}
                  >
                    Send OTP to my phone
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-widest font-mono"
                    placeholder="6-digit OTP"
                    value={familyInviteOtp}
                    onChange={(e) => setFamilyInviteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  {familyInviteErr ? (
                    <p className="text-sm text-destructive">{familyInviteErr}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={acceptFamilyInviteMutation.isPending || familyInviteOtp.length !== 6}
                    onClick={() => {
                      setFamilyInviteErr('');
                      acceptFamilyInviteMutation.mutate();
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {acceptFamilyInviteMutation.isPending ? 'Submitting…' : 'Submit join request'}
                  </button>
                </section>
              )}

              {/* Quick Actions */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setShowAddMoneyModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-full bg-category-fresh/10 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-category-fresh" />
                    </div>
                    <span className="text-sm font-medium">Add Money</span>
                  </button>
                  <button 
                    onClick={() => setShowWithdrawModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ArrowDownLeft className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Withdraw</span>
                  </button>
                  <button 
                    onClick={() => setShowTransferModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-full bg-category-cafe/10 flex items-center justify-center">
                      <Send className="w-6 h-6 text-category-cafe" />
                    </div>
                    <span className="text-sm font-medium">Transfer</span>
                  </button>
                </div>
              </section>

              {/* Recent orders (across all vendors) */}
              <section className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent orders</h3>
                  <button
                    type="button"
                    onClick={() => goTo('orders')}
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {ordersLoading && (
                  <p className="text-sm text-muted-foreground py-2">Loading orders…</p>
                )}
                {ordersError && (
                  <p className="text-sm text-destructive py-2">Could not load orders.</p>
                )}
                {!ordersLoading && !ordersError && dashboardRecentOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No orders yet.</p>
                )}
                {!ordersLoading && !ordersError && dashboardRecentOrders.length > 0 && (
                  <ul className="space-y-2">
                    {dashboardRecentOrders.map((o) => (
                      <li
                        key={o.pk}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{o.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {o.seller}
                            {o.seller_id != null ? ` · Vendor #${o.seller_id}` : ''} · {o.date}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{formatPrice(o.total)}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{o.status}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {userRole === 'parent' && (
                <section className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Child Accounts</h3>
                    <button type="button" className="text-xs text-primary font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {childAccounts.map((child) => (
                      <div key={child.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{child.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{child.name}</p>
                          <p className="text-xs text-muted-foreground">{child.lastActivity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatPrice(child.balance)}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-category-fresh rounded-full"
                                style={{ width: `${(child.spent / child.spendingLimit) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round((child.spent / child.spendingLimit) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Transactions */}
              <section className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent Transactions</h3>
                  <button 
                    onClick={() => goTo('transactions')}
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left pb-2 font-medium">Description</th>
                        <th className="text-left pb-2 font-medium hidden sm:table-cell">Date</th>
                        <th className="text-right pb-2 font-medium">Amount</th>
                        <th className="text-right pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {transactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3">
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{tx.date}</p>
                          </td>
                          <td className="py-3 hidden sm:table-cell text-muted-foreground">{tx.date}</td>
                          <td
                            className={cn(
                              'py-3 text-right font-medium',
                              tx.type === 'credit' && 'text-emerald-600 dark:text-emerald-500',
                              tx.type === 'debit' && 'text-destructive',
                              tx.type === 'transfer' && 'text-muted-foreground',
                            )}
                          >
                            {tx.type === 'credit' && '+'}
                            {tx.type === 'debit' && '-'}
                            {formatPrice(tx.amount)}
                          </td>
                          <td className="py-3 text-right">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              tx.status === 'completed' && 'bg-category-fresh/10 text-category-fresh',
                              tx.status === 'pending' && 'bg-yellow-500/10 text-yellow-600',
                              tx.status === 'failed' && 'bg-destructive/10 text-destructive'
                            )}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Notifications */}
              <section className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <h3 className="font-semibold">Notifications</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-primary font-medium"
                      onClick={() => setNotificationsModalOpen(true)}
                    >
                      View all
                    </button>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground font-medium disabled:opacity-50"
                      disabled={markNotificationsReadMutation.isPending || notificationsList.length === 0}
                      onClick={() => markNotificationsReadMutation.mutate()}
                    >
                      Mark all read
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {notificationsList.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg",
                        notif.urgent ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50',
                        !notif.isRead && 'ring-1 ring-primary/25 bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        notif.type === 'alert' && 'bg-destructive/10',
                        notif.type === 'success' && 'bg-category-fresh/10',
                        notif.type === 'warning' && 'bg-yellow-500/10',
                        notif.type === 'info' && 'bg-primary/10'
                      )}>
                        {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-category-fresh" />}
                        {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        {notif.type === 'info' && <Bell className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        {notif.message ? (
                          <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.time}</p>
                      </div>
                      {notif.urgent && (
                        <button type="button" className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg font-medium">
                          Approve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Products from all approved vendors */}
              <section className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Explore products</h3>
                  <Link to="/products" className="text-xs text-primary font-medium">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketplaceLoading && (
                    <p className="text-sm text-muted-foreground col-span-full py-4">Loading products…</p>
                  )}
                  {marketplaceError && (
                    <p className="text-sm text-destructive col-span-full py-4">
                      Could not load products. Check your connection and try again.
                    </p>
                  )}
                  {!marketplaceLoading && !marketplaceError && marketplaceProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">No vendor products to show yet.</p>
                  )}
                  {!marketplaceLoading &&
                    !marketplaceError &&
                    marketplaceProducts.length > 0 &&
                    marketplaceProducts.map((product) => {
                      const seller = product.seller;
                      return (
                        <div
                          key={product.id}
                          className="p-3 rounded-xl border border-border hover:border-primary/40 transition-colors flex flex-col gap-2"
                        >
                          {seller && (
                            <div className="flex items-center gap-2 min-w-0">
                              {seller.logo_url ? (
                                <img
                                  src={seller.logo_url}
                                  alt=""
                                  className="w-9 h-9 rounded-full object-cover border border-border bg-muted shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {seller.store_name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{seller.store_name}</p>
                                <p className="text-[10px] text-muted-foreground">Vendor ID {seller.id}</p>
                              </div>
                            </div>
                          )}
                          <Link
                            to={`/product/${product.slug}`}
                            className="block rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="w-full h-28 object-contain p-2 rounded-md"
                              />
                            ) : (
                              <div className="h-28 flex items-center justify-center text-2xl">🛒</div>
                            )}
                            <div className="px-1 pb-2">
                              <p className="text-xs font-medium line-clamp-2">{product.name}</p>
                              <p className="text-[10px] text-muted-foreground">{product.category_name}</p>
                              <p className="text-xs font-bold text-primary mt-1">
                                {formatPrice(Number(product.price))}
                              </p>
                            </div>
                          </Link>
                          <div className="flex gap-2 mt-auto">
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => handleDashboardAddToCart(product)}
                              className="flex-1 text-xs py-2 rounded-lg border border-border bg-background hover:bg-muted font-medium disabled:opacity-50"
                            >
                              Add to cart
                            </button>
                            <button
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => handleBuyNow(product)}
                              className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              Buy now
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>

              <PortalDashboardReelsStrip />
            </div>
          )}

          {activeSection === 'switch-portal' && (
            <div className="w-full max-w-none space-y-6 md:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Switch Portal</h2>
                  <p className="text-sm text-muted-foreground">
                    Your current role:{' '}
                    <span className="font-medium capitalize text-foreground">{userRole}</span>
                  </p>
                </div>
              </div>
              {switchPortalContext && (
                <div className="w-full p-4 md:p-5 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground">
                  Family access:{' '}
                  <span className="font-medium text-foreground">
                    {switchPortalContext.has_family_portal_access ? 'yes' : 'no'}
                  </span>
                  {' · '}
                  Child access:{' '}
                  <span className="font-medium text-foreground">
                    {switchPortalContext.has_child_portal_access ? 'yes' : 'no'}
                  </span>
                </div>
              )}
              <div className="grid gap-4 w-full">
                <div
                  className="w-full p-4 md:p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (switchPortalContext?.has_family_portal_access) {
                      navigate('/family-portal/dashboard');
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <UsersRound className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">Family Portal</h3>
                      <p className="text-sm text-muted-foreground">Manage family members, wallets & spending controls</p>
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 shrink-0" />
                        {switchPortalContext?.has_family_portal_access
                          ? 'Family portal is ready. Click to open.'
                          : 'No family portal yet. Create your own group below.'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
                <div
                  className="w-full p-4 md:p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (switchPortalContext?.has_child_portal_access) {
                      navigate('/child-portal/dashboard');
                    } else {
                      goTo('dashboard');
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        if (familyInviteTokenInput.trim()) {
                          next.set('family_invite_token', familyInviteTokenInput.trim());
                        }
                        return next;
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Baby className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">Child Portal</h3>
                      <p className="text-sm text-muted-foreground">Limited wallet, parent-approved purchases</p>
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Link2 className="w-3 h-3 shrink-0" />
                        {switchPortalContext?.has_child_portal_access
                          ? 'Child portal is ready. Click to open.'
                          : 'Use invite token + OTP to join as child.'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </div>
              {switchPortalContext && !switchPortalContext.has_family_portal_access && switchPortalContext.can_create_family_group && (
                <div className="w-full p-4 md:p-6 bg-card rounded-xl border border-border space-y-3">
                  <h3 className="font-semibold">Create Your Own Group</h3>
                  <p className="text-sm text-muted-foreground">
                    This form is generated from backend model choices and will create your family portal.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 w-full">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Group name"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                    />
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={newFamilyType}
                      onChange={(e) => setNewFamilyType(e.target.value)}
                    >
                      {switchPortalContext.family_group_types.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {createFamilyErr ? <p className="text-sm text-destructive">{createFamilyErr}</p> : null}
                  <button
                    type="button"
                    disabled={createFamilyMutation.isPending || !newFamilyName.trim()}
                    onClick={() => {
                      setCreateFamilyErr('');
                      createFamilyMutation.mutate({
                        name: newFamilyName.trim(),
                        type: newFamilyType,
                      });
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    {createFamilyMutation.isPending ? 'Creating…' : 'Create family group'}
                  </button>
                </div>
              )}

              {switchPortalContext && !switchPortalContext.has_child_portal_access && (
                <div className="w-full p-4 md:p-6 bg-card rounded-xl border border-border space-y-3">
                  <h3 className="font-semibold">Join Child Portal (Invite)</h3>
                  {familyInviteSuccessMsg ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{familyInviteSuccessMsg}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Choose the invite token (from link or typed), send OTP, then submit a join request for a parent to
                    approve.
                  </p>
                  {urlInviteToken ? (
                    <>
                      <label className="text-xs text-muted-foreground">Invite token</label>
                      <select
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        value={inviteTokenMode}
                        onChange={(e) => setInviteTokenMode(e.target.value as 'url' | 'manual')}
                      >
                        <option value="url">
                          From invite link ({urlInviteToken.length > 14 ? `${urlInviteToken.slice(0, 10)}…` : urlInviteToken})
                        </option>
                        <option value="manual">Enter token manually</option>
                      </select>
                      {inviteTokenMode === 'manual' ? (
                        <input
                          type="text"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                          value={familyInviteTokenInput}
                          onChange={(e) => setFamilyInviteTokenInput(e.target.value)}
                          placeholder="Paste invite token"
                        />
                      ) : null}
                    </>
                  ) : (
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                      value={familyInviteTokenInput}
                      onChange={(e) => setFamilyInviteTokenInput(e.target.value)}
                      placeholder="Invite token"
                    />
                  )}
                  <div className="flex flex-wrap gap-2 w-full">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm shrink-0"
                      disabled={!inviteTokenEffective}
                      onClick={() => {
                        setFamilyInviteErr('');
                        setFamilyInviteSuccessMsg('');
                        void authApi.sendOtp({
                          phone: me?.phone ?? '',
                          purpose: 'family_invite',
                          invite_token: inviteTokenEffective,
                        }).catch((e: Error) => setFamilyInviteErr(e.message || 'Failed to send OTP.'));
                      }}
                    >
                      Send OTP
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-2 text-center text-sm tracking-widest font-mono"
                      placeholder="6-digit OTP"
                      value={familyInviteOtp}
                      onChange={(e) => setFamilyInviteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <button
                      type="button"
                      disabled={acceptFamilyInviteMutation.isPending || familyInviteOtp.length !== 6 || !inviteTokenEffective}
                      onClick={() => {
                        setFamilyInviteErr('');
                        acceptFamilyInviteMutation.mutate();
                      }}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                    >
                      {acceptFamilyInviteMutation.isPending ? 'Submitting…' : 'Submit join request'}
                    </button>
                  </div>
                  {familyInviteErr ? <p className="text-sm text-destructive">{familyInviteErr}</p> : null}
                </div>
              )}
              <div className="w-full p-4 md:p-6 bg-muted/50 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">
                  Normal users are redirected automatically when a family/child portal already exists. Otherwise, create a
                  group or join by invite.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'transactions' && (
            <div className="space-y-4">
              <AdminTable
                title="Transactions"
                data={portalAdminTxRows}
                searchKey="order"
                searchPlaceholder="Search transactions…"
                columns={[
                  {
                    key: 'id',
                    label: 'ID',
                    render: (t: (typeof portalAdminTxRows)[number]) => (
                      <span className="font-mono text-xs">{t.id}</span>
                    ),
                  },
                  { key: 'type', label: 'Type', render: (t: (typeof portalAdminTxRows)[number]) => <span className="capitalize">{t.type}</span> },
                  { key: 'order', label: 'Reference' },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (t: (typeof portalAdminTxRows)[number]) => (
                      <span
                        className={cn(
                          'font-medium',
                          t.amount > 0 ? 'text-emerald-600' : 'text-destructive',
                        )}
                      >
                        {t.amount > 0 ? '+' : ''}
                        {formatPrice(Math.abs(t.amount))}
                      </span>
                    ),
                  },
                  { key: 'status', label: 'Status' },
                  { key: 'date', label: 'Date' },
                ]}
              />
              <PortalDashboardReelsStrip />
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet Card */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
                <p className="text-sm opacity-80">Available Balance</p>
                <p className="text-4xl font-bold mt-1">{formatPrice(walletBalance)}</p>
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setShowAddMoneyModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Money
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const kr = me?.kyc_required !== false;
                      const ok = me?.kyc_status === 'verified';
                      if (kr && !ok) {
                        toast.message('Complete KYC verification to withdraw.');
                        goTo('kyc');
                        return;
                      }
                      goTo('wallet-withdraw');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition-colors"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Withdraw
                  </button>
                  <button 
                    onClick={() => setShowTransferModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-xl font-medium hover:bg-white/30 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Transfer
                  </button>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-3">Quick Add Money</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amount) => (
                    <button 
                      key={amount}
                      onClick={() => {
                        setAddMoneyPrefill(amount.toString());
                        setShowAddMoneyModal(true);
                      }}
                      className="py-3 bg-muted/50 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      +{formatPrice(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <WalletHubPanel
                portalPrefix="portal"
                onSent={() => {
                  invalidatePortalWallet();
                  void queryClient.invalidateQueries({ queryKey: ['wallet-hub'] });
                }}
              />
            </div>
          )}

          {activeSection === 'wallet-payout-accounts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Payout accounts</h2>
                <p className="text-sm text-muted-foreground">
                  Save eSewa, Khalti, or bank details. Use these when you request a withdrawal.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <PayoutAccountsManager
                  accounts={payoutAccounts}
                  loading={payoutAccountsLoading}
                  onCreate={async (fd) => {
                    await portalApi.createPayoutAccount(fd);
                    await queryClient.invalidateQueries({ queryKey: ['portal', 'payout-accounts'] });
                  }}
                  onDelete={async (id) => {
                    await portalApi.deletePayoutAccount(id);
                    await queryClient.invalidateQueries({ queryKey: ['portal', 'payout-accounts'] });
                  }}
                />
              </div>
            </div>
          )}

          {activeSection === 'wallet-withdraw' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Withdraw</h2>
                <p className="text-sm text-muted-foreground">
                  Review past requests and submit a new withdrawal to your saved payout account.
                </p>
              </div>
              {walletWithdrawals.length > 0 ? (
                <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                  <h3 className="font-semibold">Withdrawal requests</h3>
                  <ul className="space-y-2 text-sm">
                    {walletWithdrawals.map((w) => (
                      <li
                        key={w.id}
                        className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{w.withdrawal_number}</span>
                        <span className="font-medium">{formatPrice(w.amount)}</span>
                        <span className="capitalize text-muted-foreground">{w.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <WalletWithdraw
                variant="page"
                walletBalance={walletBalance}
                payoutAccounts={payoutAccounts}
                payoutLoading={payoutAccountsLoading}
                onNavigateToPayout={() => goTo('wallet-payout-accounts')}
                onConfirmWithdraw={async (payload) => {
                  try {
                    await portalApi.walletWithdraw(payload);
                    invalidatePortalWallet();
                    await queryClient.invalidateQueries({ queryKey: ['portal', 'wallet-withdrawals'] });
                  } catch (e) {
                    if (isPortalKycBlockedError(e)) {
                      const msg =
                        typeof e.body.detail === 'string'
                          ? e.body.detail
                          : 'Complete KYC verification to withdraw.';
                      toast.error(msg);
                      goTo('kyc');
                      throw e;
                    }
                    if (isPortalPayoutRequiredError(e)) {
                      toast.error(
                        typeof e.body.detail === 'string'
                          ? e.body.detail
                          : 'Add a payout account before withdrawing.',
                      );
                      goTo('wallet-payout-accounts');
                      throw e;
                    }
                    throw e;
                  }
                }}
              />
            </div>
          )}

          {activeSection === 'child-accounts' && userRole === 'parent' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Child Accounts</h2>
                  <p className="text-sm text-muted-foreground">{childAccounts.length} linked accounts</p>
                </div>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Link Child
                </button>
              </div>
              {childAccounts.map(child => (
                <div key={child.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{child.avatar}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{child.name}</h4>
                        <p className="text-xs text-muted-foreground">{child.lastActivity}</p>
                      </div>
                    </div>
                    <span className="font-bold">{formatPrice(child.balance)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Spending: {formatPrice(child.spent)} / {formatPrice(child.spendingLimit)}</span>
                    <span className="text-xs font-medium">
                      {Math.round((child.spent / Math.max(child.spendingLimit, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${Math.min(100, (child.spent / Math.max(child.spendingLimit, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowTransferModal(true)} className="flex-1 py-2 text-xs font-medium bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      Load Money
                    </button>
                    <button className="flex-1 py-2 text-xs font-medium bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      Set Limits
                    </button>
                    <button className="flex-1 py-2 text-xs font-medium bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      View Activity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'products' && <PortalProductsCatalogSection variant="main" />}

          {activeSection === 'wishlist' && <PortalWishlistSection />}

          {activeSection === 'orders' && (
            <div className="space-y-4 px-1">
              <PortalMyOrdersSection surface="main" sessionTick={sessionTick} authed={authed} />
            </div>
          )}

          {activeSection === 'profile' && <PortalCustomerProfileModule />}

          {activeSection === 'support' && <PortalSupportSection />}

          {activeSection === 'kyc' && <PortalKycSection onBack={() => goTo('wallet')} />}
        </main>
      </div>

      {/* Wallet Modals - Using new components */}

      {/* Wallet Modals */}
      <WalletTransfer
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        walletBalance={walletBalance}
        onConfirmTransfer={async ({ recipient, amount }) => {
          await portalApi.walletTransfer({ recipient, amount });
          invalidatePortalWallet();
        }}
      />
      <WalletAddMoney
        isOpen={showAddMoneyModal}
        defaultAmount={addMoneyPrefill}
        onClose={() => {
          setShowAddMoneyModal(false);
          setAddMoneyPrefill('');
        }}
        onConfirmTopup={async ({ amount, method }) => {
          await portalApi.walletTopup({ amount, method });
          invalidatePortalWallet();
        }}
      />

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Mobile Footer */}
      <MobileFooterNav />
    </div>
    <PortalNotificationsModal open={notificationsModalOpen} onOpenChange={setNotificationsModalOpen} />
    <LogoutConfirmDialog
      open={logoutConfirmOpen}
      onOpenChange={setLogoutConfirmOpen}
      description="You will be signed out of the customer portal on this device."
      onConfirm={() => performPortalLogout()}
    />
    </>
  );
};

export default CustomerPortal;
