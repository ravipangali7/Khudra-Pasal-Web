import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { adminApi, type AdminCommissionSettlementRow } from '@/lib/api';
import { formatApiError } from '../hooks/adminFormUtils';
import { AdminStatCard } from '@/components/admin/AdminStats';
import {
  Baby,
  Ban,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Landmark,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type LedgerRow = {
  id: string;
  source: string;
  portal: string;
  type: string;
  txn_type: string;
  user: string;
  user_id?: string;
  family?: string;
  amount: number;
  /** When present (from API), use for credit/debit display. */
  signed_amount?: number;
  status: string;
  reference: string;
  description: string;
  created_at: string;
};

type PortalTab = 'all' | 'platform' | 'vendor' | 'customer_portal' | 'family' | 'child';

function ledgerSignedDisplay(r: LedgerRow): { text: string; className: string } {
  const signed =
    typeof r.signed_amount === 'number' && !Number.isNaN(r.signed_amount)
      ? r.signed_amount
      : r.amount;
  const abs = Math.abs(signed);
  const text =
    signed < 0 ? `-Rs. ${abs.toLocaleString()}` : `Rs. ${abs.toLocaleString()}`;
  const className =
    signed < 0
      ? 'font-medium tabular-nums text-destructive'
      : 'font-medium tabular-nums text-emerald-700';
  return { text, className };
}
type RefundRow = {
  id: string;
  order: string;
  order_pk?: number;
  customer: string;
  customer_phone?: string;
  customer_avatar?: string;
  placed_portal?: string;
  amount: number;
  gross_amount?: number;
  platform_fee?: number;
  net_credit?: number;
  deduction_summary?: string;
  reason: string;
  status: string;
  date: string;
  created_at?: string;
  processed_at?: string | null;
};
type WithdrawalRow = {
  id: string;
  withdrawal_number: string;
  seller: string;
  amount: number;
  method: string;
  method_account?: string;
  bank_name?: string;
  account_holder?: string;
  admin_note?: string;
  reject_reason?: string;
  wallet_type?: string;
  payout_summary?: string;
  status: string;
  date: string;
  balance: number;
  created_at?: string;
  processed_at?: string;
  proof_image_url?: string;
};

interface FinanceModuleProps {
  activeSection: string;
}

function FilterBar({ filters, onChange }: {
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const hasFilters = Object.values(filters).some(v => v && v !== 'all');
  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {Object.entries(filters).map(([key, value]) => (
            <Select key={key} value={value} onValueChange={(v) => onChange(key, v)}>
              <SelectTrigger className="h-8 text-xs w-36 capitalize">{key.replace(/_/g, ' ')}</SelectTrigger>
              <SelectContent>
                {filterOptions[key]?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => Object.keys(filters).forEach(k => onChange(k, 'all'))}>
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const filterOptions: Record<string, { value: string; label: string }[]> = {
  period: [
    { value: 'all', label: 'All Time' }, { value: 'today', label: 'Today' },
    { value: 'weekly', label: 'This Week' }, { value: 'monthly', label: 'This Month' },
  ],
  status: [
    { value: 'all', label: 'All Status' }, { value: 'success', label: 'Success' },
    { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' },
  ],
  method: [
    { value: 'all', label: 'All Methods' }, { value: 'eSewa', label: 'eSewa' },
    { value: 'Khalti', label: 'Khalti' }, { value: 'Card', label: 'Card' }, { value: 'COD', label: 'COD' },
  ],
  fee_type: [
    { value: 'all', label: 'All Fee Types' }, { value: 'platform', label: 'Platform Fee' },
    { value: 'gateway', label: 'Gateway Fee' }, { value: 'commission', label: 'Commission' },
    { value: 'withdrawal', label: 'Withdrawal Fee' }, { value: 'none', label: 'No Fee' },
  ],
  customer: [
    { value: 'all', label: 'All Customers' },
  ],
  refund_status: [
    { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ],
  seller: [
    { value: 'all', label: 'All Sellers' },
  ],
  withdrawal_status: [
    { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ],
  ledger_source: [
    { value: 'all', label: 'All sources' },
    { value: 'payment', label: 'Payments only' },
    { value: 'wallet', label: 'Wallet only' },
  ],
};

export default function FinanceModule({ activeSection }: FinanceModuleProps) {
  switch (activeSection) {
    case 'refunds': return <RefundsView />;
    case 'withdrawals': return <WithdrawalsView />;
    case 'commission-log': return <CommissionLogView />;
    default: return <TransactionsView />;
  }
}

function CommissionLogView() {
  const [orderQ, setOrderQ] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [debouncedOrder, setDebouncedOrder] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrder(orderQ.trim()), 350);
    return () => clearTimeout(t);
  }, [orderQ]);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page_size: 200 };
    if (debouncedOrder) p.order_number = debouncedOrder;
    if (vendorId.trim().match(/^\d+$/)) p.vendor_id = parseInt(vendorId.trim(), 10);
    return p;
  }, [debouncedOrder, vendorId]);

  const { data: rows = [], isLoading, isError } = useAdminList<AdminCommissionSettlementRow>(
    ['admin', 'commission-settlements', JSON.stringify(params)],
    () => adminApi.commissionSettlements(params),
  );

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading commission log…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load commission settlements.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Order number</Label>
            <Input
              className="h-8 w-48 text-xs"
              placeholder="Search…"
              value={orderQ}
              onChange={(e) => setOrderQ(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Vendor ID</Label>
            <Input
              className="h-8 w-28 text-xs"
              placeholder="e.g. 12"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <AdminTable
        title="Commission settlements"
        subtitle="Per-order platform commission and vendor payout (paid orders)"
        data={rows}
        columns={[
          { key: 'order_number', label: 'Order' },
          { key: 'vendor_name', label: 'Vendor' },
          {
            key: 'total_amount',
            label: 'Order total',
            render: (r) => <span className="tabular-nums">Rs. {Number(r.total_amount).toLocaleString()}</span>,
          },
          {
            key: 'commission_percent',
            label: 'Rate %',
            render: (r) => <span>{Number(r.commission_percent).toFixed(2)}%</span>,
          },
          {
            key: 'commission_amount',
            label: 'Commission',
            render: (r) => <span className="tabular-nums text-amber-700">Rs. {Number(r.commission_amount).toLocaleString()}</span>,
          },
          {
            key: 'vendor_amount',
            label: 'Vendor share',
            render: (r) => <span className="tabular-nums text-emerald-700">Rs. {Number(r.vendor_amount).toLocaleString()}</span>,
          },
          { key: 'payment_status', label: 'Pay status' },
          {
            key: 'created_at',
            label: 'Settled',
            render: (r) => <span className="text-xs whitespace-nowrap">{r.created_at?.replace('T', ' ').slice(0, 19) ?? '—'}</span>,
          },
        ]}
        onExport={() => {}}
        onFilter={() => {}}
      />
    </div>
  );
}

function TransactionsView() {
  const [portalTab, setPortalTab] = useState<PortalTab>('all');
  const [filters, setFilters] = useState({
    ledger_source: 'all',
    payment_status: 'all',
    wallet_status: 'all',
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<LedgerRow | null>(null);
  const setFilter = (k: string, v: string) => setFilters((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const ledgerParams = useMemo(() => {
    const p: Record<string, string | number> = { page_size: 200 };
    if (filters.ledger_source !== 'all') p.source = filters.ledger_source;
    if (portalTab !== 'all') p.portal = portalTab;
    if (filters.payment_status !== 'all') p.payment_status = filters.payment_status;
    if (filters.wallet_status !== 'all') p.wallet_status = filters.wallet_status;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [filters, debouncedSearch, portalTab]);

  const { data: ledgerRows = [], isLoading, isError } = useAdminList<LedgerRow>(
    ['admin', 'ledger-transactions', JSON.stringify(ledgerParams)],
    () => adminApi.ledgerTransactions(ledgerParams),
    { refetchInterval: 30_000, refetchOnWindowFocus: true },
  );

  const normalized: LedgerRow[] = useMemo(
    () =>
      ledgerRows.map((r) => ({
        ...r,
        amount: typeof r.amount === 'number' ? r.amount : Number(r.amount) || 0,
        signed_amount:
          typeof r.signed_amount === 'number'
            ? r.signed_amount
            : r.signed_amount != null
              ? Number(r.signed_amount) || undefined
              : undefined,
      })),
    [ledgerRows],
  );

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading transactions…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load ledger.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <Tabs
        value={portalTab}
        onValueChange={(v) => setPortalTab(v as PortalTab)}
        className="w-full"
      >
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 bg-muted p-1">
          <TabsTrigger value="all" className="text-xs shrink-0">
            All
          </TabsTrigger>
          <TabsTrigger value="platform" className="text-xs shrink-0">
            Platform
          </TabsTrigger>
          <TabsTrigger value="vendor" className="text-xs shrink-0">
            Vendor/Seller
          </TabsTrigger>
          <TabsTrigger value="customer_portal" className="text-xs shrink-0">
            Portal
          </TabsTrigger>
          <TabsTrigger value="family" className="text-xs shrink-0">
            Family-Portal
          </TabsTrigger>
          <TabsTrigger value="child" className="text-xs shrink-0">
            Child-Portal
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={filters.ledger_source}
              onValueChange={(v) => setFilter('ledger_source', v)}
            >
              <SelectTrigger className="h-8 text-xs w-40 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.ledger_source?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.payment_status}
              onValueChange={(v) => setFilter('payment_status', v)}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Pay status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All pay status</SelectItem>
                <SelectItem value="success" className="text-xs">success</SelectItem>
                <SelectItem value="pending" className="text-xs">pending</SelectItem>
                <SelectItem value="failed" className="text-xs">failed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.wallet_status}
              onValueChange={(v) => setFilter('wallet_status', v)}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Wallet status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All wallet status</SelectItem>
                <SelectItem value="completed" className="text-xs">completed</SelectItem>
                <SelectItem value="pending" className="text-xs">pending</SelectItem>
                <SelectItem value="failed" className="text-xs">failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            className="h-8 max-w-xs text-xs"
            placeholder="Search user, ref, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            type="button"
            onClick={() => {
              setPortalTab('all');
              setFilters({
                ledger_source: 'all',
                payment_status: 'all',
                wallet_status: 'all',
              });
              setSearchInput('');
            }}
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </CardContent>
      </Card>
      <AdminTable
        title="All transactions"
        subtitle="Filter by scope above; credits in green, debits (commission, withdrawals, purchases) in red"
        data={normalized}
        columns={[
          { key: 'id', label: 'ID', render: (t) => <span className="font-mono text-[10px]">{t.id}</span> },
          { key: 'source', label: 'Source', render: (t) => <Badge variant="outline" className="text-[10px]">{t.source}</Badge> },
          { key: 'portal', label: 'Portal', render: (t) => <span className="text-xs capitalize">{t.portal}</span> },
          { key: 'txn_type', label: 'Type', render: (t) => <span className="text-xs">{t.txn_type}</span> },
          { key: 'user', label: 'User / Party', render: (t) => <span className="font-medium text-sm">{t.user}</span> },
          {
            key: 'family',
            label: 'Family',
            render: (t) => <span className="text-xs text-muted-foreground">{t.family && t.family !== '—' ? t.family : '—'}</span>,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (t) => {
              const { text, className } = ledgerSignedDisplay(t);
              return <span className={className}>{text}</span>;
            },
          },
          {
            key: 'status',
            label: 'Status',
            render: (t) => (
              <Badge
                variant={t.status === 'success' || t.status === 'completed' ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  (t.status === 'success' || t.status === 'completed') && 'bg-emerald-500',
                )}
              >
                {t.status}
              </Badge>
            ),
          },
          {
            key: 'created_at',
            label: 'When',
            render: (t) => <span className="text-xs whitespace-nowrap">{t.created_at?.replace('T', ' ').slice(0, 16) ?? '—'}</span>,
          },
          {
            key: 'actions',
            label: '',
            render: (t) => (
              <Button size="sm" variant="outline" className="h-7" type="button" onClick={() => { setSelected(t); setViewOpen(true); }}>
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
            ),
          },
        ]}
        onExport={() => {}}
        onFilter={() => {}}
      />

      <CRUDModal open={viewOpen} onClose={() => setViewOpen(false)} title="Transaction details" size="lg" onSave={() => setViewOpen(false)} saveLabel="Close">
        {selected && (() => {
          const amtDisp = ledgerSignedDisplay(selected);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">ID</p><p className="font-mono font-bold text-xs break-all">{selected.id}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Source</p><p className="font-bold capitalize">{selected.source}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Portal</p><p className="font-bold capitalize">{selected.portal}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Type</p><p className="font-bold">{selected.txn_type}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">User</p><p className="font-bold">{selected.user}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Amount</p><p className={cn('font-bold text-lg', amtDisp.className)}>{amtDisp.text}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Reference</p><p className="font-bold">{selected.reference}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{selected.description || '—'}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2"><p className="text-xs text-muted-foreground">When</p><p className="font-bold">{selected.created_at}</p></div>
              </div>
            </div>
          );
        })()}
      </CRUDModal>
    </div>
  );
}

function refundCustomerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || '?';
  }
  if (parts.length === 1 && parts[0].length) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '?';
}

function portalProfileMeta(placedPortal: string | undefined): { Icon: typeof User; label: string } {
  switch (placedPortal) {
    case 'portal_family':
      return { Icon: Users, label: 'Family portal' };
    case 'portal_child':
      return { Icon: Baby, label: 'Child portal' };
    case 'portal_main':
      return { Icon: User, label: 'Customer portal' };
    default:
      return { Icon: User, label: placedPortal ? placedPortal.replace(/_/g, ' ') : 'Portal' };
  }
}

function deductionShortLabel(summary: string | undefined): string {
  if (!summary) return 'Details';
  if (summary.includes('Platform pool')) return 'Platform pool';
  return 'Settlement';
}

function RefundFinancialSummaryCard({ r }: { r: RefundRow }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-foreground">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Gross</span>
        <span className="font-mono font-medium tabular-nums">
          Rs. {Number(r.gross_amount ?? r.amount).toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Platform retention (3% of commission)</span>
        <span className="font-mono tabular-nums">
          Rs.{' '}
          {Number(r.platform_fee ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="flex justify-between text-sm font-medium pt-1 border-t">
        <span>Credit to customer</span>
        <span className="font-mono text-primary tabular-nums">
          Rs.{' '}
          {Number(r.net_credit ?? r.amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground pt-1 border-t">
        {r.deduction_summary || 'Wallet clawback per order settlement.'}
      </p>
    </div>
  );
}

function RefundsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightDoneRef = useRef<string | null>(null);
  const [filters, setFilters] = useState({ period: 'all', refund_status: 'all', customer: 'all' });
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<RefundRow | null>(null);
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const setFilter = (k: string, v: string) => setFilters(prev => ({ ...prev, [k]: v }));

  const { data: apiRefunds, isLoading, isError } = useAdminList<RefundRow>(
    ['admin', 'refunds'],
    () => adminApi.refunds({ page_size: 200 }),
  );

  const approveMut = useAdminMutation(
    (id: string) => adminApi.updateRefund(id, { status: 'approved' }),
    [['admin', 'refunds']],
  );

  const rejectMut = useAdminMutation(
    (vars: { id: string; admin_note: string }) =>
      adminApi.updateRefund(vars.id, { status: 'rejected', admin_note: vars.admin_note }),
    [['admin', 'refunds']],
  );

  const filtered = useMemo(
    () =>
      apiRefunds.filter((r) => {
        if (filters.refund_status !== 'all' && r.status !== filters.refund_status) return false;
        if (filters.customer !== 'all' && r.customer !== filters.customer) return false;
        return true;
      }),
    [apiRefunds, filters.refund_status, filters.customer],
  );

  useEffect(() => {
    const raw = (searchParams.get('highlightRefund') || '').trim();
    if (!raw) {
      highlightDoneRef.current = null;
      return;
    }
    if (isLoading || isError) return;
    if (!filtered.some((r) => r.id === raw)) return;
    if (highlightDoneRef.current === raw) return;
    highlightDoneRef.current = raw;
    requestAnimationFrame(() => {
      const el = document.querySelector(`tr[data-admin-row-key="${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add(
          'ring-2',
          'ring-primary',
          'ring-offset-2',
          'ring-offset-background',
          'bg-primary/5',
        );
        window.setTimeout(() => {
          el.classList.remove(
            'ring-2',
            'ring-primary',
            'ring-offset-2',
            'ring-offset-background',
            'bg-primary/5',
          );
        }, 4500);
      }
    });
    const next = new URLSearchParams(searchParams);
    next.delete('highlightRefund');
    setSearchParams(next, { replace: true });
  }, [isLoading, isError, filtered, searchParams, setSearchParams]);

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading refunds…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load refunds.</div>;

  const runApprove = (id: string) => {
    approveMut.mutate(id, {
      onSuccess: () => {
        toast.success('Refund approved.');
        setApproveOpen(false);
        setApproveTarget(null);
      },
      onError: (e) => toast.error(formatApiError(e)),
    });
  };

  const handleRejectSave = () => {
    if (!selected || !rejectionReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    rejectMut.mutate(
      { id: selected.id, admin_note: rejectionReason.trim() },
      {
        onSuccess: () => {
          toast.success('Refund rejected.');
          setRejectOpen(false);
          setRejectionReason('');
          setSelected(null);
        },
        onError: (e) => toast.error(formatApiError(e)),
      },
    );
  };

  return (
    <div className="p-4 lg:p-6">
      <FilterBar filters={filters} onChange={setFilter} />
      <AdminTable
        title="Refund Requests"
        subtitle="Super Admin approves or rejects; 3% applies to the commission portion only"
        data={filtered}
        rowKey="id"
        columns={[
          { key: 'id', label: 'Refund ID' },
          { key: 'order', label: 'Order' },
          {
            key: 'customer',
            label: 'Customer',
            className: 'min-w-[200px]',
            render: (r) => {
              const { Icon: PortalIcon, label: portalLabel } = portalProfileMeta(r.placed_portal);
              return (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Avatar className="h-9 w-9 border border-border">
                      {r.customer_avatar ? (
                        <AvatarImage src={r.customer_avatar} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="text-xs font-medium">
                        {refundCustomerInitials(r.customer)}
                      </AvatarFallback>
                    </Avatar>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <PortalIcon className="h-4 w-4" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {portalLabel}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-medium truncate">{r.customer}</p>
                    {r.customer_phone ? (
                      <p className="text-xs text-muted-foreground truncate">{r.customer_phone}</p>
                    ) : null}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'gross',
            label: 'Gross',
            render: (r) => (
              <span className="font-mono text-xs">Rs. {Number(r.gross_amount ?? r.amount).toLocaleString()}</span>
            ),
          },
          {
            key: 'fee',
            label: 'Commission retention',
            render: (r) => (
              <span className="font-mono text-xs text-muted-foreground">
                Rs. {Number(r.platform_fee ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ),
          },
          {
            key: 'net',
            label: 'Customer credit',
            render: (r) => (
              <span className="font-mono text-xs font-medium text-primary">
                Rs. {Number(r.net_credit ?? r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ),
          },
          {
            key: 'deduction_summary',
            label: 'Deduction',
            className: 'max-w-[140px]',
            render: (r) => {
              const full = r.deduction_summary || '—';
              const short = deductionShortLabel(r.deduction_summary);
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-left text-xs font-medium',
                        'text-foreground hover:bg-muted/80 transition-colors max-w-full',
                      )}
                    >
                      <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{short}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-left">
                    {full}
                  </TooltipContent>
                </Tooltip>
              );
            },
          },
          {
            key: 'reason',
            label: 'Reason',
            className: 'max-w-[220px]',
            render: (r) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm line-clamp-2 cursor-default text-left">{r.reason || '—'}</p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md text-left">
                  {r.reason || '—'}
                </TooltipContent>
              </Tooltip>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <Badge
                variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}
                className={cn('text-xs capitalize', r.status === 'approved' && 'bg-emerald-500')}
              >
                {r.status}
              </Badge>
            ),
          },
          {
            key: 'when',
            label: 'When',
            render: (r) => (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {r.processed_at
                  ? new Date(r.processed_at).toLocaleString()
                  : r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : r.date}
              </span>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (r) =>
              r.status === 'pending' ? (
                <div className="inline-flex gap-1.5 rounded-lg border border-border bg-muted/30 p-0.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-emerald-700 bg-background shadow-none hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    disabled={approveMut.isPending || rejectMut.isPending}
                    onClick={() => {
                      setApproveTarget(r);
                      setApproveOpen(true);
                    }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-destructive bg-background shadow-none hover:bg-destructive/10"
                    disabled={approveMut.isPending || rejectMut.isPending}
                    onClick={() => {
                      setSelected(r);
                      setRejectOpen(true);
                    }}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              ) : null,
          },
        ]}
        onFilter={() => {}}
      />

      <AlertDialog open={approveOpen} onOpenChange={(o) => { if (!o) { setApproveOpen(false); setApproveTarget(null); } }}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle className="h-5 w-5" aria-hidden />
              </span>
              Approve refund?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-3 pt-1 text-left">
                {approveTarget ? (
                  <>
                    <p>
                      This credits the customer wallet and debits vendor plus platform commission per settlement (3% of
                      commission slice retained).
                    </p>
                    <RefundFinancialSummaryCard r={approveTarget} />
                  </>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveMut.isPending || !approveTarget}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                if (approveTarget) runApprove(approveTarget.id);
              }}
            >
              {approveMut.isPending ? 'Approving…' : 'Confirm approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CRUDModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject refund request"
        description="Review the amounts below, then enter a reason visible to your audit trail."
        size="lg"
        loading={rejectMut.isPending}
        onSave={handleRejectSave}
        saveLabel="Reject refund"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Refund ID</p>
                <p className="font-mono font-semibold text-sm">{selected.id}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-semibold text-sm">{selected.order}</p>
              </div>
            </div>
            <RefundFinancialSummaryCard r={selected} />
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer request</p>
              <p className="text-sm mt-1">{selected.reason || '—'}</p>
            </div>
            <div>
              <Label>Rejection reason <span className="text-destructive">*</span></Label>
              <Textarea
                rows={3}
                className="mt-1.5"
                placeholder="Explain why this refund is being rejected…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}

type PayoutAdminRow = {
  id: string;
  user_name: string;
  user_phone: string;
  type: string;
  phone: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  created_at: string;
};

function WithdrawalsView() {
  const [tab, setTab] = useState<'withdrawals' | 'payouts'>('withdrawals');
  const [filters, setFilters] = useState({ withdrawal_status: 'all' });
  const [search, setSearch] = useState('');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<WithdrawalRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ row: WithdrawalRow; action: 'approved' | 'rejected' } | null>(
    null,
  );
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionErr, setActionErr] = useState('');
  const setFilter = (k: string, v: string) => setFilters((prev) => ({ ...prev, [k]: v }));

  const { data: wdSummary } = useQuery({
    queryKey: ['admin', 'withdrawals-summary'],
    queryFn: () => adminApi.withdrawalsSummary(),
  });

  const { data: withdrawals = [], isLoading, isError } = useAdminList<WithdrawalRow>(
    ['admin', 'withdrawals'],
    () => adminApi.withdrawals({ page_size: 200 }),
  );

  const { data: payoutRows = [], isLoading: payoutLoading, isError: payoutError } = useAdminList<PayoutAdminRow>(
    ['admin', 'payout-accounts-list'],
    () => adminApi.payoutAccounts({ page_size: 200 }),
  );

  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateWithdrawal(id, payload),
    [['admin', 'withdrawals']],
    () => [['admin', 'ledger-transactions'], ['admin', 'withdrawals-summary']],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withdrawals.filter((w) => {
      if (filters.withdrawal_status !== 'all' && w.status !== filters.withdrawal_status) return false;
      if (q) {
        const hay = `${w.seller} ${w.withdrawal_number ?? w.id} ${w.method_account ?? ''} ${w.payout_summary ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [withdrawals, filters.withdrawal_status, search]);

  const payoutFiltered = useMemo(() => {
    const q = payoutSearch.trim().toLowerCase();
    if (!q) return payoutRows;
    return payoutRows.filter((p) => {
      const hay = `${p.user_name} ${p.user_phone} ${p.phone} ${p.bank_account_no}`.toLowerCase();
      return hay.includes(q);
    });
  }, [payoutRows, payoutSearch]);

  const norm = useMemo(
    () =>
      filtered.map((w) => ({
        ...w,
        amount: typeof w.amount === 'number' ? w.amount : Number(w.amount) || 0,
        balance: typeof w.balance === 'number' ? w.balance : Number(w.balance) || 0,
        withdrawal_number: w.withdrawal_number ?? String(w.id),
      })),
    [filtered],
  );

  if (tab === 'payouts') {
    if (payoutLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading payout accounts…</div>;
    if (payoutError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load payout accounts.</div>;
  } else {
    if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading withdrawals…</div>;
    if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load withdrawals.</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {actionErr ? <p className="text-sm text-destructive">{actionErr}</p> : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminStatCard
          icon={Clock}
          title="Pending withdrawals"
          value={wdSummary != null ? String(wdSummary.pending_withdrawals) : '—'}
          color="orange"
        />
        <AdminStatCard
          icon={UserCheck}
          title="Users (KYC verified)"
          value={wdSummary != null ? String(wdSummary.users_kyc_verified) : '—'}
          color="green"
        />
        <AdminStatCard
          icon={Landmark}
          title="Payout accounts"
          value={wdSummary != null ? String(wdSummary.total_payout_accounts) : '—'}
          color="blue"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'withdrawals' | 'payouts')}>
        <TabsList className="h-9">
          <TabsTrigger value="withdrawals" className="text-xs">
            Withdrawals
          </TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs">
            Payout accounts
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'withdrawals' ? (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filters.withdrawal_status} onValueChange={(v) => setFilter('withdrawal_status', v)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.withdrawal_status.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 max-w-xs text-xs"
              placeholder="Search seller, ref, account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AdminTable
            title="Withdrawal requests"
            subtitle="All portal payout requests (customers, family, sellers) — approve or reject pending items"
            data={norm}
            columns={[
              {
                key: 'withdrawal_number',
                label: 'Reference',
                render: (w) => <span className="font-mono text-xs">{w.withdrawal_number}</span>,
              },
              { key: 'seller', label: 'Party', render: (w) => <span className="font-medium">{w.seller}</span> },
              {
                key: 'wallet_type',
                label: 'Wallet',
                render: (w) => <span className="text-xs text-muted-foreground capitalize">{w.wallet_type ?? '—'}</span>,
              },
              {
                key: 'amount',
                label: 'Amount',
                render: (w) => <span className="font-medium">Rs. {w.amount.toLocaleString()}</span>,
              },
              {
                key: 'balance',
                label: 'Bal.',
                render: (w) => <span className="text-muted-foreground text-xs">Rs. {w.balance.toLocaleString()}</span>,
              },
              { key: 'method', label: 'Method' },
              {
                key: 'payout_summary',
                label: 'Payout',
                render: (w) => (
                  <span className="text-xs truncate max-w-[100px] block">{w.payout_summary || '—'}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (w) => (
                  <Badge
                    variant={w.status === 'approved' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}
                    className={cn('text-xs', w.status === 'approved' && 'bg-emerald-500')}
                  >
                    {w.status}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (w) => (
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      type="button"
                      onClick={() => {
                        setSelected(w);
                        setViewOpen(true);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    {w.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-emerald-600"
                          type="button"
                          onClick={() => {
                            setActionErr('');
                            setAdminNote(w.admin_note ?? '');
                            setRejectReason('');
                            setConfirmAction({ row: w, action: 'approved' });
                          }}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-destructive"
                          type="button"
                          onClick={() => {
                            setActionErr('');
                            setAdminNote(w.admin_note ?? '');
                            setRejectReason(w.reject_reason ?? '');
                            setConfirmAction({ row: w, action: 'rejected' });
                          }}
                        >
                          <Ban className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
            onExport={() => {}}
            onFilter={() => {}}
          />
        </>
      ) : (
        <div className="space-y-2">
          <Input
            className="h-8 max-w-xs text-xs"
            placeholder="Search user or account…"
            value={payoutSearch}
            onChange={(e) => setPayoutSearch(e.target.value)}
          />
          <AdminTable
            title="Payout accounts"
            subtitle="Saved eSewa, Khalti, and bank destinations"
            data={payoutFiltered}
            columns={[
              { key: 'user_name', label: 'User' },
              { key: 'user_phone', label: 'Phone' },
              { key: 'type', label: 'Type', render: (p) => <span className="capitalize">{p.type}</span> },
              { key: 'phone', label: 'Wallet phone' },
              { key: 'bank_name', label: 'Bank' },
              { key: 'bank_account_no', label: 'Account' },
            ]}
            onExport={() => {}}
            onFilter={() => {}}
          />
        </div>
      )}

      <CRUDModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Withdrawal details"
        size="lg"
        onSave={() => setViewOpen(false)}
        saveLabel="Close"
      >
        {selected && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg col-span-2">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono font-semibold">{selected.withdrawal_number}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Party</p>
              <p className="font-semibold">{selected.seller}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold">Rs. {selected.amount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Wallet type</p>
              <p className="capitalize">{selected.wallet_type ?? '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Payout</p>
              <p>{selected.payout_summary || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Method</p>
              <p>{selected.method}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Account</p>
              <p>{selected.method_account ?? '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Bank</p>
              <p>{selected.bank_name || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Holder</p>
              <p>{selected.account_holder || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg col-span-2">
              <p className="text-xs text-muted-foreground">Admin note</p>
              <p>{selected.admin_note || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg col-span-2">
              <p className="text-xs text-muted-foreground">Reject reason (user-facing)</p>
              <p>{selected.reject_reason || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="capitalize">{selected.status}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Wallet balance</p>
              <p>Rs. {selected.balance.toLocaleString()}</p>
            </div>
            {selected.proof_image_url ? (
              <div className="p-3 bg-muted/50 rounded-lg col-span-2 space-y-2">
                <p className="text-xs text-muted-foreground">Proof image</p>
                <div className="rounded-lg border border-border/60 bg-background p-2 flex justify-center">
                  <img
                    src={selected.proof_image_url}
                    alt="Withdrawal proof"
                    className="max-h-72 w-full object-contain rounded-md"
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CRUDModal>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'approved' ? 'Approve withdrawal?' : 'Reject withdrawal?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? `${confirmAction.row.seller} — Rs. ${confirmAction.row.amount.toLocaleString()}` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Admin note (optional)</Label>
            <Textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            {confirmAction?.action === 'rejected' ? (
              <div className="space-y-2">
                <Label>Reject reason (shown to user)</Label>
                <Textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className={confirmAction?.action === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
              onClick={async () => {
                if (!confirmAction) return;
                try {
                  const payload: Record<string, unknown> = {
                    status: confirmAction.action,
                    admin_note: adminNote,
                  };
                  if (confirmAction.action === 'rejected') {
                    payload.reject_reason = rejectReason;
                  }
                  await updateMut.mutateAsync({
                    id: confirmAction.row.id,
                    payload,
                  });
                  setConfirmAction(null);
                } catch (e) {
                  setActionErr(formatApiError(e));
                  setConfirmAction(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
