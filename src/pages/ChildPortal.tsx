import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  Send,
  Download,
  History,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  Info,
  CreditCard,
  QrCode,
  Clock,
  CheckCircle,
  Lock,
  ShoppingCart,
  Phone,
  Shield,
  LogOut,
  Copy,
  Banknote,
  Store,
} from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PORTAL_LOGIN_PATH, navigateToPortalLogin, setPostLogoutLoginPath } from '@/lib/portalLoginPaths';
import { usePortalSectionPath } from '@/lib/portalNavigation';
import PortalMyOrdersSection from '@/components/portal/PortalMyOrdersSection';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalSidebar from '@/components/portal/PortalSidebar';
import DataTable from '@/components/portal/DataTable';
import PortalReelsWidget from '@/modules/reels/portal/PortalReelsWidget';
import EmptyState from '@/components/portal/EmptyState';
import SupportTicketsHub from '@/components/support/SupportTicketsHub';
import FaqAccordionSection from '@/components/support/FaqAccordionSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  clearAllAuthTokens,
  extractResults,
  getAuthToken,
  isPortalKycBlockedError,
  portalApi,
  setCheckoutPlacedPortal,
  websiteApi,
  type PortalChildWalletTxnRow,
  type WebsiteProduct,
} from '@/lib/api';
import { mapApiNavToPortalItems } from '@/lib/navIcons';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import UnifiedAuthLoginPage from '@/components/auth/UnifiedAuthLoginPage';
import ProfileMenu from '@/components/profile/ProfileMenu';
import PortalKycSection from '@/components/portal/PortalKycSection';
import PortalFamilyChildProfileModule from '@/components/portal/PortalFamilyChildProfileModule';
import PortalProductsCatalogSection from '@/components/portal/PortalProductsCatalogSection';
import PortalNotificationsModal from '@/components/portal/PortalNotificationsModal';
import FloatingCart from '@/components/cart/FloatingCart';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

function childTxnBadgeLabel(type: string) {
  if (type === 'parent') return 'Parent';
  if (type === 'peer') return 'Sibling';
  return 'Self';
}

function childTxnAmountDisplay(amount: number, status: string) {
  if (status === 'rejected') {
    return {
      className: 'text-muted-foreground line-through font-bold text-sm',
      text: `Rs. ${Math.abs(amount).toLocaleString()}`,
    };
  }
  const abs = Math.abs(amount);
  if (amount > 0) {
    return {
      className: 'font-bold text-sm text-emerald-600',
      text: `+Rs. ${abs.toLocaleString()}`,
    };
  }
  if (amount < 0) {
    return {
      className: 'font-bold text-sm text-destructive',
      text: `-Rs. ${abs.toLocaleString()}`,
    };
  }
  return { className: 'font-bold text-sm text-foreground', text: `Rs. ${abs.toLocaleString()}` };
}

function WalletShareWithKidCard({ kid, groupName }: { kid: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-xl dark:bg-amber-950/40">
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground">Get money from parent</h4>
              <p className="text-xs text-muted-foreground">Your parent shares to your wallet from Family Portal</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
              Share with Kid
            </Button>
          </div>
        </CardContent>
      </Card>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Kid</DialogTitle>
          <DialogDescription>
            Your parent uses Family Portal → Wallet → Distribute, selects you, and sends money. Share your KID so they
            know which account is yours.
          </DialogDescription>
        </DialogHeader>
        {groupName ? <p className="text-sm text-muted-foreground">Family: {groupName}</p> : null}
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="font-mono text-base tracking-wide truncate">{kid || '—'}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={!kid}
            onClick={() => {
              if (!kid) {
                toast.error('No KID on file');
                return;
              }
              void navigator.clipboard.writeText(kid);
              toast.success('KID copied');
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ChildPortal = () => {
  const navigate = useNavigate();
  const [sessionTick, setSessionTick] = useState(0);
  const portalToken = Boolean(getAuthToken());
  const [showBalance, setShowBalance] = useState(true);
  const [topUpMethod, setTopUpMethod] = useState<'esewa' | 'khalti' | 'qr'>('esewa');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const { cartCount, setIsCartOpen } = useCart();

  const authed = Boolean(portalToken);

  useEffect(() => {
    setCheckoutPlacedPortal('portal_child');
  }, []);

  const performPortalLogout = () => {
    setPostLogoutLoginPath(PORTAL_LOGIN_PATH.child);
    clearAllAuthTokens();
    setSessionTick((t) => t + 1);
    setLogoutConfirmOpen(false);
    navigateToPortalLogin(navigate, 'child');
  };

  const { data: navData, isError: navError, isLoading: navLoading } = useQuery({
    queryKey: ['portal', 'navigation', 'child', sessionTick],
    queryFn: () => portalApi.navigation('child'),
    enabled: authed,
    retry: false,
  });

  const sidebarItems = useMemo(() => mapApiNavToPortalItems(navData?.items), [navData]);

  const { segment: activeSection, goTo, isSegmentKnown } = usePortalSectionPath('/child-portal', sidebarItems);

  const pollOpts = { refetchInterval: 45_000 as const, refetchOnWindowFocus: true as const };

  const childSummaryQuery = useQuery({
    queryKey: ['portal', 'child', 'summary', sessionTick],
    queryFn: () => portalApi.childSummary(),
    enabled: authed,
    retry: false,
    ...pollOpts,
  });

  const { data: portalSummary } = useQuery({
    queryKey: ['portal', 'summary', 'child'],
    queryFn: () => portalApi.summary(),
    enabled: authed,
    retry: false,
    ...pollOpts,
  });

  const notificationUnread = portalSummary?.notifications_count ?? 0;

  const childTxQuery = useQuery({
    queryKey: ['portal', 'child', 'txns', sessionTick],
    queryFn: () => portalApi.childWalletTransactions({ page_size: 100 }),
    enabled: authed,
    retry: false,
    ...pollOpts,
  });

  const childRulesQuery = useQuery({
    queryKey: ['portal', 'child', 'rules', sessionTick],
    queryFn: () => portalApi.childRules(),
    enabled: authed,
    retry: false,
    ...pollOpts,
  });

  const meQuery = useQuery({
    queryKey: ['portal', 'me', sessionTick],
    queryFn: () => portalApi.me(),
    enabled: authed,
    retry: false,
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!authed || activeSection !== 'withdraw') return;
    void queryClient.invalidateQueries({ queryKey: ['portal', 'me'] });
  }, [authed, activeSection, queryClient]);

  const { data: selfProfile } = useQuery({
    queryKey: ['portal', 'self-profile'],
    queryFn: () => portalApi.selfProfile(),
    enabled: authed,
    retry: false,
  });

  const exploreProductsQuery = useQuery({
    queryKey: ['portal', 'child', 'explore-products', sessionTick],
    queryFn: () => websiteApi.products({ page_size: 8 }),
    enabled: authed,
    retry: false,
  });
  const exploreProducts: WebsiteProduct[] = useMemo(
    () => extractResults(exploreProductsQuery.data),
    [exploreProductsQuery.data],
  );

  const walletData = useMemo(
    () => ({
      parentLoaded: childSummaryQuery.data?.parentLoaded ?? 0,
      selfLoaded: childSummaryQuery.data?.selfLoaded ?? 0,
      personalBalance: childSummaryQuery.data?.personalBalance ?? 0,
      totalBalance: childSummaryQuery.data?.totalBalance ?? 0,
      spendingLimit: childSummaryQuery.data?.spendingLimit ?? 0,
      spentThisMonth: childSummaryQuery.data?.spentThisMonth ?? 0,
    }),
    [childSummaryQuery.data],
  );

  const recentTransactions: PortalChildWalletTxnRow[] = useMemo(
    () => extractResults(childTxQuery.data) as PortalChildWalletTxnRow[],
    [childTxQuery.data],
  );

  const ml = childRulesQuery.data?.member_limits;
  const spendingLimits = useMemo(
    () => ({
      daily: ml?.spending_limit_daily ?? 0,
      dailyUsed: 0,
      weekly: ml?.spending_limit_weekly ?? 0,
      weeklyUsed: 0,
      monthly: ml?.spending_limit_monthly || walletData.spendingLimit || 0,
      monthlyUsed: walletData.spentThisMonth,
    }),
    [ml, walletData.spendingLimit, walletData.spentThisMonth],
  );

  const spendingProgress =
    walletData.spendingLimit > 0
      ? Math.min(100, (walletData.spentThisMonth / walletData.spendingLimit) * 100)
      : 0;

  const pendingPurchaseRequests = useMemo(
    () =>
      [] as Array<{
        id: string;
        item: string;
        amount: number;
        status: string;
        time: string;
        image: string;
      }>,
    [],
  );
  const approvedByParentItems = useMemo(
    () =>
      [] as Array<{
        id: string;
        item: string;
        amount: number;
        time: string;
        image: string;
        approved: boolean;
      }>,
    [],
  );

  const sidebar = (
    <PortalSidebar
      items={sidebarItems}
      activeItem={activeSection}
      onItemClick={goTo}
      title="My Portal"
    />
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <ProfileMenu
        onProfileClick={() => goTo('profile')}
        avatarImageUrl={
          (selfProfile?.avatar_url || selfProfile?.logo_url)?.trim()
            ? String(selfProfile.avatar_url || selfProfile.logo_url)
            : null
        }
        avatarFallback="SA"
        align="end"
      />
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLogoutConfirmOpen(true)}>
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
      <Link
        to="/homepage"
        className="relative shrink-0 rounded-lg p-2 text-foreground hover:bg-muted"
        aria-label="Go to shop"
      >
        <Store className="h-5 w-5" />
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingCart className="h-4 w-4" />
        <span>Cart</span>
        <Badge variant="secondary" className="flex h-5 min-w-5 items-center justify-center px-1.5 py-0 text-[10px]">
          {cartCount > 99 ? '99+' : cartCount}
        </Badge>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Open notifications"
        onClick={() => setNotificationsModalOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {notificationUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
            {notificationUnread > 9 ? '9+' : notificationUnread}
          </span>
        )}
      </Button>
      <button
        type="button"
        onClick={() => setShowBalance(!showBalance)}
        className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
        aria-label={showBalance ? 'Hide balance' : 'Show balance'}
      >
        {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent />;
      case 'wallet':
        return <WalletContent />;
      case 'products':
        return (
          <PortalProductsCatalogSection
            variant="child"
            childRules={childRulesQuery.data ?? null}
            childRulesLoading={childRulesQuery.isLoading}
            childRulesError={childRulesQuery.isError}
          />
        );
      case 'my-orders':
        return (
          <div className="p-4 lg:p-6">
            <h2 className="text-lg font-semibold mb-4">My orders</h2>
            <PortalMyOrdersSection surface="child" sessionTick={sessionTick} authed={authed} />
          </div>
        );
      case 'topup':
        return <TopUpContent />;
      case 'transfer':
        return <TransferContent />;
      case 'withdraw':
        return <WithdrawContent />;
      case 'kyc':
        return <PortalKycSection onBack={() => goTo('dashboard')} />;
      case 'requests':
        return <RequestsContent />;
      case 'history':
        return <HistoryContent />;
      case 'rules':
        return <RulesContent />;
      case 'help':
        return <HelpContent />;
      case 'profile':
        return <PortalFamilyChildProfileModule variant="child" />;
      default:
        return <DashboardContent />;
    }
  };

  // Dashboard Content
  function DashboardContent() {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 opacity-70" />
                <p className="text-xs opacity-80">Parent Balance</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalance ? `Rs. ${walletData.parentLoaded.toLocaleString()}` : '••••••'}
              </p>
              <p className="text-[10px] opacity-70 mt-1">Family pool — needs approval</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 opacity-70" />
                <p className="text-xs opacity-80">Child wallet</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalance ? `Rs. ${walletData.selfLoaded.toLocaleString()}` : '••••••'}
              </p>
              <p className="text-[10px] opacity-70 mt-1">Your wallet in this family</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 opacity-70" />
                <p className="text-xs opacity-80">Personal wallet</p>
              </div>
              <p className="text-2xl font-bold">
                {showBalance ? `Rs. ${walletData.personalBalance.toLocaleString()}` : '••••••'}
              </p>
              <p className="text-[10px] opacity-70 mt-1">Same as checkout — your own balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Spending Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Monthly Limit</span>
              <span className="text-sm font-medium text-foreground">
                Rs. {walletData.spentThisMonth.toLocaleString()} / {walletData.spendingLimit.toLocaleString()}
              </span>
            </div>
            <Progress value={spendingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(100 - spendingProgress).toFixed(0)}% remaining this month
            </p>
          </CardContent>
        </Card>

        {!childRulesQuery.isLoading && childRulesQuery.data?.group_permissions ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Parent rules
                </span>
                <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => goTo('rules')}>
                  View all
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-[10px]">
                <Badge variant="outline">
                  Online:{' '}
                  {childRulesQuery.data.group_permissions.allow_online_purchases ? 'On' : 'Off'}
                </Badge>
                <Badge variant="outline">
                  Peer send:{' '}
                  {childRulesQuery.data.group_permissions.allow_peer_transfers ? 'On' : 'Off'}
                </Badge>
                <Badge variant="outline">
                  Withdraw:{' '}
                  {childRulesQuery.data.group_permissions.allow_cash_withdrawal ? 'On' : 'Off'}
                </Badge>
              </div>
              {childRulesQuery.data.product_restrictions.length > 0 ? (
                <div className="space-y-2">
                  {childRulesQuery.data.product_restrictions.slice(0, 4).map((pr) => (
                    <div key={pr.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-foreground">{pr.category_name}</span>
                      <Badge
                        variant={
                          pr.is_blocked ? 'destructive' : pr.requires_approval ? 'secondary' : 'outline'
                        }
                        className="text-[10px] shrink-0"
                      >
                        {pr.is_blocked ? 'Blocked' : pr.requires_approval ? 'Needs approval' : 'Allowed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No category purchase rules set yet.</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: ArrowDownLeft, label: 'Add Money', action: () => goTo('topup'), color: 'bg-emerald-500' },
            { icon: Send, label: 'Transfer', action: () => goTo('transfer'), color: 'bg-blue-500' },
            {
              icon: ArrowUpRight,
              label: 'Withdraw',
              action: () => {
                const m = meQuery.data;
                if (m?.kyc_required !== false && m?.kyc_status !== 'verified') {
                  toast.message('Complete KYC verification to withdraw.');
                  goTo('kyc');
                  return;
                }
                goTo('withdraw');
              },
              color: 'bg-purple-500',
            },
            { icon: History, label: 'History', action: () => goTo('history'), color: 'bg-orange-500' },
          ].map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="flex-col h-auto py-3 gap-1"
              onClick={action.action}
            >
              <div className={cn("p-2 rounded-lg text-white", action.color)}>
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px]">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTransactions.slice(0, 3).map((tx) => {
              const amt = childTxnAmountDisplay(tx.amount, tx.status);
              return (
              <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    tx.amount > 0 ? "bg-emerald-100 text-emerald-600" :
                    tx.amount < 0 ? "bg-red-100 text-red-600 dark:bg-red-950/40" :
                    tx.status === 'rejected' ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : tx.amount < 0 ? <ArrowUpRight className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{tx.item}</p>
                    <p className="text-xs text-muted-foreground">{tx.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(amt.className)}>
                    {amt.text}
                  </p>
                  <Badge
                    variant={
                      tx.type === 'self' ? 'secondary' : tx.type === 'parent' ? 'default' : 'outline'
                    }
                    className="text-[10px]"
                  >
                    {childTxnBadgeLabel(tx.type)}
                  </Badge>
                </div>
              </div>
            );
            })}
          </CardContent>
        </Card>

        {/* Pending Requests Alert */}
        {pendingPurchaseRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Pending Requests</h4>
                  <p className="text-xs text-muted-foreground">{pendingPurchaseRequests.length} items waiting for approval</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => goTo('requests')}>
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchase Request System */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Request to Purchase</CardTitle>
            <p className="text-xs text-muted-foreground">Ask your parent to approve a product</p>
          </CardHeader>
          <CardContent>
            {exploreProductsQuery.isLoading && (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading products…</p>
            )}
            {exploreProductsQuery.isError && (
              <p className="text-sm text-destructive py-4 text-center">Could not load products. Try again later.</p>
            )}
            {!exploreProductsQuery.isLoading && !exploreProductsQuery.isError && exploreProducts.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No products to browse right now.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {!exploreProductsQuery.isLoading &&
                !exploreProductsQuery.isError &&
                exploreProducts.map((product) => {
                  const canBuy = product.stock > 0;
                  return (
                    <div
                      key={product.id}
                      className="p-3 rounded-xl border hover:border-primary/50 transition-colors relative"
                    >
                      <Link to={`/product/${product.slug}`} className="block">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="w-full h-16 object-contain mb-2 rounded-md bg-muted/30"
                          />
                        ) : (
                          <div className="text-2xl mb-2 text-center">🛒</div>
                        )}
                        <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.category_name}</p>
                        <p className="text-xs font-bold text-primary mt-1">
                          Rs. {Number(product.price).toLocaleString('en-NP')}
                        </p>
                      </Link>
                      {canBuy ? (
                        <Button size="sm" className="w-full mt-2 h-7 text-xs" asChild>
                          <Link to={`/product/${product.slug}`}>Buy Now</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs gap-1" type="button">
                          <Clock className="w-3 h-3" /> Request Parent
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Parent Approved Items */}
        {approvedByParentItems.length > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Parent Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {approvedByParentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.image}</span>
                    <div>
                      <p className="font-medium text-sm">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Rs. {item.amount.toLocaleString()}</p>
                    <Button size="sm" className="h-6 text-[10px] mt-1 bg-emerald-600 hover:bg-emerald-700">Purchase</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Reels Widget */}
        <PortalReelsWidget variant="child" />
      </div>
    );
  }

  // Wallet Content
  function WalletContent() {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Wallet</h2>
          <p className="text-sm text-muted-foreground">View and manage your balances</p>
        </div>

        {/* Total Balance */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6 text-center">
            <p className="text-sm opacity-80">Total Balance</p>
            <p className="text-4xl font-bold mt-2">
              {showBalance ? `Rs. ${walletData.totalBalance.toLocaleString()}` : '••••••'}
            </p>
          </CardContent>
        </Card>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Parent Balance</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                Rs. {walletData.parentLoaded.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Family pool — requires approval for purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Child wallet</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                Rs. {walletData.selfLoaded.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Your family-linked wallet (peer transfer, limits)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-violet-600" />
                <p className="text-xs text-muted-foreground">Personal wallet</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                Rs. {walletData.personalBalance.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Your main account balance — also at checkout</p>
            </CardContent>
          </Card>
        </div>

        {/* Spending Limits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Daily</span>
                <span>Rs. {spendingLimits.dailyUsed} / {spendingLimits.daily}</span>
              </div>
              <Progress
                value={
                  spendingLimits.daily > 0
                    ? Math.min(100, (spendingLimits.dailyUsed / spendingLimits.daily) * 100)
                    : 0
                }
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Weekly</span>
                <span>Rs. {spendingLimits.weeklyUsed} / {spendingLimits.weekly}</span>
              </div>
              <Progress
                value={
                  spendingLimits.weekly > 0
                    ? Math.min(100, (spendingLimits.weeklyUsed / spendingLimits.weekly) * 100)
                    : 0
                }
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Monthly</span>
                <span>Rs. {spendingLimits.monthlyUsed} / {spendingLimits.monthly}</span>
              </div>
              <Progress
                value={
                  spendingLimits.monthly > 0
                    ? Math.min(100, (spendingLimits.monthlyUsed / spendingLimits.monthly) * 100)
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <WalletShareWithKidCard
          kid={selfProfile?.kid?.trim() ? String(selfProfile.kid) : ''}
          groupName={childSummaryQuery.data?.group_name ?? ''}
        />
      </div>
    );
  }

  // Top Up Content
  function TopUpContent() {
    const qc = useQueryClient();
    const [topUpAmount, setTopUpAmount] = useState('');
    const topUpMutation = useMutation({
      mutationFn: () =>
        portalApi.childWalletTopup({
          amount: Number(topUpAmount),
          method: topUpMethod,
        }),
      onSuccess: (data) => {
        toast.success(`Added Rs. ${Number(topUpAmount).toLocaleString()}. Balance: Rs. ${data.balance.toLocaleString()}`);
        setTopUpAmount('');
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'summary'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'txns'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'rules'] });
      },
      onError: (e: Error) => toast.error(e.message || 'Could not add money.'),
    });
    const n = Number(topUpAmount);
    const canPay = Number.isFinite(n) && n >= 1;

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Add Money</h2>
          <p className="text-sm text-muted-foreground">Money is added only to your child wallet in this family group.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label>Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'esewa' as const, name: 'eSewa', icon: '💚' },
                  { id: 'khalti' as const, name: 'Khalti', icon: '💜' },
                  { id: 'qr' as const, name: 'QR Upload', icon: '📱' },
                ].map((method) => (
                  <Button
                    key={method.id}
                    variant={topUpMethod === method.id ? 'default' : 'outline'}
                    onClick={() => setTopUpMethod(method.id)}
                    className="flex-col h-auto py-4"
                  >
                    <span className="text-2xl mb-1">{method.icon}</span>
                    <span className="text-xs">{method.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Enter amount"
                className="text-lg"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
              <div className="flex gap-2">
                {[100, 500, 1000, 2000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setTopUpAmount(String(amt))}
                  >
                    Rs. {amt}
                  </Button>
                ))}
              </div>
            </div>

            {topUpMethod === 'qr' && (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <QrCode className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Proof upload can be added when payments are live.</p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!canPay || topUpMutation.isPending}
              onClick={() => topUpMutation.mutate()}
            >
              {topUpMutation.isPending ? 'Processing…' : 'Add to wallet'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Transfer Content
  function TransferContent() {
    const qc = useQueryClient();
    const [peerToId, setPeerToId] = useState('');
    const [peerAmount, setPeerAmount] = useState('');
    const [peerErr, setPeerErr] = useState('');
    const { data: peers = [], isLoading: peersLoading } = useQuery({
      queryKey: ['portal', 'child', 'peer-members', sessionTick],
      queryFn: () => portalApi.childPeerMembers(),
      enabled: authed,
    });
    const peerMutation = useMutation({
      mutationFn: () =>
        portalApi.childWalletPeerTransfer({
          to_member_id: Number(peerToId),
          amount: Number(peerAmount),
        }),
      onSuccess: () => {
        setPeerErr('');
        setPeerToId('');
        setPeerAmount('');
        toast.success('Transfer completed.');
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'summary'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'txns'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'rules'] });
      },
      onError: (e: Error) => setPeerErr(e.message || 'Transfer failed.'),
    });

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Transfer to sibling</h2>
          <p className="text-sm text-muted-foreground">
            Send from your child wallet to another child in your family only (not to arbitrary users). Your parent must
            enable peer transfers in Family Portal.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {peersLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : peers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other children in your group yet, or peer transfers are off. Ask a parent to enable “peer transfers”
                in family settings and add another child member.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Send to</Label>
                  <Select value={peerToId} onValueChange={setPeerToId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose sibling" />
                    </SelectTrigger>
                    <SelectContent>
                      {peers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (Rs.)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={peerAmount}
                    onChange={(e) => setPeerAmount(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Available:{' '}
                  <span className="font-bold text-foreground">Rs. {walletData.selfLoaded}</span>
                </p>
                {peerErr ? <p className="text-sm text-destructive">{peerErr}</p> : null}
                <Button
                  className="w-full"
                  disabled={
                    !peerToId ||
                    !peerAmount ||
                    Number(peerAmount) <= 0 ||
                    peerMutation.isPending
                  }
                  onClick={() => peerMutation.mutate()}
                >
                  {peerMutation.isPending ? 'Sending…' : 'Send'}
                </Button>
              </>
            )}
            <div className="bg-muted/50 p-3 rounded-xl">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                For transfers outside the family, your parent can use the family portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Withdraw Content
  function WithdrawContent() {
    const qc = useQueryClient();
    const [withdrawMethod, setWithdrawMethod] = useState<'esewa' | 'khalti' | 'bank'>('esewa');
    const [withdrawAccount, setWithdrawAccount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const rulesLoading = childRulesQuery.isLoading;
    const allowWithdraw = childRulesQuery.data?.group_permissions?.allow_cash_withdrawal ?? false;

    useEffect(() => {
      if (rulesLoading) return;
      if (meQuery.isPending || meQuery.isFetching) return;
      const m = meQuery.data;
      if (!m || m.kyc_required === false || m.kyc_status === 'verified') return;
      toast.message('Complete KYC verification to withdraw.');
      goTo('kyc');
    }, [rulesLoading, meQuery.data, meQuery.isPending, meQuery.isFetching, goTo]);

    const withdrawMutation = useMutation({
      mutationFn: () =>
        portalApi.childWalletWithdraw({
          amount: Number(withdrawAmount),
          bank_name: withdrawMethod === 'bank' ? 'Bank' : withdrawMethod,
          method_account: withdrawAccount.trim(),
          account_number: withdrawAccount.trim(),
        }),
      onSuccess: (data) => {
        toast.success(`Withdrawal recorded. Balance: Rs. ${data.balance.toLocaleString()}`);
        setWithdrawAmount('');
        setWithdrawAccount('');
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'summary'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'txns'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'child', 'rules'] });
      },
      onError: (e: Error) => {
        if (isPortalKycBlockedError(e)) {
          const msg = typeof e.body.detail === 'string' ? e.body.detail : 'Complete KYC verification to withdraw.';
          toast.error(msg);
          goTo('kyc');
          return;
        }
        toast.error(e.message || 'Withdrawal failed.');
      },
    });
    const wAmt = Number(withdrawAmount);
    const canSubmit =
      allowWithdraw &&
      withdrawAccount.trim().length > 0 &&
      Number.isFinite(wAmt) &&
      wAmt >= 1 &&
      wAmt <= walletData.selfLoaded;

    if (rulesLoading) {
      return (
        <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading…</div>
      );
    }

    if (!childRulesQuery.isLoading && childRulesQuery.data && !childRulesQuery.data.group_permissions) {
      return (
        <div className="p-4 lg:p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Withdraw</h2>
          <p className="text-sm text-muted-foreground">Join a family group to use withdrawals.</p>
        </div>
      );
    }

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Withdraw</h2>
          <p className="text-sm text-muted-foreground">Withdraw from your child wallet only when your parent allows it.</p>
        </div>

        {!allowWithdraw ? (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Cash withdrawal is turned off for your family. Ask a parent to enable it in Family Portal settings.
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Label>Withdraw To</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'esewa' as const, name: 'eSewa', icon: '💚' },
                    { id: 'khalti' as const, name: 'Khalti', icon: '💜' },
                    { id: 'bank' as const, name: 'Bank', icon: '🏦' },
                  ] as const
                ).map((method) => (
                  <Button
                    key={method.id}
                    type="button"
                    variant={withdrawMethod === method.id ? 'default' : 'outline'}
                    className="flex-col h-auto py-4"
                    disabled={!allowWithdraw}
                    onClick={() => setWithdrawMethod(method.id)}
                  >
                    <span className="text-2xl mb-1">{method.icon}</span>
                    <span className="text-xs">{method.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number / Account</Label>
              <Input
                placeholder="98XXXXXXXX"
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                disabled={!allowWithdraw}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (max Rs. {walletData.selfLoaded.toLocaleString()})</Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={!allowWithdraw}
              />
            </div>
            <Button
              className="w-full"
              disabled={!canSubmit || withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate()}
            >
              {withdrawMutation.isPending ? 'Processing…' : 'Withdraw'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Requests Content
  function RequestsContent() {
    if (pendingPurchaseRequests.length === 0) {
      return (
        <div className="p-4 lg:p-6">
          <EmptyState
            icon={CheckCircle}
            title="No Pending Requests"
            description="All your requests have been processed"
          />
        </div>
      );
    }

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pending Requests</h2>
          <p className="text-sm text-muted-foreground">{pendingPurchaseRequests.length} items awaiting approval</p>
        </div>

        <div className="space-y-3">
          {pendingPurchaseRequests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-2xl">
                    {req.image}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{req.item}</h4>
                    <p className="text-sm text-muted-foreground">Rs. {req.amount.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Approval
                      </Badge>
                      <span className="text-xs text-muted-foreground">{req.time}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Waiting for parent approval. You'll be notified when approved.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // History Content
  function HistoryContent() {
    return (
      <div className="p-4 lg:p-6">
        <DataTable
          title="Transaction History"
          data={recentTransactions}
          columns={[
            { 
              key: 'item', 
              label: 'Description',
              render: (tx: PortalChildWalletTxnRow) => (
                <div>
                  <p className="font-medium text-sm">{tx.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.date} · {tx.time}
                  </p>
                </div>
              ),
            },
            {
              key: 'wallet',
              label: 'Wallet',
              render: (tx: PortalChildWalletTxnRow) => (
                <Badge
                  variant={tx.type === 'self' ? 'secondary' : tx.type === 'parent' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {tx.wallet}
                </Badge>
              ),
            },
            { 
              key: 'amount', 
              label: 'Amount',
              className: 'text-right',
              render: (tx: PortalChildWalletTxnRow) => {
                const amt = childTxnAmountDisplay(tx.amount, tx.status);
                return <span className={amt.className}>{amt.text}</span>;
              },
            },
            { 
              key: 'status', 
              label: 'Status',
              render: (tx) => (
                <Badge variant={tx.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {tx.status}
                </Badge>
              )
            },
          ]}
          searchKey="item"
          searchPlaceholder="Search transactions..."
        />
      </div>
    );
  }

  // Rules Content
  function RulesContent() {
    const rules = childRulesQuery.data;
    if (childRulesQuery.isLoading) {
      return (
        <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading rules…</div>
      );
    }
    if (childRulesQuery.isError) {
      return (
        <div className="p-4 lg:p-6 text-sm text-destructive">Could not load rules. Try again later.</div>
      );
    }
    if (!rules?.group_permissions) {
      return (
        <div className="p-4 lg:p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Parent Rules</h2>
          <EmptyState
            icon={Shield}
            title="No family rules yet"
            description="When you are in an active family group, your parent’s rules will show here."
          />
        </div>
      );
    }
    const gp = rules.group_permissions;
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Parent Rules</h2>
          <p className="text-sm text-muted-foreground">What your parent allows for your account</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Family permissions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={gp.allow_online_purchases ? 'default' : 'secondary'}>
              Online purchases: {gp.allow_online_purchases ? 'On' : 'Off'}
            </Badge>
            <Badge variant={gp.allow_peer_transfers ? 'default' : 'secondary'}>
              Peer transfers: {gp.allow_peer_transfers ? 'On' : 'Off'}
            </Badge>
            <Badge variant={gp.allow_cash_withdrawal ? 'default' : 'secondary'}>
              Withdrawals: {gp.allow_cash_withdrawal ? 'On' : 'Off'}
            </Badge>
            <Badge variant="outline">Category rules: {gp.category_restrictions ? 'On' : 'Off'}</Badge>
            <Badge variant="outline">Time rules: {gp.time_based_restrictions ? 'On' : 'Off'}</Badge>
            {gp.daily_spending_limit > 0 ? (
              <Badge variant="outline">Group daily cap: Rs. {gp.daily_spending_limit.toLocaleString()}</Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category purchase rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.product_restrictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No category rules set.</p>
            ) : (
              rules.product_restrictions.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-xl"
                >
                  <span className="font-medium text-sm text-foreground">{pr.category_name}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {pr.is_blocked ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <Lock className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    ) : null}
                    {pr.requires_approval ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        Needs approval
                      </Badge>
                    ) : null}
                    {pr.max_price ? (
                      <Badge variant="outline" className="text-[10px]">
                        Max Rs. {pr.max_price}
                      </Badge>
                    ) : null}
                    {!pr.is_blocked && !pr.requires_approval && !pr.max_price ? (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Allowed
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Auto-approval rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.auto_approval_rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">None configured.</p>
            ) : (
              rules.auto_approval_rules.map((ar) => (
                <div key={ar.id} className="p-3 bg-muted/50 rounded-xl text-sm">
                  <p className="font-medium text-foreground">{ar.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ar.description || '—'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {ar.category_name || 'Any category'}
                    </Badge>
                    {ar.max_amount ? (
                      <Badge variant="outline" className="text-[10px]">
                        Max Rs. {ar.max_amount}
                      </Badge>
                    ) : null}
                    <Badge variant={ar.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {ar.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Your spending limits</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Daily</p>
                <p className="font-bold text-foreground">Rs. {spendingLimits.daily.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Weekly</p>
                <p className="font-bold text-foreground">Rs. {spendingLimits.weekly.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="font-bold text-foreground">Rs. {spendingLimits.monthly.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Help Content
  function HelpContent() {
    const { data: faqData, isLoading: faqLoading } = useQuery({
      queryKey: ['child-portal', 'support-faqs'],
      queryFn: () => portalApi.supportFaqs(),
    });
    const faqs = faqData?.results ?? [];

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <SupportTicketsHub
          variant="portal"
          listQueryKey={['child-portal', 'support-tickets']}
          title="Help & Support"
          subtitle="Message our support team or browse quick answers below."
        />

        <FaqAccordionSection faqs={faqs} title="FAQs" isLoading={faqLoading} />

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Phone className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-foreground">Contact parent</h4>
              <p className="text-xs text-muted-foreground">Ask a parent or guardian for help with your account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portalToken) {
    return (
      <UnifiedAuthLoginPage
        formProps={{
          navigateToRedirect: false,
          onSuccess: () => setSessionTick((t) => t + 1),
          oauthNext: '/child-portal/dashboard',
          authPortal: 'child-portal',
        }}
      />
    );
  }

  if (navError) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Child portal menu could not be loaded. This area requires a child account.
          </p>
          <Button variant="outline" onClick={() => setLogoutConfirmOpen(true)}>
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutConfirmOpen}
          onOpenChange={setLogoutConfirmOpen}
          description="You will be signed out of the child portal on this device."
          onConfirm={() => performPortalLogout()}
        />
      </>
    );
  }

  if (navLoading || !sidebarItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading child portal…
      </div>
    );
  }

  if (!isSegmentKnown && activeSection !== 'kyc') {
    return <Navigate to="/child-portal/dashboard" replace />;
  }

  if (childSummaryQuery.isError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4 text-center">
            <h2 className="text-lg font-semibold">Child portal</h2>
            <p className="text-sm text-muted-foreground">
              This area is only for accounts registered as a child in a family group (or with the child role).
            </p>
            <Button variant="outline" className="w-full" onClick={() => setLogoutConfirmOpen(true)}>
              Sign out
            </Button>
          </div>
        </div>
        <LogoutConfirmDialog
          open={logoutConfirmOpen}
          onOpenChange={setLogoutConfirmOpen}
          description="You will be signed out of the child portal on this device."
          onConfirm={() => performPortalLogout()}
        />
      </>
    );
  }

  return (
    <>
    <PortalLayout
      sidebar={sidebar}
      title="Child Portal"
      subtitle={showBalance ? `Total: Rs. ${walletData.totalBalance.toLocaleString()}` : 'Balance Hidden'}
      headerActions={headerActions}
      showHeroHeader={false}
    >
      {renderContent()}
    </PortalLayout>
    <PortalNotificationsModal
      open={notificationsModalOpen}
      onOpenChange={setNotificationsModalOpen}
      ordersDeepLink={null}
    />
    <FloatingCart />
    <LogoutConfirmDialog
      open={logoutConfirmOpen}
      onOpenChange={setLogoutConfirmOpen}
      description="You will be signed out of the child portal on this device."
      onConfirm={() => performPortalLogout()}
    />
    </>
  );
};

export default ChildPortal;
