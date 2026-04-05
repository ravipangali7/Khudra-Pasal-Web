import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PORTAL_LOGIN_PATH, navigateToPortalLogin, setPostLogoutLoginPath } from '@/lib/portalLoginPaths';
import { findSidebarNodeById, resolvePortalNavViewKey, usePortalSectionPath } from '@/lib/portalNavigation';
import { createFamilyPortalViewRegistry } from '@/portal/family/familyPortalViewRegistry';
import { toast } from 'sonner';
import {
  Users, Wallet, Shield, Settings, Bell, Plus, Search, 
  MoreVertical, Lock, Unlock, Eye, Edit, Trash2, 
  UserPlus, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, CreditCard, History, Filter, Download,
  Home, Banknote, ShieldCheck, Cog, FileText, Store,
  AlertOctagon, Send, UserCog, Folder, Loader2, Link2, Copy
} from 'lucide-react';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalSidebar from '@/components/portal/PortalSidebar';
import StatCard from '@/components/portal/StatCard';
import DataTable from '@/components/portal/DataTable';
import PortalReelsWidget from '@/modules/reels/portal/PortalReelsWidget';
import EmptyState from '@/components/portal/EmptyState';
import SupportTicketsHub from '@/components/support/SupportTicketsHub';
import FaqAccordionSection from '@/components/support/FaqAccordionSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import PortalMyOrdersSection from '@/components/portal/PortalMyOrdersSection';
import {
  clearAllAuthTokens,
  extractResults,
  getAuthToken,
  PortalApiError,
  portalApi,
  setCheckoutPlacedPortal,
  websiteApi,
  type PortalFamilyAutoApprovalRuleRow,
  type PortalFamilyOverview,
  type PortalFamilyMemberRow,
  type PortalFamilyProductRestrictionRow,
  type PortalFamilyWalletTxnRow,
  type PortalFamilyWalletCategoryFieldMeta,
  type WebsiteCategory,
  type WebsiteProduct,
} from '@/lib/api';
import { mapApiNavToPortalItems } from '@/lib/navIcons';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import UnifiedAuthLoginPage from '@/components/auth/UnifiedAuthLoginPage';
import ProfileMenu from '@/components/profile/ProfileMenu';
import PortalFamilyChildProfileModule from '@/components/portal/PortalFamilyChildProfileModule';
import PortalProductsCatalogSection from '@/components/portal/PortalProductsCatalogSection';
import PortalNotificationsModal from '@/components/portal/PortalNotificationsModal';
import FloatingCart from '@/components/cart/FloatingCart';

function FamilyPortalSupportFaqs() {
  const { data: faqData, isLoading, isError, error } = useQuery({
    queryKey: ['family-portal', 'support-faqs'],
    queryFn: () => portalApi.supportFaqs(),
  });
  const faqs = faqData?.results ?? [];
  return (
    <section className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Frequently asked questions</h3>
        <Badge variant="secondary" className="text-[11px]">
          {faqs.length} available
        </Badge>
      </div>
      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Could not load FAQs.'}
        </p>
      ) : (
        <FaqAccordionSection faqs={faqs} isLoading={isLoading} title="FAQ" />
      )}
    </section>
  );
}

function flattenWebsiteCategories(nodes: WebsiteCategory[]): WebsiteCategory[] {
  const acc: WebsiteCategory[] = [];
  const walk = (list: WebsiteCategory[]) => {
    for (const n of list) {
      acc.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return acc;
}

function parseFamilyLimitInput(s: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = String(s).replace(/,/g, '').trim();
  if (t === '') return { ok: true, value: 0 };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, error: 'Each limit must be a valid number.' };
  return { ok: true, value: n };
}

function validateFamilySpendingLimits(d: number, w: number, m: number): string | null {
  if (d < 0 || w < 0 || m < 0) return 'Limits cannot be negative.';
  if (d > 0 && w > 0 && d > w) return 'Daily limit cannot exceed weekly limit.';
  if (d > 0 && m > 0 && d > m) return 'Daily limit cannot exceed monthly limit.';
  if (w > 0 && m > 0 && w > m) return 'Weekly limit cannot exceed monthly limit.';
  return null;
}

const FAMILY_PRODUCT_RESTRICTIONS_QUERY_KEY = ['portal', 'family', 'product-restrictions'] as const;
const FAMILY_AUTO_APPROVAL_QUERY_KEY = ['portal', 'family', 'auto-approval'] as const;
const FAMILY_JOIN_SHARE_LINK_QUERY_KEY = ['portal', 'family', 'join-share-link'] as const;

export function FamilyPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionTick, setSessionTick] = useState(0);
  const portalToken = Boolean(getAuthToken());
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEmergencyLock, setShowEmergencyLock] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  const authed = Boolean(portalToken);

  useEffect(() => {
    setCheckoutPlacedPortal('portal_family');
  }, []);

  const { data: navData, isError: navError, isLoading: navLoading } = useQuery({
    queryKey: ['portal', 'navigation', 'family', sessionTick],
    queryFn: () => portalApi.navigation('family'),
    enabled: authed,
    retry: false,
  });

  const sidebarItems = useMemo(() => mapApiNavToPortalItems(navData?.items), [navData]);

  const { segment: activeSection, goTo, isSegmentKnown } = usePortalSectionPath('/family-portal', sidebarItems);

  const performPortalLogout = () => {
    setPostLogoutLoginPath(PORTAL_LOGIN_PATH.family);
    clearAllAuthTokens();
    setSessionTick((t) => t + 1);
    setLogoutConfirmOpen(false);
    navigateToPortalLogin(navigate, 'family');
  };

  const { data: overview } = useQuery({
    queryKey: ['portal', 'family', 'overview', sessionTick],
    queryFn: () => portalApi.familyOverview(),
    enabled: authed,
    retry: false,
    refetchOnMount: true,
  });

  const {
    data: joinRequestsListData,
    isLoading: joinRequestsListLoading,
    isError: joinRequestsListError,
    error: joinRequestsListErr,
  } = useQuery({
    queryKey: ['portal', 'family', 'join-requests-list', sessionTick],
    queryFn: () => portalApi.familyJoinRequestsList(),
    enabled: authed,
    retry: false,
  });

  const { data: selfProfile } = useQuery({
    queryKey: ['portal', 'self-profile'],
    queryFn: () => portalApi.selfProfile(),
    enabled: authed,
    retry: false,
  });

  const { data: portalSummary } = useQuery({
    queryKey: ['portal', 'summary', 'family'],
    queryFn: () => portalApi.summary(),
    enabled: authed,
    retry: false,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const notificationUnread = portalSummary?.notifications_count ?? 0;

  const { data: txResp } = useQuery({
    queryKey: ['portal', 'family', 'txns', sessionTick],
    queryFn: () => portalApi.familyWalletTransactions({ page_size: 100 }),
    enabled: authed,
    retry: false,
  });

  const { data: exploreResp } = useQuery({
    queryKey: ['portal', 'family', 'explore', sessionTick],
    queryFn: () => websiteApi.products({ page_size: 8 }),
    enabled: authed,
    retry: false,
  });

  const { data: catalogCategories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['website', 'categories', sessionTick],
    queryFn: () => websiteApi.categories(),
    enabled: authed,
    retry: false,
  });

  const familyMembers: PortalFamilyMemberRow[] = overview?.members ?? [];
  const pendingRequests = overview?.pending ?? [];
  const transactions = useMemo(() => extractResults(txResp), [txResp]);
  const walletCategories = overview?.wallet_categories ?? [];
  const exploreProducts: WebsiteProduct[] = useMemo(() => extractResults(exploreResp), [exploreResp]);

  const totalBalance =
    typeof overview?.master_wallet_balance === 'number'
      ? overview.master_wallet_balance
      : familyMembers.reduce((sum, m) => sum + m.balance, 0);
  const totalSpending = familyMembers.reduce((sum, m) => sum + m.spending, 0);

  const invalidateFamilyPortalData = () => {
    void queryClient.invalidateQueries({ queryKey: ['portal', 'family', 'overview'] });
    void queryClient.invalidateQueries({ queryKey: ['portal', 'family', 'txns'] });
    void queryClient.invalidateQueries({ queryKey: ['portal', 'family', 'join-requests-list'] });
  };

  const joinRequestActionMutation = useMutation({
    mutationFn: async (args: { id: number; action: 'approve' | 'reject' }) =>
      portalApi.familyJoinRequestPatch(args.id, args.action),
    onSuccess: (_, vars) => {
      invalidateFamilyPortalData();
      toast.success(vars.action === 'approve' ? 'Join request approved.' : 'Join request rejected.');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update request.'),
  });

  const sidebar = (
    <PortalSidebar
      items={sidebarItems}
      activeItem={activeSection}
      onItemClick={goTo}
      title="Family Portal"
    />
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <ProfileMenu
        onProfileClick={() => goTo('profile')}
        onLogout={() => setLogoutConfirmOpen(true)}
        avatarImageUrl={
          (selfProfile?.avatar_url || selfProfile?.logo_url)?.trim()
            ? String(selfProfile.avatar_url || selfProfile.logo_url)
            : null
        }
        avatarFallback="SA"
        align="end"
      />
      <Link
        to="/homepage"
        className="relative shrink-0 rounded-lg p-2 text-foreground hover:bg-muted"
        aria-label="Go to shop"
      >
        <Store className="h-5 w-5" />
      </Link>
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
      <AlertDialog open={showEmergencyLock} onOpenChange={setShowEmergencyLock}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-1.5">
            <AlertOctagon className="w-4 h-4" />
            <span className="hidden sm:inline">Emergency Lock</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="w-5 h-5" />
              Emergency Lock All Wallets
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately freeze all member wallets. No transactions will be allowed until you unlock them. This action requires OTP verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Lock All Wallets (OTP Required)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const renderContent = () => {
    const activeNode = findSidebarNodeById(sidebarItems, activeSection);
    const viewKey = resolvePortalNavViewKey(activeNode, activeSection);

    const registry = createFamilyPortalViewRegistry({
      dashboard: () => <DashboardContent />,
      members: () => <MembersContent />,
      membersAdd: () => <AddMemberContent />,
      membersRequests: () => <JoinRequestsContent />,
      wallets: () => <WalletsContent />,
      spendingLimits: () => <SpendingLimitsContent />,
      productRestrictions: () => <ProductRestrictionsContent />,
      autoApproval: () => <AutoApprovalContent />,
      history: () => <TransactionHistoryContent />,
      products: () => <PortalProductsCatalogSection variant="family" />,
      myOrders: () => (
        <div className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">My orders</h2>
          <PortalMyOrdersSection surface="family" sessionTick={sessionTick} authed={authed} />
        </div>
      ),
      support: () => (
        <div className="w-full max-w-none space-y-8 md:space-y-10">
          <SupportTicketsHub
            variant="portal"
            listQueryKey={['family-portal', 'support-tickets']}
            title="Support"
            subtitle="Open a ticket for your family account. Our team will respond here."
          />
          <FamilyPortalSupportFaqs />
        </div>
      ),
      settings: () => <SettingsContent />,
      profile: () => <PortalFamilyChildProfileModule variant="family" onLogoutClick={performPortalLogout} />,
    });

    const renderer = registry[viewKey];
    if (renderer) return renderer();

    console.warn("Missing family portal view renderer", {
      viewKey,
      sectionId: activeSection,
    });
    return (
      <EmptyState
        icon={AlertTriangle}
        title="This section isn't available yet"
        description="The server returned a navigation item, but the frontend has no matching screen."
      />
    );
  };

  // Dashboard Content
  function DashboardContent() {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard 
            icon={Wallet} 
            title="Total Balance" 
            value={`Rs. ${totalBalance.toLocaleString()}`}
            colorClass="border-l-emerald-500"
          />
          <StatCard 
            icon={TrendingUp} 
            title="This Month" 
            value={`Rs. ${totalSpending.toLocaleString()}`}
            subtitle="Total spending"
            colorClass="border-l-blue-500"
          />
          <StatCard 
            icon={Users} 
            title="Members" 
            value={familyMembers.length}
            subtitle={`${familyMembers.filter(m => m.status === 'active').length} active`}
            colorClass="border-l-purple-500"
          />
          <StatCard 
            icon={Clock} 
            title="Pending" 
            value={pendingRequests.length}
            subtitle="Requests"
            colorClass="border-l-orange-500"
            onClick={() => goTo('members-requests')}
          />
        </div>

        {/* Pending Approvals */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{request.member}</span>
                      <Badge variant="outline" className="text-[10px]">{request.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {request.item} {request.amount > 0 && `• Rs. ${request.amount.toLocaleString()}`} • {request.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-100"
                      disabled={
                        !request.join_request_id || joinRequestActionMutation.isPending
                      }
                      title={
                        request.join_request_id
                          ? 'Approve join request'
                          : 'No join request linked (legacy invite only)'
                      }
                      onClick={() => {
                        if (!request.join_request_id) return;
                        joinRequestActionMutation.mutate({
                          id: Number(request.join_request_id),
                          action: 'approve',
                        });
                      }}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      disabled={
                        !request.join_request_id || joinRequestActionMutation.isPending
                      }
                      onClick={() => {
                        if (!request.join_request_id) return;
                        joinRequestActionMutation.mutate({
                          id: Number(request.join_request_id),
                          action: 'reject',
                        });
                      }}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions & Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: UserPlus, label: 'Add Member', color: 'bg-blue-500', action: () => goTo('members-add') },
                  { icon: CreditCard, label: 'Load Money', color: 'bg-emerald-500', action: () => goTo('wallets-load') },
                  { icon: Shield, label: 'Set Rules', color: 'bg-purple-500', action: () => goTo('controls') },
                  { icon: History, label: 'View History', color: 'bg-orange-500', action: () => goTo('history') },
                ].map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="flex-col h-auto py-4 gap-2"
                    onClick={action.action}
                  >
                    <div className={cn("p-2 rounded-lg text-white", action.color)}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Member Spending Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Member Spending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {familyMembers.filter(m => m.status === 'active').slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">{member.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Rs. {member.spending} / {member.limit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] text-muted-foreground shrink-0">Personal wallet</span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        Rs. {member.balance.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (member.spending / Math.max(member.limit, 1)) * 100)}
                      className="h-1.5"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Browse Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Browse Products</CardTitle>
            <CardDescription className="text-xs">Products available to your family</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exploreProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No products to show.</p>
              ) : (
                exploreProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    className="p-3 rounded-xl border hover:border-primary/50 transition-colors block"
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="w-full h-16 object-contain mb-2 rounded-md bg-muted/30"
                      />
                    ) : (
                      <div className="text-3xl mb-2 text-center">🛒</div>
                    )}
                    <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.category_name}</p>
                    <p className="text-xs font-bold text-primary mt-1">
                      Rs. {Number(product.price).toLocaleString("en-NP")}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reels Widget */}
        <PortalReelsWidget variant="family" />
      </div>
    );
  }

  // Members Content
  function MembersContent() {
    const qc = useQueryClient();
    const groupName = overview?.group?.name ?? 'Your family';
    const viewer = overview?.viewer ?? null;
    const pendingJoinRows = (overview?.join_requests ?? []).filter((jr) => jr.status === 'pending');

    const [detailMember, setDetailMember] = useState<PortalFamilyMemberRow | null>(null);
    const [limitsMember, setLimitsMember] = useState<PortalFamilyMemberRow | null>(null);
    const [limDaily, setLimDaily] = useState('');
    const [limWeekly, setLimWeekly] = useState('');
    const [limMonthly, setLimMonthly] = useState('');
    const [freezeTarget, setFreezeTarget] = useState<PortalFamilyMemberRow | null>(null);
    const [removeTarget, setRemoveTarget] = useState<PortalFamilyMemberRow | null>(null);

    useEffect(() => {
      if (!limitsMember) return;
      setLimDaily(String(limitsMember.spending_limit_daily ?? 0));
      setLimWeekly(String(limitsMember.spending_limit_weekly ?? 0));
      setLimMonthly(String(limitsMember.spending_limit_monthly ?? limitsMember.limit ?? 0));
    }, [limitsMember]);

    const invalidateOverview = () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'family', 'overview'] });
      void qc.invalidateQueries({ queryKey: ['portal', 'family', 'txns'] });
    };

    const roleMutation = useMutation({
      mutationFn: ({ id, role }: { id: string; role: string }) =>
        portalApi.familyMemberUpdateRole(id, role),
      onSuccess: () => {
        invalidateOverview();
        toast.success('Role updated');
      },
      onError: (e: Error) => toast.error(e.message || 'Could not update role'),
    });

    const limitsMemberRef = useRef<PortalFamilyMemberRow | null>(null);
    limitsMemberRef.current = limitsMember;
    const limStateRef = useRef({ d: '', w: '', m: '' });
    limStateRef.current.d = limDaily;
    limStateRef.current.w = limWeekly;
    limStateRef.current.m = limMonthly;
    const limitsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const patchLimitsMutation = useMutation({
      mutationFn: (args: {
        id: string;
        spending_limit_daily: number;
        spending_limit_weekly: number;
        spending_limit_monthly: number;
      }) =>
        portalApi.familyMemberPatch(args.id, {
          spending_limit_daily: args.spending_limit_daily,
          spending_limit_weekly: args.spending_limit_weekly,
          spending_limit_monthly: args.spending_limit_monthly,
        }),
      onSuccess: () => {
        invalidateOverview();
      },
      onError: (e: Error) => toast.error(e.message || 'Could not update limits'),
    });

    const scheduleLimitsAutosave = () => {
      const m = limitsMemberRef.current;
      if (!m) return;
      if (limitsSaveTimerRef.current) clearTimeout(limitsSaveTimerRef.current);
      limitsSaveTimerRef.current = setTimeout(() => {
        limitsSaveTimerRef.current = null;
        const cur = limitsMemberRef.current;
        if (!cur) return;
        const { d, w, m } = limStateRef.current;
        patchLimitsMutation.mutate({
          id: cur.id,
          spending_limit_daily: parseLim(d),
          spending_limit_weekly: parseLim(w),
          spending_limit_monthly: parseLim(m),
        });
      }, 550);
    };

    const patchStatusMutation = useMutation({
      mutationFn: (args: { id: string; status: 'active' | 'frozen' }) =>
        portalApi.familyMemberPatch(args.id, { status: args.status }),
      onSuccess: (_, v) => {
        invalidateOverview();
        toast.success(v.status === 'frozen' ? 'Wallet frozen' : 'Wallet unfrozen');
        setFreezeTarget(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Could not update wallet status'),
    });

    const deleteMemberMutation = useMutation({
      mutationFn: (id: string) => portalApi.familyMemberDelete(id),
      onSuccess: () => {
        invalidateOverview();
        toast.success('Member removed from family');
        setRemoveTarget(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Could not remove member'),
    });

    const roleOptions = [
      { value: 'parent', label: 'Parent' },
      { value: 'child', label: 'Child' },
      { value: 'spouse', label: 'Co-parent' },
      { value: 'manager', label: 'Manager' },
      { value: 'guest', label: 'Guest' },
    ];

    const parseLim = (s: string) => {
      const n = Number(String(s).replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Family Members</h2>
            <p className="text-sm text-muted-foreground">
              {familyMembers.length} active member{familyMembers.length === 1 ? '' : 's'} · Group:{' '}
              <span className="font-medium text-foreground">{groupName}</span>
            </p>
          </div>
          <Button onClick={() => goTo('members-add')}>
            <Plus className="w-4 h-4 mr-1" />
            Add Member
          </Button>
        </div>

        {pendingJoinRows.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Pending invites</h3>
            <div className="grid gap-2">
              {pendingJoinRows.map((jr) => (
                <Card key={jr.id} className="border-dashed">
                  <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{jr.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {jr.phone} · Role: <span className="capitalize">{jr.role}</span> · {groupName}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {jr.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {familyMembers.map((member) => {
            const isLeaderRow = Boolean(member.is_leader);
            const isOnline = Boolean(member.is_online);
            const presenceColorClass = isLeaderRow
              ? 'bg-emerald-500'
              : isOnline
                ? 'bg-blue-500'
                : 'bg-slate-500';
            const isSelf = Boolean(viewer?.family_member_id && viewer.family_member_id === member.id);
            const showMutations = !isLeaderRow;
            return (
              <Card key={member.id} className={cn(member.status === 'frozen' && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                          {member.avatar}
                        </div>
                        <span
                          className={cn(
                            'absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                            presenceColorClass,
                          )}
                          aria-label={isLeaderRow ? 'Leader online status' : isOnline ? 'Online' : 'Offline'}
                          title={isLeaderRow ? 'Leader' : isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground">{member.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{member.phone}</p>
                        <p className="text-xs font-medium text-foreground mt-0.5 tabular-nums">
                          Personal wallet · Rs. {member.balance.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Group: {member.group?.name ?? groupName}
                          {isLeaderRow ? ' · Group leader' : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Select
                            value={member.role}
                            onValueChange={(role) => roleMutation.mutate({ id: member.id, role })}
                            disabled={isLeaderRow || roleMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-[10px] capitalize">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value} className="text-xs capitalize">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge
                            variant={
                              member.status === 'active'
                                ? 'default'
                                : member.status === 'frozen'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className={cn('text-[10px]', member.status === 'active' && 'bg-emerald-500')}
                          >
                            {member.status === 'frozen' && <Lock className="w-2 h-2 mr-1" />}
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailMember(member)}>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        {showMutations ? (
                          <DropdownMenuItem onClick={() => setLimitsMember(member)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Limits
                          </DropdownMenuItem>
                        ) : null}
                        {showMutations ? (
                          <DropdownMenuItem onClick={() => setFreezeTarget(member)}>
                            {member.status === 'frozen' ? (
                              <>
                                <Unlock className="w-4 h-4 mr-2" /> Unfreeze Wallet
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" /> Freeze Wallet
                              </>
                            )}
                          </DropdownMenuItem>
                        ) : null}
                        {showMutations && !isSelf ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRemoveTarget(member)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove Member
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Personal wallet</p>
                      <p className="font-semibold text-foreground tabular-nums">
                        Rs. {member.balance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Spent</p>
                      <p className="font-semibold text-foreground">Rs. {member.spending.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Limit</p>
                      <p className="font-semibold text-foreground">Rs. {member.limit.toLocaleString()}</p>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (member.spending / Math.max(member.limit, 1)) * 100)}
                    className="h-2 mt-3"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={!!detailMember} onOpenChange={(o) => !o && setDetailMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Member details</DialogTitle>
              <DialogDescription className="text-xs">
                {detailMember?.name} · {detailMember?.phone}
              </DialogDescription>
            </DialogHeader>
            {detailMember ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Role:</span>{' '}
                  <span className="capitalize font-medium">{detailMember.role}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="capitalize">{detailMember.status}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Wallet ID:</span>{' '}
                  <span className="font-mono text-xs">{detailMember.wallet_id ?? '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Daily / weekly / monthly limits:</span>{' '}
                  Rs. {(detailMember.spending_limit_daily ?? 0).toLocaleString()} / Rs.{' '}
                  {(detailMember.spending_limit_weekly ?? 0).toLocaleString()} / Rs.{' '}
                  {(detailMember.spending_limit_monthly ?? detailMember.limit).toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Personal wallet:</span> Rs.{' '}
                  {detailMember.balance.toLocaleString()}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setDetailMember(null);
                    goTo('history');
                  }}
                >
                  View transaction history
                </Button>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailMember(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!limitsMember} onOpenChange={(o) => !o && setLimitsMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit spending limits</DialogTitle>
              <DialogDescription className="text-xs">
                {limitsMember?.name} — daily, weekly, and monthly caps (Rs.)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <p className="text-xs text-muted-foreground">
                Edits save automatically after you pause typing. {patchLimitsMutation.isPending ? 'Saving…' : null}
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Daily</Label>
                <Input
                  className="h-9"
                  value={limDaily}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLimDaily(v);
                    limStateRef.current.d = v;
                    scheduleLimitsAutosave();
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weekly</Label>
                <Input
                  className="h-9"
                  value={limWeekly}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLimWeekly(v);
                    limStateRef.current.w = v;
                    scheduleLimitsAutosave();
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly</Label>
                <Input
                  className="h-9"
                  value={limMonthly}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLimMonthly(v);
                    limStateRef.current.m = v;
                    scheduleLimitsAutosave();
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (limitsSaveTimerRef.current) clearTimeout(limitsSaveTimerRef.current);
                  setLimitsMember(null);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!freezeTarget} onOpenChange={(o) => !o && setFreezeTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {freezeTarget?.status === 'frozen' ? 'Unfreeze wallet' : 'Freeze wallet'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {freezeTarget?.status === 'frozen'
                  ? `Restore spending for ${freezeTarget?.name}? Their member wallets will be active again.`
                  : `Freeze wallets for ${freezeTarget?.name}? They will not be able to spend until unfrozen.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!freezeTarget || patchStatusMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (!freezeTarget) return;
                  patchStatusMutation.mutate({
                    id: freezeTarget.id,
                    status: freezeTarget.status === 'frozen' ? 'active' : 'frozen',
                  });
                }}
              >
                {patchStatusMutation.isPending ? '…' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Remove {removeTarget?.name} from this family group? This cannot be undone from the portal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!removeTarget || deleteMemberMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (!removeTarget) return;
                  deleteMemberMutation.mutate(removeTarget.id);
                }}
              >
                {deleteMemberMutation.isPending ? '…' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Add Member Content
  function AddMemberContent() {
    type DraftRow = { key: string; name: string; email: string; phone: string; role: string; age: string };
    const queryClient = useQueryClient();
    const addMemberRoleOptions = useMemo(() => {
      const fromApi = overview?.add_member_roles;
      if (fromApi && fromApi.length > 0) return fromApi;
      return [
        { value: 'child', label: 'Child' },
        { value: 'spouse', label: 'Co-parent' },
        { value: 'manager', label: 'Manager' },
        { value: 'guest', label: 'Guest' },
      ];
    }, [overview?.add_member_roles]);
    const defaultMemberRole = addMemberRoleOptions[0]?.value ?? 'child';

    const [step, setStep] = useState<'form' | 'done'>('form');
    const [rows, setRows] = useState<DraftRow[]>([
      { key: 'r0', name: '', email: '', phone: '', role: defaultMemberRole, age: '' },
    ]);
    const [limit, setLimit] = useState('');
    const [initialBal, setInitialBal] = useState('0');
    const lastInviteDefaultRef = useRef<number | null | undefined | typeof NaN>(NaN);

    useEffect(() => {
      const d = overview?.batch_invite_defaults?.spending_limit ?? null;
      if (Object.is(lastInviteDefaultRef.current, d)) return;
      lastInviteDefaultRef.current = d;
      setLimit(d != null ? String(d) : '');
    }, [overview?.batch_invite_defaults?.spending_limit]);
    const [submitErr, setSubmitErr] = useState('');
    const [addedMembers, setAddedMembers] = useState<PortalFamilyMemberRow[]>([]);

    const updateRow = (key: string, patch: Partial<DraftRow>) => {
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    };

    const addRow = () => {
      setRows((prev) => [
        ...prev,
        { key: `r${Date.now()}`, name: '', email: '', phone: '', role: defaultMemberRole, age: '' },
      ]);
    };

    const removeRow = (key: string) => {
      setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
    };

    const addMembersMutation = useMutation({
      mutationFn: async () => {
        const members = rows
          .filter((r) => r.phone.replace(/\D/g, '').length >= 10)
          .map((r) => ({
            name: (r.name.trim() || r.phone.trim() || 'Family member').slice(0, 150),
            email: r.email.trim(),
            phone: r.phone.replace(/\D/g, '').slice(0, 15),
            role: r.role,
            age: r.age.trim() ? Number(r.age) : undefined,
          }));
        if (!members.length) {
          throw new Error('Add at least one valid 10-digit phone number.');
        }
        const res = await portalApi.familyAddMembersBatch({
          members,
          spending_limit: limit,
          initial_balance: initialBal,
        });
        return res.results.map((x) => x.member);
      },
      onSuccess: (data) => {
        setAddedMembers(data);
        setSubmitErr('');
        setStep('done');
        void queryClient.invalidateQueries({ queryKey: ['portal', 'family', 'overview'] });
        void queryClient.invalidateQueries({ queryKey: ['portal', 'family', 'join-requests-list'] });
      },
      onError: (e: Error) => {
        setSubmitErr(e.message || 'Could not add members.');
      },
    });

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Add members</h2>
          <p className="text-sm text-muted-foreground">
            New members are saved to your family group immediately. Child accounts can sign in to the child portal
            with their phone once they complete login setup.
          </p>
        </div>

        {step === 'form' && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Group</Label>
                {overview?.group ? (
                  <>
                    <p className="font-semibold text-foreground">{overview.group.name}</p>
                    <p className="text-[10px] text-muted-foreground">Members are added to this group automatically.</p>
                  </>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    No family group found. Create a family from the customer portal first, then return here.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {rows.map((row, idx) => (
                  <div
                    key={row.key}
                    className="rounded-xl border border-border p-4 space-y-3 bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Member {idx + 1}
                      </span>
                      {rows.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Full name"
                          value={row.name}
                          onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          placeholder="98XXXXXXXX"
                          value={row.phone}
                          onChange={(e) => updateRow(row.key, { phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email (optional)</Label>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={row.email}
                          onChange={(e) => updateRow(row.key, { email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role</Label>
                        <Select
                          value={row.role}
                          onValueChange={(v) => updateRow(row.key, { role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {addMemberRoleOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-sm capitalize">
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Age (optional)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          placeholder="e.g. 12"
                          value={row.age}
                          onChange={(e) => updateRow(row.key, { age: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={addRow}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add another member
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly spending limit (shared)</Label>
                  <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Initial balance (shared)</Label>
                  <Input
                    type="number"
                    value={initialBal}
                    onChange={(e) => setInitialBal(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {submitErr ? <p className="text-sm text-destructive">{submitErr}</p> : null}

              <Button
                className="w-full"
                disabled={addMembersMutation.isPending || !overview?.group}
                onClick={() => addMembersMutation.mutate()}
              >
                {addMembersMutation.isPending ? 'Saving…' : 'Save members'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'done' && addedMembers.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Members added</h3>
                <p className="text-sm text-muted-foreground">
                  They appear in All Members with the correct role and group. Child accounts use the child portal
                  after they sign in with their phone.
                </p>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {addedMembers.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.phone} · <span className="capitalize">{m.role}</span>
                      {m.group?.name ? ` · ${m.group.name}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setStep('form');
                  setAddedMembers([]);
                  setRows([{ key: 'r0', name: '', email: '', phone: '', role: defaultMemberRole, age: '' }]);
                  goTo('members-list');
                }}
              >
                View members
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Join Requests Content
  function JoinRequestsContent() {
    const rows = joinRequestsListData?.results ?? [];
    const pendingInv = pendingRequests.filter((r) => r.type === 'join');

    const { data: shareLinkState, isLoading: shareLinkLoading } = useQuery({
      queryKey: [...FAMILY_JOIN_SHARE_LINK_QUERY_KEY, sessionTick],
      queryFn: () => portalApi.familyJoinShareLinkGet(),
      retry: false,
    });

    const shareLinkCreateMutation = useMutation({
      mutationFn: (payload?: {
        title?: string;
        welcome_message?: string;
        default_role?: string;
        expires_in_days?: number | null;
      }) => portalApi.familyJoinShareLinkCreate(payload),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: FAMILY_JOIN_SHARE_LINK_QUERY_KEY });
        toast.success('Share link is ready. Copy it and send it to anyone you trust.');
      },
      onError: (e: Error) => toast.error(e.message || 'Could not create share link.'),
    });

    const copyJoinUrl = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard.');
      } catch {
        toast.error('Could not copy. Select the link and copy manually.');
      }
    };

    const statusBadge = (s: string) => {
      if (s === 'pending') return <Badge variant="outline">Pending</Badge>;
      if (s === 'approved') return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
      if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
      return <Badge variant="secondary">{s}</Badge>;
    };

    const formatDt = (iso: string | null | undefined) => {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleString();
      } catch {
        return iso;
      }
    };

    if (joinRequestsListLoading) {
      return (
        <div className="p-4 lg:p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading join requests…</span>
        </div>
      );
    }

    if (joinRequestsListError) {
      return (
        <div className="p-4 lg:p-6">
          <Card className="border-destructive/50">
            <CardContent className="p-4 text-sm text-destructive">
              {joinRequestsListErr instanceof Error ? joinRequestsListErr.message : 'Could not load join requests.'}
            </CardContent>
          </Card>
        </div>
      );
    }

    const shareJoinUrl =
      shareLinkState?.active && shareLinkState.token
        ? (() => {
            const j = shareLinkState.join_url?.trim();
            if (j) return j;
            const viteBase = import.meta.env.VITE_PUBLIC_APP_URL?.toString().trim().replace(/\/$/, "");
            const origin = viteBase || window.location.origin;
            return `${origin}/join-family/${encodeURIComponent(shareLinkState.token)}`;
          })()
        : null;

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Join requests</h2>
          <p className="text-sm text-muted-foreground">
            Approve to add the member to your family. Reject to decline, expire the linked invite when applicable, and
            notify applicants who used the public link by SMS.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Shareable join link
            </CardTitle>
            <CardDescription>
              Anyone with the link can submit a join request. New links replace the previous one. Only organizers can
              create links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {shareLinkLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading link…
              </div>
            ) : shareJoinUrl ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={shareJoinUrl} className="font-mono text-xs sm:text-sm" />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyJoinUrl(shareJoinUrl)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={shareLinkCreateMutation.isPending}
                      onClick={() => shareLinkCreateMutation.mutate({})}
                    >
                      {shareLinkCreateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'New link'
                      )}
                    </Button>
                  </div>
                </div>
                {shareLinkState.expires_at ? (
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(shareLinkState.expires_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                disabled={shareLinkCreateMutation.isPending}
                onClick={() => shareLinkCreateMutation.mutate({})}
              >
                {shareLinkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  'Generate share link'
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No join requests"
            description="When someone submits a family invite request, it will appear here."
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((jr) => (
                  <TableRow key={jr.id}>
                    <TableCell>
                      <div className="font-medium text-foreground flex flex-wrap items-center gap-2">
                        {jr.name}
                        {jr.source === 'share_link' ? (
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            Link
                          </Badge>
                        ) : null}
                      </div>
                      {jr.requested_by_name ? (
                        <div className="text-xs text-muted-foreground">Requested by {jr.requested_by_name}</div>
                      ) : jr.source === 'share_link' ? (
                        <div className="text-xs text-muted-foreground">Via share link</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{jr.phone}</TableCell>
                    <TableCell className="capitalize">{jr.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDt(jr.created_at)}
                    </TableCell>
                    <TableCell>{statusBadge(jr.status)}</TableCell>
                    <TableCell className="text-right">
                      {jr.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600"
                            disabled={joinRequestActionMutation.isPending}
                            onClick={() =>
                              joinRequestActionMutation.mutate({ id: jr.id, action: 'approve' })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={joinRequestActionMutation.isPending}
                            onClick={() =>
                              joinRequestActionMutation.mutate({ id: jr.id, action: 'reject' })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {jr.reviewed_at ? formatDt(jr.reviewed_at) : '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {pendingInv.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Pending approvals (dashboard)</h2>
            <p className="text-sm text-muted-foreground">
              Other pending items from the family overview (e.g. purchase approvals).
            </p>
            <div className="space-y-3">
              {pendingInv.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{request.member}</p>
                      <p className="text-sm text-muted-foreground">{request.item}</p>
                    </div>
                    <Badge variant="secondary">Rs. {request.amount.toLocaleString()}</Badge>
                    <span className="text-xs text-muted-foreground w-full sm:w-auto">{request.time}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wallets Content
  function WalletsContent() {
    type WalletPickerOption = {
      walletId: string;
      label: string;
      isShared: boolean;
      memberRole?: string;
    };

    const qc = useQueryClient();
    const [showLoadMoney, setShowLoadMoney] = useState(false);
    const [showDistribute, setShowDistribute] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [loadAmount, setLoadAmount] = useState('');
    const [loadMethod, setLoadMethod] = useState('esewa');
    const [distMember, setDistMember] = useState('');
    const [distAmount, setDistAmount] = useState('');
    const [distCategoryId, setDistCategoryId] = useState<string>('');
    const [transFromWallet, setTransFromWallet] = useState('');
    const [transToWallet, setTransToWallet] = useState('');
    const [transCategoryId, setTransCategoryId] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [categoryFieldValues, setCategoryFieldValues] = useState<
      Record<string, string | number | string[]>
    >({});
    const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
    const [walletErr, setWalletErr] = useState('');

    const { data: categoryMeta } = useQuery({
      queryKey: ['portal', 'family', 'wallet-category-meta'],
      queryFn: () => portalApi.familyWalletCategoryMeta(),
      enabled: showNewCategory,
    });

    useEffect(() => {
      if (!showNewCategory || !categoryMeta?.fields?.length) return;
      const next: Record<string, string | number | string[]> = {};
      for (const f of categoryMeta.fields) {
        if (f.type === 'file') continue;
        if (f.type === 'multiselect') {
          const d = f.default;
          next[f.name] = [...(Array.isArray(d) ? d : ['child'])];
        } else if (f.type === 'integer') {
          next[f.name] = typeof f.default === 'number' ? f.default : 0;
        } else {
          next[f.name] = '';
        }
      }
      setCategoryFieldValues(next);
      setCategoryImageFile(null);
    }, [showNewCategory, categoryMeta]);

    const invFamily = () => {
      void qc.invalidateQueries({ queryKey: ['portal', 'family', 'overview'] });
      void qc.invalidateQueries({ queryKey: ['portal', 'family', 'txns'] });
    };

    const loadMutation = useMutation({
      mutationFn: () =>
        portalApi.familyWalletLoad({
          amount: Number(loadAmount),
          method: loadMethod,
        }),
      onSuccess: () => {
        setWalletErr('');
        setShowLoadMoney(false);
        setLoadAmount('');
        invFamily();
      },
      onError: (e: Error) => setWalletErr(e.message),
    });

    const distributeMutation = useMutation({
      mutationFn: () =>
        portalApi.familyWalletDistribute({
          member_id: Number(distMember),
          amount: Number(distAmount),
          category_id:
            distCategoryId && distCategoryId !== 'default'
              ? Number(distCategoryId)
              : undefined,
        }),
      onSuccess: () => {
        setWalletErr('');
        setShowDistribute(false);
        setDistMember('');
        setDistAmount('');
        invFamily();
      },
      onError: (e: Error) => setWalletErr(e.message),
    });

    const transferMutation = useMutation({
      mutationFn: () =>
        portalApi.familyWalletTransfer({
          from_wallet_id: transFromWallet,
          to_wallet_id: transToWallet,
          amount: Number(transAmount),
          category_id:
            transCategoryId && transCategoryId !== 'default'
              ? Number(transCategoryId)
              : undefined,
        }),
      onSuccess: () => {
        setWalletErr('');
        setShowTransfer(false);
        setTransFromWallet('');
        setTransToWallet('');
        setTransCategoryId('');
        setTransAmount('');
        invFamily();
      },
      onError: (e: Error) => setWalletErr(e.message),
    });

    const categoryMutation = useMutation({
      mutationFn: () => {
        const fields = categoryMeta?.fields;
        if (!fields?.length) throw new Error('Form not ready');
        const fd = new FormData();
        for (const f of fields) {
          if (f.type === 'file') {
            if (categoryImageFile) fd.append(f.name, categoryImageFile);
            continue;
          }
          const v = categoryFieldValues[f.name];
          if (f.type === 'multiselect') {
            const arr = Array.isArray(v) ? v : [];
            for (const x of arr) fd.append(f.name, String(x));
          } else if (f.type === 'integer') {
            fd.append(f.name, String(v ?? f.default ?? 0));
          } else {
            fd.append(f.name, String(v ?? ''));
          }
        }
        return portalApi.familyWalletCategoryCreate(fd);
      },
      onSuccess: () => {
        setWalletErr('');
        setShowNewCategory(false);
        setCategoryFieldValues({});
        setCategoryImageFile(null);
        invFamily();
      },
      onError: (e: Error) => setWalletErr(e.message),
    });

    const categoryOptions = walletCategories.filter((w) => w.category_id);

    const walletPickerOptions: WalletPickerOption[] = useMemo(() => {
      const shared: WalletPickerOption[] = walletCategories.map((w) => ({
        walletId: w.id,
        label: `${w.name} (family bucket) · Rs. ${w.balance.toLocaleString()}`,
        isShared: true,
      }));
      const members: WalletPickerOption[] = familyMembers
        .filter((m) => m.wallet_id)
        .map((m) => ({
          walletId: m.wallet_id as string,
          label: `${m.avatar} ${m.name} (${m.role}) · Rs. ${m.balance.toLocaleString()}`,
          isShared: false,
          memberRole: m.role,
        }));
      return [...shared, ...members];
    }, [walletCategories, familyMembers]);

    const distributeMembers = useMemo(
      () => familyMembers.filter((m) => m.role === 'child'),
      [familyMembers],
    );

    const distributeCategoryOptions = useMemo(
      () =>
        categoryOptions.filter((w) => {
          const ar = w.allowed_member_roles;
          if (!ar?.length) return true;
          return ar.includes('child');
        }),
      [categoryOptions],
    );

    const transFromOpt = walletPickerOptions.find((o) => o.walletId === transFromWallet);
    const transToOpt = walletPickerOptions.find((o) => o.walletId === transToWallet);
    const transferCategoryOptions = useMemo(() => {
      if (!transFromOpt || !transToOpt) return categoryOptions;
      if (transFromOpt.isShared || transToOpt.isShared) return categoryOptions;
      const ra = transFromOpt.memberRole;
      const rb = transToOpt.memberRole;
      return categoryOptions.filter((w) => {
        const ar = w.allowed_member_roles;
        if (!ar?.length) return true;
        return Boolean(ra && rb && ar.includes(ra) && ar.includes(rb));
      });
    }, [categoryOptions, transFromOpt, transToOpt]);

    const newCategoryNameTrim = String(categoryFieldValues.name ?? '').trim();

    const parentWalletMember = useMemo(
      () => familyMembers.find((m) => m.is_leader || m.role === 'parent'),
      [familyMembers],
    );
    const showMasterSummaryUnderPersonal = totalBalance > 0;
    const showParentMemberBalanceLine =
      Boolean(parentWalletMember && parentWalletMember.balance > 0);

    const masterActionBtn =
      'bg-white/95 text-amber-950 shadow-sm hover:bg-white border-0 dark:bg-amber-950/35 dark:text-amber-50 dark:hover:bg-amber-950/55';

    const openLoad = () => {
      setWalletErr('');
      setShowLoadMoney(true);
    };
    const openDistribute = () => {
      setWalletErr('');
      setShowDistribute(true);
    };
    const openTransfer = () => {
      setWalletErr('');
      setShowTransfer(true);
    };

    const walletColumnShell =
      'space-y-3 min-w-0 rounded-xl border border-amber-200/90 bg-white/70 dark:bg-amber-950/30 dark:border-amber-800/50 p-4 shadow-sm';
    const walletRowCard =
      'border-amber-200/80 bg-white dark:bg-amber-950/40 dark:border-amber-800/50';

    return (
      <>
        <div className="p-4 lg:p-6">
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 via-amber-100/85 to-amber-100 dark:from-amber-950/45 dark:via-amber-950/35 dark:to-amber-950/50 dark:border-amber-800/55 p-4 lg:p-6 space-y-4 shadow-sm">
            <Card className="overflow-hidden border-amber-400/50 shadow-md bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white dark:border-amber-700/50 dark:from-amber-500 dark:via-amber-600 dark:to-orange-600">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-white/90">Master Wallet</p>
                <p className="text-3xl font-bold mt-1 tabular-nums tracking-tight text-white">
                  Rs. {totalBalance.toLocaleString()}
                </p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button size="sm" className={masterActionBtn} onClick={openLoad}>
                    Load Money
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openDistribute}>
                    Distribute
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openTransfer}>
                    Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div
              className="h-px w-full bg-amber-300/70 dark:bg-amber-700/45"
              role="presentation"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
              <div className={walletColumnShell}>
                <h3 className="font-bold text-amber-950 dark:text-amber-50 text-base">Personal wallet</h3>
                {(showMasterSummaryUnderPersonal || showParentMemberBalanceLine) && (
                  <div className="rounded-lg border border-amber-300/80 bg-amber-100/70 dark:border-amber-700/45 dark:bg-amber-900/35 px-3 py-2.5 space-y-1.5 text-sm">
                    {showMasterSummaryUnderPersonal ? (
                      <p className="text-amber-950 dark:text-amber-100">
                        <span className="font-medium text-amber-900 dark:text-amber-50">Family master wallet</span>
                        <span className="mx-1.5 text-amber-800/70 dark:text-amber-200/70">·</span>
                        <span className="font-bold tabular-nums">Rs. {totalBalance.toLocaleString()}</span>
                      </p>
                    ) : null}
                    {showParentMemberBalanceLine && parentWalletMember ? (
                      <p className="text-amber-950 dark:text-amber-100">
                        <span className="font-medium text-amber-900 dark:text-amber-50">Parent wallet</span>
                        <span className="mx-1.5 text-amber-800/70 dark:text-amber-200/70">·</span>
                        <span className="font-bold tabular-nums">
                          Rs. {parentWalletMember.balance.toLocaleString()}
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className={masterActionBtn} onClick={openLoad}>
                    Load Money
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openDistribute}>
                    Distribute
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openTransfer}>
                    Transfer
                  </Button>
                </div>
                <div className="grid gap-3 pt-1">
                  {familyMembers.length === 0 ? (
                    <p className="text-sm text-amber-900/70 dark:text-amber-200/80 py-2">No family members yet.</p>
                  ) : (
                    familyMembers.map((m) => (
                      <Card
                        key={m.id}
                        className={cn(walletRowCard, !m.wallet_id && 'border-dashed opacity-90')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl shrink-0" aria-hidden>
                                {m.avatar}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-foreground truncate">{m.name}</h4>
                                <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                                {!m.wallet_id ? (
                                  <p className="text-xs text-muted-foreground mt-1">No wallet linked</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-foreground tabular-nums">
                                Rs. {m.balance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              <div className={walletColumnShell}>
                <h3 className="font-bold text-amber-950 dark:text-amber-50 text-base">Family shared wallet</h3>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className={masterActionBtn} onClick={openLoad}>
                    Load Money
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openDistribute}>
                    Distribute
                  </Button>
                  <Button size="sm" className={masterActionBtn} onClick={openTransfer}>
                    Transfer
                  </Button>
                </div>
                <div className="grid gap-3 pt-1">
                  {walletCategories.length === 0 ? (
                    <p className="text-sm text-amber-900/70 dark:text-amber-200/80 py-2">
                      No shared buckets yet. Create a category below.
                    </p>
                  ) : (
                    walletCategories.map((wallet) => (
                      <Card key={wallet.id} className={walletRowCard}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {wallet.image_url ? (
                                <img
                                  src={wallet.image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-amber-200/80 dark:border-amber-800/50"
                                />
                              ) : (
                                <div
                                  className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white',
                                    wallet.color,
                                  )}
                                >
                                  {wallet.icon}
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-foreground">{wallet.name}</h4>
                                <p className="text-xs text-muted-foreground">{wallet.members} members</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">Rs. {wallet.balance.toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-400/90 bg-white/90 text-amber-950 hover:bg-white dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/70"
              onClick={() => {
                setWalletErr('');
                setShowNewCategory(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Wallet Category
            </Button>
          </div>
        </div>

        <Dialog open={showLoadMoney} onOpenChange={(o) => { setShowLoadMoney(o); if (!o) setWalletErr(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load family wallet</DialogTitle>
              <DialogDescription>
                Funds are added only to the main family wallet (master balance). Use Transfer to move money into a
                category bucket.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'esewa', name: 'eSewa', icon: '💚' },
                  { id: 'khalti', name: 'Khalti', icon: '💜' },
                  { id: 'bank', name: 'Bank QR', icon: '🏦' },
                ].map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    variant={loadMethod === m.id ? 'default' : 'outline'}
                    onClick={() => setLoadMethod(m.id)}
                    className="flex-col h-auto py-3"
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-xs mt-1">{m.name}</span>
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <div className="flex gap-2 flex-wrap">
                  {[1000, 2000, 5000, 10000].map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[4rem]"
                      onClick={() => setLoadAmount(a.toString())}
                    >
                      Rs. {a.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              {walletErr ? <p className="text-sm text-destructive">{walletErr}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLoadMoney(false)}>
                Cancel
              </Button>
              <Button
                disabled={!loadAmount || Number(loadAmount) <= 0 || loadMutation.isPending}
                onClick={() => loadMutation.mutate()}
              >
                {loadMutation.isPending ? 'Saving…' : 'Add funds'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDistribute} onOpenChange={(o) => { setShowDistribute(o); if (!o) setWalletErr(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Distribute to member</DialogTitle>
              <DialogDescription>
                One-way: move funds from a family bucket into a child&apos;s wallet only. Children cannot send money
                back into the family pool from here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select member</Label>
                <Select value={distMember} onValueChange={setDistMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose member" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.avatar} {m.name} (Rs. {m.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {distributeCategoryOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>From bucket</Label>
                  <Select value={distCategoryId || 'default'} onValueChange={setDistCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (master)</SelectItem>
                      {distributeCategoryOptions.map((w) => (
                        <SelectItem key={w.category_id!} value={String(w.category_id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  value={distAmount}
                  onChange={(e) => setDistAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="bg-muted/50 p-3 rounded-xl">
                <p className="text-xs text-muted-foreground">Shared pool: Rs. {totalBalance.toLocaleString()}</p>
              </div>
              {walletErr ? <p className="text-sm text-destructive">{walletErr}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDistribute(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !distMember || !distAmount || Number(distAmount) <= 0 || distributeMutation.isPending
                }
                onClick={() => distributeMutation.mutate()}
              >
                {distributeMutation.isPending ? 'Working…' : 'Distribute'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showTransfer}
          onOpenChange={(o) => {
            setShowTransfer(o);
            if (!o) {
              setWalletErr('');
              setTransCategoryId('');
              setTransFromWallet('');
              setTransToWallet('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer between wallets</DialogTitle>
              <DialogDescription>
                Move funds between the main family wallet, category buckets, and member wallets. Fund a bucket by
                transferring from the main family wallet first.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={transFromWallet} onValueChange={setTransFromWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletPickerOptions.map((o) => (
                      <SelectItem key={`f-${o.walletId}`} value={o.walletId}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={transToWallet} onValueChange={setTransToWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletPickerOptions.map((o) => (
                      <SelectItem key={`t-${o.walletId}`} value={o.walletId}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {transferCategoryOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Category tag (optional)</Label>
                  <Select value={transCategoryId || 'default'} onValueChange={setTransCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">None</SelectItem>
                      {transferCategoryOptions.map((w) => (
                        <SelectItem key={w.category_id!} value={String(w.category_id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              {walletErr ? <p className="text-sm text-destructive">{walletErr}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransfer(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !transFromWallet ||
                  !transToWallet ||
                  transFromWallet === transToWallet ||
                  !transAmount ||
                  Number(transAmount) <= 0 ||
                  transferMutation.isPending
                }
                onClick={() => transferMutation.mutate()}
              >
                {transferMutation.isPending ? 'Working…' : 'Transfer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNewCategory} onOpenChange={(o) => { setShowNewCategory(o); if (!o) setWalletErr(''); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New wallet category</DialogTitle>
              <DialogDescription>Creates a labeled bucket with its own shared balance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!categoryMeta?.fields?.length ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading form…
                </div>
              ) : (
                categoryMeta.fields.map((f: PortalFamilyWalletCategoryFieldMeta) => {
                  if (f.type === 'file') {
                    return (
                      <div key={f.name} className="space-y-2">
                        <Label>Category image{f.required ? '' : ' (optional)'}</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCategoryImageFile(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    );
                  }
                  if (f.type === 'multiselect' && f.choices?.length) {
                    const cur = (categoryFieldValues[f.name] as string[] | undefined) ?? [];
                    return (
                      <div key={f.name} className="space-y-2">
                        <Label>Allowed member roles</Label>
                        <div className="grid gap-2">
                          {f.choices.map((c) => (
                            <label
                              key={c.value}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={cur.includes(c.value)}
                                onCheckedChange={(checked) => {
                                  const on = checked === true;
                                  setCategoryFieldValues((prev) => {
                                    const base = (prev[f.name] as string[] | undefined) ?? [];
                                    const next = on
                                      ? [...new Set([...base, c.value])]
                                      : base.filter((x) => x !== c.value);
                                    return { ...prev, [f.name]: next.length ? next : ['child'] };
                                  });
                                }}
                              />
                              {c.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (f.type === 'integer') {
                    return (
                      <div key={f.name} className="space-y-2">
                        <Label className="capitalize">{f.name.replace(/_/g, ' ')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={categoryFieldValues[f.name] ?? ''}
                          onChange={(e) =>
                            setCategoryFieldValues((prev) => ({
                              ...prev,
                              [f.name]: e.target.value === '' ? '' : Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={f.name} className="space-y-2">
                      <Label>
                        {f.name === 'name' ? 'Name' : f.name.replace(/_/g, ' ')}
                        {f.required ? '' : ' (optional)'}
                      </Label>
                      <Input
                        value={String(categoryFieldValues[f.name] ?? '')}
                        maxLength={f.max_length}
                        onChange={(e) =>
                          setCategoryFieldValues((prev) => ({ ...prev, [f.name]: e.target.value }))
                        }
                        placeholder={f.name === 'name' ? 'e.g. School fees' : undefined}
                      />
                    </div>
                  );
                })
              )}
              {walletErr ? <p className="text-sm text-destructive">{walletErr}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !categoryMeta?.fields?.length ||
                  !newCategoryNameTrim ||
                  categoryMutation.isPending
                }
                onClick={() => categoryMutation.mutate()}
              >
                {categoryMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Spending Limits Content
  function SpendingLimitsContent() {
    const qc = useQueryClient();
    const [editingMember, setEditingMember] = useState<PortalFamilyMemberRow | null>(null);
    const [limDaily, setLimDaily] = useState('');
    const [limWeekly, setLimWeekly] = useState('');
    const [limMonthly, setLimMonthly] = useState('');
    const [limitsFormError, setLimitsFormError] = useState('');

    useEffect(() => {
      if (!editingMember) return;
      setLimDaily(String(editingMember.spending_limit_daily ?? 0));
      setLimWeekly(String(editingMember.spending_limit_weekly ?? 0));
      setLimMonthly(String(editingMember.spending_limit_monthly ?? editingMember.limit ?? 0));
      setLimitsFormError('');
    }, [editingMember]);

    const patchLimitsMutation = useMutation({
      mutationFn: (args: {
        id: string;
        spending_limit_daily: number;
        spending_limit_weekly: number;
        spending_limit_monthly: number;
      }) =>
        portalApi.familyMemberPatch(args.id, {
          spending_limit_daily: args.spending_limit_daily,
          spending_limit_weekly: args.spending_limit_weekly,
          spending_limit_monthly: args.spending_limit_monthly,
        }),
      onSuccess: (data) => {
        qc.setQueryData<PortalFamilyOverview>(['portal', 'family', 'overview', sessionTick], (old) => {
          if (!old?.members?.length) return old;
          return {
            ...old,
            members: old.members.map((m) => (m.id === data.id ? { ...m, ...data } : m)),
          };
        });
        void qc.invalidateQueries({ queryKey: ['portal', 'family', 'overview'] });
        void qc.invalidateQueries({ queryKey: ['portal', 'family', 'txns'] });
        toast.success('Spending limits saved');
        setLimitsFormError('');
        setEditingMember(null);
      },
      onError: (e: Error) => {
        const msg = e instanceof PortalApiError ? e.message : e.message || 'Could not update limits';
        setLimitsFormError(msg);
        toast.error(msg);
      },
    });

    const clearDialog = () => {
      setEditingMember(null);
      setLimitsFormError('');
    };

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Spending Limits</h2>
        <div className="grid gap-3">
          {familyMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{member.avatar}</span>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(member.is_leader)}
                    onClick={() => setEditingMember(member)}
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Daily</p>
                    <p className="font-semibold">
                      Rs. {(member.spending_limit_daily ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Weekly</p>
                    <p className="font-semibold">
                      Rs. {(member.spending_limit_weekly ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-semibold">
                      Rs. {(member.spending_limit_monthly ?? member.limit ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Dialog
          open={!!editingMember}
          onOpenChange={(o) => {
            if (!o) clearDialog();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit spending limits</DialogTitle>
              <DialogDescription className="text-xs">
                {editingMember?.name} - daily, weekly, and monthly caps (Rs.)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              {limitsFormError ? (
                <p className="text-sm text-destructive" role="alert">
                  {limitsFormError}
                </p>
              ) : null}
              <div className="space-y-1">
                <Label className="text-xs">Daily</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={limDaily}
                  onChange={(e) => {
                    setLimDaily(e.target.value);
                    setLimitsFormError('');
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Weekly</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={limWeekly}
                  onChange={(e) => {
                    setLimWeekly(e.target.value);
                    setLimitsFormError('');
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={limMonthly}
                  onChange={(e) => {
                    setLimMonthly(e.target.value);
                    setLimitsFormError('');
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={clearDialog}
                disabled={patchLimitsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!editingMember || patchLimitsMutation.isPending}
                onClick={() => {
                  if (!editingMember) return;
                  setLimitsFormError('');
                  const pd = parseFamilyLimitInput(limDaily);
                  const pw = parseFamilyLimitInput(limWeekly);
                  const pm = parseFamilyLimitInput(limMonthly);
                  if (!pd.ok) {
                    setLimitsFormError(pd.error);
                    return;
                  }
                  if (!pw.ok) {
                    setLimitsFormError(pw.error);
                    return;
                  }
                  if (!pm.ok) {
                    setLimitsFormError(pm.error);
                    return;
                  }
                  const orderErr = validateFamilySpendingLimits(pd.value, pw.value, pm.value);
                  if (orderErr) {
                    setLimitsFormError(orderErr);
                    return;
                  }
                  patchLimitsMutation.mutate({
                    id: editingMember.id,
                    spending_limit_daily: pd.value,
                    spending_limit_weekly: pw.value,
                    spending_limit_monthly: pm.value,
                  });
                }}
              >
                {patchLimitsMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Product Restrictions Content
  function ProductRestrictionsContent() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: restrictionsResp, isLoading: restrictionsLoading, isError: restrictionsError } = useQuery({
      queryKey: FAMILY_PRODUCT_RESTRICTIONS_QUERY_KEY,
      queryFn: () => portalApi.familyProductRestrictions(),
    });

    const restrictionByCategoryId = useMemo(() => {
      const m = new Map<string, PortalFamilyProductRestrictionRow>();
      for (const r of restrictionsResp?.results ?? []) {
        m.set(String(r.category_id), r);
      }
      return m;
    }, [restrictionsResp?.results]);

    const patchMutation = useMutation({
      mutationFn: (payload: Parameters<typeof portalApi.familyProductRestrictionsPatch>[0]) =>
        portalApi.familyProductRestrictionsPatch(payload),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: FAMILY_PRODUCT_RESTRICTIONS_QUERY_KEY });
      },
      onError: (e: Error) => toast.error(e.message || 'Could not save restriction'),
    });

    const mergePatch = (
      categoryIdStr: string,
      updates: Partial<{
        is_blocked: boolean;
        requires_approval: boolean;
        max_price: string | number | null;
      }>,
    ) => {
      const prev = restrictionByCategoryId.get(categoryIdStr);
      return {
        category_id: Number(categoryIdStr),
        is_blocked: updates.is_blocked ?? prev?.is_blocked ?? false,
        requires_approval: updates.requires_approval ?? prev?.requires_approval ?? false,
        max_price:
          updates.max_price !== undefined
            ? updates.max_price
            : prev?.max_price != null && prev.max_price !== ''
              ? prev.max_price
              : null,
      };
    };

    const flatCategories = useMemo(() => {
      const out: { id: string; name: string; icon: string }[] = [];
      const walk = (nodes: WebsiteCategory[]) => {
        for (const c of nodes) {
          out.push({
            id: String(c.id),
            name: c.name,
            icon: c.icon?.trim() || '📁',
          });
          if (c.children?.length) walk(c.children);
        }
      };
      walk(catalogCategories);
      return out;
    }, [catalogCategories]);

    const filtered = flatCategories.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Product Restrictions</h2>
          <p className="text-sm text-muted-foreground">
            Rules are saved for your family group and stay in sync with Settings.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories to restrict..."
            className="pl-10"
          />
        </div>

        {restrictionsLoading && (
          <p className="text-sm text-muted-foreground py-2 text-center">Loading saved rules…</p>
        )}
        {restrictionsError && (
          <p className="text-sm text-destructive py-2 text-center">Could not load saved restrictions.</p>
        )}

        {categoriesLoading && (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading categories…</p>
        )}
        {categoriesError && (
          <p className="text-sm text-destructive py-4 text-center">Could not load categories.</p>
        )}

        {!categoriesLoading && !categoriesError && (
          <Card>
            <CardContent className="p-4 space-y-3">
              {filtered.map((cat) => {
                const rule = restrictionByCategoryId.get(cat.id);
                const blocked = rule?.is_blocked ?? false;
                const needsApproval = rule?.requires_approval ?? false;
                const busy = patchMutation.isPending;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{cat.icon}</span>
                      <span className="font-medium text-sm text-foreground truncate">{cat.name}</span>
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end sm:min-w-[280px]">
                      <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground">Shopping allowed</span>
                        <Switch
                          disabled={busy}
                          checked={!blocked}
                          onCheckedChange={(checked) =>
                            patchMutation.mutate(mergePatch(cat.id, { is_blocked: !checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground">Requires approval</span>
                        <Switch
                          disabled={busy || blocked}
                          checked={needsApproval}
                          onCheckedChange={(checked) =>
                            patchMutation.mutate(mergePatch(cat.id, { requires_approval: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:justify-end">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Max price</Label>
                        <Input
                          key={`mp-${cat.id}-${rule?.max_price ?? ''}`}
                          className="h-8 w-28 text-xs"
                          placeholder="—"
                          defaultValue={rule?.max_price != null && rule.max_price !== '' ? String(rule.max_price) : ''}
                          disabled={busy || blocked}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            patchMutation.mutate(
                              mergePatch(cat.id, {
                                max_price: raw === '' ? null : raw,
                              }),
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-4 text-sm text-muted-foreground">
                  {searchTerm ? `No categories match "${searchTerm}"` : 'No categories returned.'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Auto Approval Content
  function AutoApprovalContent() {
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PortalFamilyAutoApprovalRuleRow | null>(null);
    const [deleteRule, setDeleteRule] = useState<PortalFamilyAutoApprovalRuleRow | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formCategoryId, setFormCategoryId] = useState<string>('');
    const [formMaxAmount, setFormMaxAmount] = useState('');
    const [formEnabled, setFormEnabled] = useState(true);

    const { data: rulesData, isLoading: rulesLoading, isError: rulesError } = useQuery({
      queryKey: FAMILY_AUTO_APPROVAL_QUERY_KEY,
      queryFn: () => portalApi.familyAutoApprovalRules(),
      retry: false,
    });
    const rules = rulesData?.results ?? [];

    const { data: autoCategories = [], isLoading: catLoading } = useQuery({
      queryKey: ['website', 'categories', 'auto-approval'],
      queryFn: () => websiteApi.categories(),
      retry: false,
    });
    const flatCategories = useMemo(() => flattenWebsiteCategories(autoCategories), [autoCategories]);

    const openCreate = () => {
      setEditingRule(null);
      setFormName('');
      setFormDescription('');
      setFormCategoryId('');
      setFormMaxAmount('');
      setFormEnabled(true);
      setDialogOpen(true);
    };

    const openEdit = (r: PortalFamilyAutoApprovalRuleRow) => {
      setEditingRule(r);
      setFormName(r.name);
      setFormDescription(r.description ?? '');
      setFormCategoryId(r.category_id != null ? String(r.category_id) : '');
      setFormMaxAmount(r.max_amount != null && r.max_amount !== '' ? String(r.max_amount) : '');
      setFormEnabled(r.is_enabled);
      setDialogOpen(true);
    };

    const saveMutation = useMutation({
      mutationFn: async () => {
        const maxRaw = formMaxAmount.trim();
        const maxVal = maxRaw === '' ? null : maxRaw;
        const cat =
          formCategoryId === '' ? null : Number(formCategoryId);
        if (formCategoryId !== '' && !Number.isFinite(cat)) {
          throw new Error('Invalid category');
        }
        if (editingRule) {
          return portalApi.familyAutoApprovalRulePatch(editingRule.id, {
            name: formName.trim() || editingRule.name,
            description: formDescription,
            category_id: cat,
            max_amount: maxVal,
            is_enabled: formEnabled,
          });
        }
        return portalApi.familyAutoApprovalRuleCreate({
          name: formName.trim() || 'Rule',
          description: formDescription,
          category: cat,
          max_amount: maxVal,
          is_enabled: formEnabled,
        });
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: FAMILY_AUTO_APPROVAL_QUERY_KEY });
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        setDialogOpen(false);
      },
      onError: (e: Error) => toast.error(e.message || 'Could not save rule'),
    });

    const deleteMutation = useMutation({
      mutationFn: (id: number) => portalApi.familyAutoApprovalRuleDelete(id),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: FAMILY_AUTO_APPROVAL_QUERY_KEY });
        toast.success('Rule deleted');
        setDeleteRule(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Could not delete'),
    });

    const toggleMutation = useMutation({
      mutationFn: (r: PortalFamilyAutoApprovalRuleRow) =>
        portalApi.familyAutoApprovalRulePatch(r.id, { is_enabled: !r.is_enabled }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: FAMILY_AUTO_APPROVAL_QUERY_KEY });
      },
      onError: (e: Error) => toast.error(e.message || 'Could not update'),
    });

    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Auto-Approval Rules</h2>
            <p className="text-sm text-muted-foreground">
              Auto-approve purchases under a max amount (optionally per category).
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Add rule
          </Button>
        </div>

        {rulesError && (
          <p className="text-sm text-destructive">Could not load auto-approval rules.</p>
        )}

        {rulesLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!rulesLoading && !rulesError && rules.length === 0 && (
          <EmptyState
            icon={CheckCircle}
            title="No auto-approval rules yet"
            description="Add a rule to allow purchases below a limit without manual approval."
          />
        )}

        {!rulesLoading && !rulesError && rules.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rule</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Max amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.name}</p>
                        {r.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.category_name ?? <span className="text-muted-foreground">Any</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.max_amount != null && r.max_amount !== ''
                          ? `Rs. ${Number(r.max_amount).toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.is_enabled}
                            disabled={toggleMutation.isPending}
                            onCheckedChange={() => toggleMutation.mutate(r)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {r.is_enabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive"
                          onClick={() => setDeleteRule(r)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit rule' : 'New auto-approval rule'}</DialogTitle>
              <DialogDescription className="text-xs">
                Name, optional category cap, and maximum auto-approved amount.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-9" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  className="h-9"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category (optional)</Label>
                <Select
                  value={formCategoryId || '__any__'}
                  onValueChange={(v) => setFormCategoryId(v === '__any__' ? '' : v)}
                  disabled={catLoading}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__" className="text-xs">
                      Any category
                    </SelectItem>
                    {flatCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max amount (Rs., optional)</Label>
                <Input
                  className="h-9"
                  placeholder="No cap"
                  value={formMaxAmount}
                  onChange={(e) => setFormMaxAmount(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Enabled</Label>
                <Switch checked={formEnabled} onCheckedChange={setFormEnabled} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteRule} onOpenChange={(o) => !o && setDeleteRule(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete rule</AlertDialogTitle>
              <AlertDialogDescription>
                Remove “{deleteRule?.name}”? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!deleteRule || deleteMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (deleteRule) deleteMutation.mutate(deleteRule.id);
                }}
              >
                {deleteMutation.isPending ? '…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Transaction History Content
  function TransactionHistoryContent() {
    const rows = transactions as PortalFamilyWalletTxnRow[];
    return (
      <div className="p-4 lg:p-6">
        <DataTable
          title="Transaction History"
          data={rows}
          columns={[
            {
              key: 'item',
              label: 'Description',
              render: (tx: PortalFamilyWalletTxnRow) => (
                <div>
                  <p className="font-medium text-sm">{tx.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.member} · {tx.time}
                  </p>
                </div>
              ),
            },
            {
              key: 'wallet',
              label: 'Wallet',
              render: (tx: PortalFamilyWalletTxnRow) => (
                <Badge variant="outline" className="text-xs">
                  {tx.wallet}
                </Badge>
              ),
            },
            {
              key: 'amount',
              label: 'Amount',
              className: 'text-right',
              render: (tx: PortalFamilyWalletTxnRow) => {
                const flow = tx.flow ?? (tx.signed_amount != null && tx.signed_amount >= 0 ? 'in' : 'out');
                const isIn = flow === 'in';
                const displayAbs =
                  tx.amount != null ? Math.abs(tx.amount) : Math.abs(tx.signed_amount ?? 0);
                return (
                  <span
                    className={cn(
                      'font-bold',
                      isIn ? 'text-emerald-600' : 'text-red-600',
                      tx.status === 'failed' && 'line-through opacity-70',
                    )}
                  >
                    {isIn ? '+' : '-'}Rs. {displayAbs.toLocaleString()}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              render: (tx: PortalFamilyWalletTxnRow) => (
                <Badge
                  variant={
                    tx.status === 'failed'
                      ? 'destructive'
                      : tx.status === 'completed'
                        ? 'default'
                        : 'secondary'
                  }
                  className={cn('text-[10px]', tx.status === 'completed' && 'bg-emerald-600')}
                >
                  {tx.status}
                </Badge>
              ),
            },
          ]}
          searchKey="item"
          searchPlaceholder="Search transactions..."
          onExport={() => console.log('Export')}
          onFilter={() => console.log('Filter')}
        />
      </div>
    );
  }

  // Settings Content
  function SettingsContent() {
    const childMembers = familyMembers.filter((m) => m.role === 'child');
    const { data: restrictionsResp, isLoading: restrictionsLoading, isError: restrictionsError } = useQuery({
      queryKey: FAMILY_PRODUCT_RESTRICTIONS_QUERY_KEY,
      queryFn: () => portalApi.familyProductRestrictions(),
    });
    const restrictionRows = restrictionsResp?.results ?? [];

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <h2 className="text-lg font-bold text-foreground">Family Settings</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription className="text-xs">
              Notification and security preferences will be configurable when available from the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Bell}
              title="No configurable preferences yet"
              description="Account alerts and 2FA will appear here when exposed by the API."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Child spending (from API)
            </CardTitle>
            <CardDescription className="text-xs">Monthly limits and spend from your family overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {childMembers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No child members"
                description="Add a child member to see spending limits here."
              />
            ) : (
              childMembers.map((member) => (
                <div key={member.id} className="p-4 border border-border rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{member.avatar}</span>
                    <span className="font-semibold text-sm">{member.name}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {member.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Spent</p>
                      <p className="font-bold">Rs. {member.spending.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Monthly limit</p>
                      <p className="font-bold">Rs. {member.limit.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Personal wallet</p>
                      <p className="font-bold tabular-nums">Rs. {member.balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Product restriction rules
            </CardTitle>
            <CardDescription className="text-xs">
              Same data as{' '}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => goTo('controls-restrictions')}
              >
                Product Restrictions
              </button>
              . Updates apply everywhere immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {restrictionsLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading rules…</p>
            ) : restrictionsError ? (
              <p className="text-sm text-destructive py-4 text-center">Could not load restrictions.</p>
            ) : restrictionRows.length === 0 ? (
              <EmptyState
                icon={Lock}
                title="No saved product rules"
                description="Configure categories under Product Restrictions to block items, require approval, or set a max price."
              />
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead className="text-right">Max price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restrictionRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-sm">{row.category_name}</TableCell>
                        <TableCell>
                          <Badge variant={row.is_blocked ? 'destructive' : 'secondary'} className="text-[10px]">
                            {row.is_blocked ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.requires_approval ? 'default' : 'outline'} className="text-[10px]">
                            {row.requires_approval ? 'Required' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {row.max_price != null && row.max_price !== ''
                            ? `Rs. ${Number(row.max_price).toLocaleString()}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time-based rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Clock}
              title="No time rules yet"
              description="Purchase windows and quiet hours will appear here when the family API supports them."
            />
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
          oauthNext: '/family-portal/dashboard',
          authPortal: 'family-portal',
        }}
      />
    );
  }

  if (navError) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground max-w-md">
            Family portal menu could not be loaded. This area requires a parent account.
          </p>
          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            Sign out
          </Button>
        </div>
        <LogoutConfirmDialog
          open={logoutConfirmOpen}
          onOpenChange={setLogoutConfirmOpen}
          description="You will be signed out of the family portal on this device."
          onConfirm={() => performPortalLogout()}
        />
      </>
    );
  }

  if (navLoading || !sidebarItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading family portal…
      </div>
    );
  }

  if (!isSegmentKnown) {
    return <Navigate to="/family-portal/dashboard" replace />;
  }

  return (
    <>
    <PortalLayout sidebar={sidebar} headerActions={headerActions}>
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
      description="You will be signed out of the family portal on this device."
      onConfirm={() => performPortalLogout()}
    />
    </>
  );
}

export default FamilyPortal;
