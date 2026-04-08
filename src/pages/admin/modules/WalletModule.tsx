import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, Lock, Unlock, Eye, Ban, CheckCircle, Activity,
  AlertTriangle, TrendingUp, Gift, Star, Users, Plus, DollarSign,
  Edit, Trash2, MoreVertical, X, History, Filter, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { adminApi, type AdminLoyaltySummary, type AdminWalletsSummary } from '@/lib/api';
import { toast } from 'sonner';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import { fetchWalletAdminOptions } from '@/components/admin/adminRelationalPickers';

type WalletRow = {
  id: string;
  owner: string;
  type: string;
  balance: number;
  status: string;
  family: string;
  lastActivity: string;
};
type WalletTxnRow = {
  id: string;
  user: string;
  type: string;
  item: string;
  amount: number;
  time: string;
  status: string;
  family: string;
};
type WalletBonusRow = {
  id: string;
  name: string;
  type: string;
  amount: number;
  status: string;
  title?: string;
  minTopup?: number;
  used?: number;
  expires?: string;
  is_percentage?: boolean;
};
type BonusUiRow = WalletBonusRow & {
  title: string;
  minTopup: number;
  used: number;
  expires: string;
};
type LoyaltyRuleRow = {
  id: string;
  name: string;
  event: string;
  multiplier: number;
  status: string;
  rule?: string;
  rule_description?: string;
};
type LoyaltyUiRow = LoyaltyRuleRow & { rule: string };

interface WalletModuleProps {
  activeSection: string;
}

export default function WalletModule({ activeSection }: WalletModuleProps) {
  switch (activeSection) {
    case 'wallet-settings': return <WalletSettingsView />;
    case 'wallet-flagged': return <WalletFlaggedView />;
    case 'wallet-bonus': return <WalletBonusView />;
    case 'wallet-loyalty': return <WalletLoyaltyView />;
    default: return <WalletOverviewView />;
  }
}

function WalletOverviewView() {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [creditDebitOpen, setCreditDebitOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [freezeAllOpen, setFreezeAllOpen] = useState(false);
  const [selected, setSelected] = useState<WalletRow | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: apiWallets = [] } = useAdminList<WalletRow>(
    ['admin', 'wallets'],
    () => adminApi.wallets({ page_size: 200 }),
  );
  const { data: apiTxns = [] } = useAdminList<WalletTxnRow>(
    ['admin', 'wallet-transactions'],
    () => adminApi.walletTransactions({ page_size: 200 }),
  );
  const { data: summary } = useQuery<AdminWalletsSummary>({
    queryKey: ['admin', 'wallets', 'summary'],
    queryFn: () => adminApi.walletsSummary(),
  });
  const { data: secSettings } = useQuery({
    queryKey: ['admin', 'security-settings'],
    queryFn: () => adminApi.securitySettings(),
  });
  const otpSensitiveCrud = Boolean(secSettings?.otp_sensitive_crud);
  const adjustMut = useAdminMutation(
    adminApi.walletAdjust,
    [
      ['admin', 'wallets'],
      ['admin', 'wallet-transactions'],
      ['admin', 'wallets', 'summary'],
    ],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );
  const updateWalletMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateWallet(id, payload),
    [['admin', 'wallets'], ['admin', 'wallets', 'summary']],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );
  const [walletsData, setWalletsData] = useState<WalletRow[]>([]);
  useEffect(() => {
    setWalletsData(
      apiWallets.map((w) => ({
        ...w,
        lastActivity: w.lastActivity ? new Date(w.lastActivity).toLocaleString() : '—',
      })),
    );
  }, [apiWallets]);
  const allTransactions = apiTxns;

  // Manual credit/debit state
  const [manualUserId, setManualUserId] = useState('');
  const [manualWalletLabel, setManualWalletLabel] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualType, setManualType] = useState<'credit' | 'debit' | null>(null);
  const [manualErr, setManualErr] = useState('');
  const [manualSensitiveOtp, setManualSensitiveOtp] = useState('');

  // Credit/Debit modal state
  const [cdAmount, setCdAmount] = useState('');
  const [cdReason, setCdReason] = useState('');
  const [cdSensitiveOtp, setCdSensitiveOtp] = useState('');
  const [cdErr, setCdErr] = useState('');
  const [freezeErr, setFreezeErr] = useState('');
  const [editWalletStatus, setEditWalletStatus] = useState('active');
  const [editErr, setEditErr] = useState('');

  useEffect(() => {
    if (editOpen && selected) {
      setEditWalletStatus(selected.status);
      setEditErr('');
    }
  }, [editOpen, selected]);

  const filtered = walletsData.filter(w => {
    if (typeFilter !== 'all' && w.type !== typeFilter) return false;
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    return true;
  });

  const txForSelected = selected
    ? allTransactions.filter((tx) => tx.user === selected.owner)
    : allTransactions;

  const sendWalletStepUpOtp = async () => {
    try {
      await adminApi.sendAdminSensitiveOtp();
      toast.success('Verification code sent to your phone.');
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleManualCreditDebit = async (type: 'credit' | 'debit') => {
    if (!manualUserId || !manualAmount) return;
    setManualErr('');
    if (otpSensitiveCrud && !manualSensitiveOtp.trim()) {
      setManualErr('Send a verification code to your phone and enter it here (Security → OTP for sensitive CRUD).');
      return;
    }
    try {
      await adjustMut.mutateAsync({
        wallet_id: manualUserId.trim(),
        amount: parseFloat(manualAmount),
        direction: type,
        reason: manualReason || undefined,
        ...(otpSensitiveCrud ? { sensitive_otp: manualSensitiveOtp.trim() } : {}),
      });
      setManualUserId('');
      setManualWalletLabel('');
      setManualAmount('');
      setManualReason('');
      setManualSensitiveOtp('');
      setManualType(type);
      setTimeout(() => setManualType(null), 1200);
    } catch (e) {
      setManualErr(formatApiError(e));
    }
  };

  const handleFreezeWallet = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'frozen' : 'active';
    try {
      await updateWalletMut.mutateAsync({ id, payload: { status: next } });
    } catch {
      /* list refetches */
    }
  };

  const handleFreezeAll = async () => {
    setFreezeErr('');
    try {
      for (const w of walletsData) {
        if (w.status !== 'frozen') {
          await updateWalletMut.mutateAsync({ id: w.id, payload: { status: 'frozen' } });
        }
      }
      setFreezeAllOpen(false);
    } catch (e) {
      setFreezeErr(formatApiError(e));
    }
  };

  const handleUnfreezeAll = async () => {
    setFreezeErr('');
    try {
      for (const w of walletsData) {
        if (w.status === 'frozen') {
          await updateWalletMut.mutateAsync({ id: w.id, payload: { status: 'active' } });
        }
      }
    } catch (e) {
      setFreezeErr(formatApiError(e));
    }
  };

  const handleCreditDebitSelected = async (type: 'credit' | 'debit') => {
    if (!selected || !cdAmount) return;
    setCdErr('');
    if (otpSensitiveCrud && !cdSensitiveOtp.trim()) {
      setCdErr('Send a verification code to your phone and enter it below.');
      return;
    }
    try {
      await adjustMut.mutateAsync({
        wallet_id: selected.id,
        amount: parseFloat(cdAmount),
        direction: type,
        reason: cdReason || undefined,
        ...(otpSensitiveCrud ? { sensitive_otp: cdSensitiveOtp.trim() } : {}),
      });
      setCreditDebitOpen(false);
      setCdAmount('');
      setCdReason('');
      setCdSensitiveOtp('');
    } catch (e) {
      setCdErr(formatApiError(e));
    }
  };

  const saveEditWallet = async () => {
    if (!selected) return;
    setEditErr('');
    try {
      await updateWalletMut.mutateAsync({
        id: selected.id,
        payload: { status: editWalletStatus },
      });
      setEditOpen(false);
    } catch (e) {
      setEditErr(formatApiError(e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Wallet} title="Total Wallets" value={summary != null ? String(summary.total_wallets) : '—'} color="blue" />
        <AdminStatCard icon={TrendingUp} title="Total Balance" value={summary != null ? `Rs. ${summary.total_balance.toLocaleString()}` : '—'} color="green" />
        <AdminStatCard icon={Lock} title="Frozen" value={summary != null ? String(summary.frozen_wallets) : String(walletsData.filter(w => w.status === 'frozen').length)} color="red" />
        <AdminStatCard icon={AlertTriangle} title="Flagged txns" value={summary != null ? String(summary.flagged_transactions) : '—'} color="orange" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={ArrowUpRight} title="Total credit (completed)" value={summary != null ? `Rs. ${summary.total_credit.toLocaleString()}` : '—'} color="green" />
        <AdminStatCard icon={ArrowDownLeft} title="Total debit (completed)" value={summary != null ? `Rs. ${summary.total_debit.toLocaleString()}` : '—'} color="red" />
        <AdminStatCard icon={Gift} title="Bonus transactions" value={summary != null ? `Rs. ${summary.total_bonus_transactions.toLocaleString()}` : '—'} color="purple" />
        <AdminStatCard icon={Star} title="Active bonus rules" value={summary != null ? String(summary.wallet_bonuses_active_count) : '—'} color="orange" />
      </div>

      {/* Manual Credit/Debit */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Manual Credit / Debit</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Wallet</Label>
              <AdminSearchCombobox
                queryKeyPrefix="wallet-manual-adjust"
                value={manualUserId}
                selectedLabel={manualWalletLabel}
                onChange={(v, l) => { setManualUserId(v); setManualWalletLabel(l ?? ''); }}
                fetchOptions={fetchWalletAdminOptions}
                placeholder="Search wallet…"
                clearable
              />
            </div>
            <div><Label>Amount (Rs.)</Label><Input placeholder="0" type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} /></div>
            <div><Label>Reason</Label><Input placeholder="Admin adjustment..." value={manualReason} onChange={e => setManualReason(e.target.value)} /></div>
            {otpSensitiveCrud ? (
              <div className="md:col-span-4 space-y-2 p-3 border rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Sensitive CRUD requires a one-time code sent to your admin phone.
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => { void sendWalletStepUpOtp(); }}>
                    Send code
                  </Button>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs">Verification code</Label>
                    <Input
                      className="h-8 font-mono"
                      placeholder="6-digit OTP"
                      value={manualSensitiveOtp}
                      onChange={(e) => setManualSensitiveOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex gap-2 md:col-span-4">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => { void handleManualCreditDebit('credit'); }} disabled={!manualUserId || !manualAmount || adjustMut.isPending}>
                {manualType === 'credit' ? '✓ Credited' : '+ Credit'}
              </Button>
              <Button variant="destructive" className="flex-1" size="sm" onClick={() => { void handleManualCreditDebit('debit'); }} disabled={!manualUserId || !manualAmount || adjustMut.isPending}>
                {manualType === 'debit' ? '✓ Debited' : '- Debit'}
              </Button>
            </div>
          </div>
          {manualErr ? <p className="text-sm text-destructive mt-2">{manualErr}</p> : null}
        </CardContent>
      </Card>

      {/* Freeze All + Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="destructive" size="sm" onClick={() => { setFreezeErr(''); setFreezeAllOpen(true); }} disabled={updateWalletMut.isPending}>
          <Lock className="w-3 h-3 mr-1" /> Freeze All Wallets
        </Button>
        <Button variant="outline" size="sm" onClick={() => { void handleUnfreezeAll(); }} disabled={updateWalletMut.isPending}>
          <Unlock className="w-3 h-3 mr-1" /> Unfreeze All
        </Button>
        {freezeErr ? <span className="text-xs text-destructive">{freezeErr}</span> : null}
        <div className="flex-1" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Wallet Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="child">Child</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== 'all' || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <AdminTable title="All Wallets — Master View"
        subtitle="Parent, child, vendor, and shared wallets — full CRUD, freeze/unblock, reverse transactions"
        data={filtered}
        columns={[
          { key: 'owner', label: 'Owner', render: (w) => <span className="font-medium">{w.owner}</span> },
          { key: 'type', label: 'Type', render: (w) => <Badge variant="outline" className="text-xs capitalize">{w.type}</Badge> },
          { key: 'balance', label: 'Balance', render: (w) => <span className="font-bold">Rs. {w.balance.toLocaleString()}</span> },
          { key: 'family', label: 'Group/Family' },
          { key: 'lastActivity', label: 'Last Activity' },
          { key: 'status', label: 'Status', render: (w) => (
            <Badge variant={w.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", w.status === 'active' && "bg-emerald-500")}>
              {w.status === 'frozen' && <Lock className="w-3 h-3 mr-1" />}{w.status}
            </Badge>
          )},
          { key: 'actions', label: '', render: (w) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSelected(w); setViewOpen(true); }}><Eye className="w-4 h-4 mr-2" /> View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(w); setEditOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit Wallet</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(w); setCdAmount(''); setCdReason(''); setCdSensitiveOtp(''); setCdErr(''); setCreditDebitOpen(true); }}><DollarSign className="w-4 h-4 mr-2" /> Credit / Debit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(w); setTransactionsOpen(true); }}><History className="w-4 h-4 mr-2" /> Transactions</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { void handleFreezeWallet(w.id, w.status); }} className={w.status === 'active' ? "text-destructive" : "text-emerald-600"}>
                  {w.status === 'active' ? <><Lock className="w-4 h-4 mr-2" /> Freeze Wallet</> : <><Unlock className="w-4 h-4 mr-2" /> Unfreeze Wallet</>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onExport={() => {}} onFilter={() => {}}
      />

      {/* View Details Modal */}
      <CRUDModal open={viewOpen} onClose={() => setViewOpen(false)} title={`Wallet Details — ${selected?.owner}`} size="xl" onSave={() => setViewOpen(false)} saveLabel="Close">
        {selected && (
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="actions">Admin Actions</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Owner</p><p className="font-bold">{selected.owner}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Type</p><p className="font-bold capitalize">{selected.type}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Balance</p><p className="font-bold text-lg">Rs. {selected.balance.toLocaleString()}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selected.status === 'active' ? 'default' : 'destructive'} className={cn("text-xs mt-1", selected.status === 'active' && "bg-emerald-500")}>{selected.status}</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2"><p className="text-xs text-muted-foreground">Group / Family</p><p className="font-bold">{selected.family}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="transactions" className="space-y-2">
              {txForSelected.slice(0, 8).map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-2 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{tx.item}</p>
                    <p className="text-xs text-muted-foreground">{tx.user} · {tx.time}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn("font-bold", tx.amount > 0 ? "text-emerald-600" : "text-destructive")}>
                      {tx.amount > 0 ? '+' : ''}Rs. {Math.abs(tx.amount).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="actions" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewOpen(false); setCreditDebitOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Credit Wallet</Button>
                <Button variant="destructive" onClick={() => { setViewOpen(false); setCreditDebitOpen(true); }}><Ban className="w-4 h-4 mr-2" /> Debit Wallet</Button>
                <Button variant="outline" onClick={() => { void handleFreezeWallet(selected.id, selected.status); }} className={selected.status === 'active' ? "text-destructive" : "text-emerald-600"}>
                  {selected.status === 'active' ? <><Lock className="w-4 h-4 mr-2" /> Freeze Wallet</> : <><Unlock className="w-4 h-4 mr-2" /> Unfreeze Wallet</>}
                </Button>
                <Button variant="outline"><History className="w-4 h-4 mr-2" /> Reverse Last Tx</Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CRUDModal>

      {/* Edit Wallet Modal */}
      <CRUDModal open={editOpen} onClose={() => { setEditOpen(false); setEditErr(''); }} title="Edit Wallet" onSave={() => { void saveEditWallet(); }} loading={updateWalletMut.isPending} error={editErr}>
        {selected && (
          <div className="space-y-4">
            <div><Label>Owner</Label><Input value={selected.owner} readOnly className="bg-muted/50" /></div>
            <div><Label>Type</Label><Input value={selected.type} readOnly className="bg-muted/50 capitalize" /></div>
            <div><Label>Status</Label>
              <Select value={editWalletStatus} onValueChange={setEditWalletStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Daily limits and fees are controlled in Wallet Settings.</p>
          </div>
        )}
      </CRUDModal>

      {/* Credit/Debit Modal for selected wallet */}
      <CRUDModal open={creditDebitOpen} onClose={() => { setCreditDebitOpen(false); setCdErr(''); setCdSensitiveOtp(''); }} title={`Manual Credit/Debit — ${selected?.owner}`} size="md" error={cdErr}>
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold">Rs. {selected.balance.toLocaleString()}</p>
            </div>
            <div><Label>Amount (Rs.)</Label><Input type="number" placeholder="Enter amount" value={cdAmount} onChange={e => setCdAmount(e.target.value)} /></div>
            <div><Label>Reason</Label><Textarea placeholder="Reason for credit/debit..." rows={3} value={cdReason} onChange={e => setCdReason(e.target.value)} /></div>
            {otpSensitiveCrud ? (
              <div className="space-y-2 p-3 border rounded-lg">
                <Button type="button" variant="outline" size="sm" onClick={() => { void sendWalletStepUpOtp(); }}>
                  Send verification code
                </Button>
                <div>
                  <Label>Verification code</Label>
                  <Input
                    className="font-mono"
                    placeholder="6-digit OTP"
                    value={cdSensitiveOtp}
                    onChange={(e) => setCdSensitiveOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { void handleCreditDebitSelected('credit'); }} disabled={!cdAmount || adjustMut.isPending}>
                + Credit
              </Button>
              <Button variant="destructive" onClick={() => { void handleCreditDebitSelected('debit'); }} disabled={!cdAmount || adjustMut.isPending}>
                - Debit
              </Button>
            </div>
          </div>
        )}
      </CRUDModal>

      {/* Transactions Modal */}
      <CRUDModal open={transactionsOpen} onClose={() => setTransactionsOpen(false)} title={`Transactions — ${selected?.owner}`} size="xl" onSave={() => setTransactionsOpen(false)} saveLabel="Close">
        <div className="space-y-2">
          {txForSelected.map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg text-sm">
              <div>
                <p className="font-medium">{tx.item}</p>
                <p className="text-xs text-muted-foreground">{tx.user} · {tx.time}</p>
              </div>
              <div className="text-right">
                <span className={cn("font-bold", tx.amount > 0 ? "text-emerald-600" : "text-destructive")}>
                  {tx.amount > 0 ? '+' : ''}Rs. {Math.abs(tx.amount).toLocaleString()}
                </span>
                <Badge variant="outline" className="text-[10px] ml-2">{tx.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CRUDModal>

      {/* Freeze All Confirm */}
      <CRUDModal open={freezeAllOpen} onClose={() => { setFreezeAllOpen(false); setFreezeErr(''); }} title="Freeze all wallets" onSave={() => { void handleFreezeAll(); }} saveLabel="Freeze all" loading={updateWalletMut.isPending} error={freezeErr}>
        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="font-medium text-destructive">This will freeze every wallet in the current list.</p>
            <p className="text-sm text-muted-foreground mt-1">Use Unfreeze All or per-wallet actions to restore access.</p>
          </div>
        </div>
      </CRUDModal>
    </div>
  );
}

function WalletBonusView() {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<BonusUiRow | null>(null);
  const { data: summary } = useQuery<AdminWalletsSummary>({
    queryKey: ['admin', 'wallets', 'summary'],
    queryFn: () => adminApi.walletsSummary(),
  });
  const { data: apiBonuses = [] } = useAdminList<WalletBonusRow>(
    ['admin', 'wallet-bonuses'],
    () => adminApi.walletBonuses({ page_size: 200 }),
  );
  const summaryInv = [['admin', 'wallet-bonuses'], ['admin', 'wallets', 'summary']] as const;
  const createB = useAdminMutation(adminApi.createWalletBonus, [...summaryInv]);
  const updateB = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateWalletBonus(id, payload),
    [...summaryInv],
  );
  const deleteB = useAdminMutation((id: string) => adminApi.deleteWalletBonus(id), [...summaryInv]);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState('signup');
  const [addAmount, setAddAmount] = useState('');
  const [addMinTopup, setAddMinTopup] = useState('');
  const [addExpires, setAddExpires] = useState('');
  const [addPct, setAddPct] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMinTopup, setEditMinTopup] = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editPct, setEditPct] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [bonusDelOpen, setBonusDelOpen] = useState(false);
  const [bonusDelTarget, setBonusDelTarget] = useState<BonusUiRow | null>(null);
  const [bonusDelErr, setBonusDelErr] = useState('');

  const bonusData: BonusUiRow[] = apiBonuses.map((b) => ({
    ...b,
    title: b.title ?? b.name,
    minTopup: b.minTopup ?? 0,
    used: b.used ?? 0,
    expires: b.expires ? String(b.expires) : '—',
  }));

  useEffect(() => {
    if (selected && editOpen) {
      setEditTitle(selected.title);
      setEditAmount(String(selected.amount));
      setEditMinTopup(String(selected.minTopup ?? 0));
      setEditExpires(selected.expires && selected.expires !== '—' ? selected.expires.slice(0, 10) : '');
      setEditStatus(selected.status);
      setEditPct(!!selected.is_percentage);
      setEditErr('');
    }
  }, [selected, editOpen]);

  const submitAdd = async () => {
    setAddErr('');
    const title = addTitle.trim();
    if (!title) {
      setAddErr('Title is required.');
      return;
    }
    const amt = parseFloat(addAmount);
    if (Number.isNaN(amt) || amt < 0) {
      setAddErr('Amount must be a non-negative number.');
      return;
    }
    try {
      await createB.mutateAsync({
        title,
        type: addType,
        amount: amt,
        is_percentage: addPct,
        min_topup: parseFloat(addMinTopup) || 0,
        expires_at: addExpires || null,
        status: 'active',
      });
      setAddOpen(false);
      setAddTitle('');
      setAddAmount('');
      setAddMinTopup('');
      setAddExpires('');
      setAddPct(false);
    } catch (e) {
      setAddErr(formatApiError(e));
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    setEditErr('');
    try {
      await updateB.mutateAsync({
        id: selected.id,
        payload: {
          title: editTitle.trim(),
          amount: parseFloat(editAmount) || 0,
          min_topup: parseFloat(editMinTopup) || 0,
          expires_at: editExpires || null,
          status: editStatus,
          is_percentage: editPct,
        },
      });
      setEditOpen(false);
    } catch (e) {
      setEditErr(formatApiError(e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">Wallet Bonus</h2><p className="text-sm text-muted-foreground">Manage signup, topup, and referral bonuses</p></div>
        <Button size="sm" onClick={() => { setAddErr(''); setAddOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Bonus</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Gift} title="Active bonus rules" value={summary != null ? String(summary.wallet_bonuses_active_count) : '—'} color="green" />
        <AdminStatCard icon={Users} title="Bonus uses (total)" value={summary != null ? String(summary.wallet_bonuses_used_total) : '—'} color="blue" />
        <AdminStatCard icon={TrendingUp} title="Bonus txns (Rs.)" value={summary != null ? `Rs. ${summary.total_bonus_transactions.toLocaleString()}` : '—'} color="purple" />
        <AdminStatCard icon={Wallet} title="Total balance (all wallets)" value={summary != null ? `Rs. ${summary.total_balance.toLocaleString()}` : '—'} color="orange" />
      </div>

      <AdminTable title="Bonus Rules" subtitle="Configure wallet bonus triggers"
        data={bonusData}
        columns={[
          { key: 'title', label: 'Title', render: (b) => <span className="font-medium">{b.title}</span> },
          { key: 'type', label: 'Type', render: (b) => <Badge variant="outline" className="text-xs capitalize">{b.type}</Badge> },
          { key: 'amount', label: 'Amount', render: (b) => <span className="font-bold">{b.is_percentage ? `${b.amount}%` : `Rs. ${b.amount}`}</span> },
          { key: 'minTopup', label: 'Min Top-up', render: (b) => b.minTopup > 0 ? `Rs. ${b.minTopup}` : '-' },
          { key: 'used', label: 'Used', render: (b) => <span className="font-medium">{b.used}</span> },
          { key: 'expires', label: 'Expires' },
          { key: 'status', label: 'Status', render: (b) => (
            <Badge variant={b.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", b.status === 'active' && "bg-emerald-500")}>{b.status}</Badge>
          )},
          { key: 'actions', label: '', render: (b) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(b); setEditOpen(true); }}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => { setBonusDelErr(''); setBonusDelTarget(b); setBonusDelOpen(true); }}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          )},
        ]}
        onExport={() => {}} onFilter={() => {}}
      />

      <CRUDModal open={addOpen} onClose={() => { setAddOpen(false); setAddErr(''); }} title="Add Wallet Bonus" onSave={() => { void submitAdd(); }} loading={createB.isPending} error={addErr}>
        <div className="space-y-4">
          <div><Label>Bonus Title</Label><Input placeholder="e.g. Welcome Bonus" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} /></div>
          <div><Label>Bonus Type</Label>
            <Select value={addType} onValueChange={setAddType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="signup">Signup</SelectItem>
                <SelectItem value="topup">Top-up</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (Rs. or %)</Label><Input type="number" placeholder="100" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} /></div>
            <div>
              <Label>Min Top-up (Rs.)</Label>
              <Input type="number" placeholder="0" value={addMinTopup} onChange={(e) => setAddMinTopup(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Top-up: minimum principal to qualify. For % signup or referral bonuses, this is the monetary base the percentage applies to (required when using %).</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="text-sm font-medium">Amount is percentage</span>
            <Switch checked={addPct} onCheckedChange={setAddPct} />
          </div>
          <div><Label>Expiry Date</Label><Input type="date" value={addExpires} onChange={(e) => setAddExpires(e.target.value)} /></div>
        </div>
      </CRUDModal>

      <CRUDModal open={editOpen} onClose={() => { setEditOpen(false); setEditErr(''); }} title="Edit Wallet Bonus" onSave={() => { void submitEdit(); }} loading={updateB.isPending} error={editErr}>
        {selected && (
          <div className="space-y-4">
            <div><Label>Bonus Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div><Label>Amount</Label><Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} /></div>
            <div>
              <Label>Min Top-up</Label>
              <Input type="number" value={editMinTopup} onChange={(e) => setEditMinTopup(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Top-up: minimum principal. % signup/referral: base amount for the percentage.</p>
            </div>
            <div><Label>Expiry Date</Label><Input type="date" value={editExpires} onChange={(e) => setEditExpires(e.target.value)} /></div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Amount is percentage</span>
              <Switch checked={editPct} onCheckedChange={setEditPct} />
            </div>
            <div><Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirm
        open={bonusDelOpen}
        onClose={() => { setBonusDelOpen(false); setBonusDelTarget(null); setBonusDelErr(''); }}
        onConfirm={() => {
          if (!bonusDelTarget) return;
          setBonusDelErr('');
          void (async () => {
            try {
              await deleteB.mutateAsync(bonusDelTarget.id);
              setBonusDelOpen(false);
              setBonusDelTarget(null);
            } catch (e) {
              setBonusDelErr(formatApiError(e));
            }
          })();
        }}
        loading={deleteB.isPending}
        title={bonusDelTarget ? `Delete bonus "${bonusDelTarget.title}"?` : 'Delete bonus?'}
        description={bonusDelErr || 'This removes the bonus rule. Existing wallet balances are not changed.'}
      />
    </div>
  );
}

function WalletLoyaltyView() {
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<LoyaltyUiRow | null>(null);
  const loyaltyInv = [
    ['admin', 'loyalty-rules'],
    ['admin', 'wallets', 'summary'],
    ['admin', 'loyalty', 'summary'],
  ] as const;
  const { data: summary } = useQuery<AdminWalletsSummary>({
    queryKey: ['admin', 'wallets', 'summary'],
    queryFn: () => adminApi.walletsSummary(),
  });
  const { data: loyaltySum } = useQuery<AdminLoyaltySummary>({
    queryKey: ['admin', 'loyalty', 'summary'],
    queryFn: () => adminApi.loyaltySummary(),
  });
  const { data: loyaltyCfg, isLoading: loyaltyCfgLoading } = useQuery({
    queryKey: ['admin', 'loyalty-settings'],
    queryFn: () => adminApi.loyaltySettings(),
  });
  const { data: apiRules = [] } = useAdminList<LoyaltyRuleRow>(
    ['admin', 'loyalty-rules'],
    () => adminApi.loyaltyRules({ page_size: 200 }),
  );
  const createR = useAdminMutation(adminApi.createLoyaltyRule, [...loyaltyInv]);
  const updateR = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateLoyaltyRule(id, payload),
    [...loyaltyInv],
  );
  const deleteR = useAdminMutation((id: string) => adminApi.deleteLoyaltyRule(id), [...loyaltyInv]);
  const [ppu, setPpu] = useState('');
  const [rpc, setRpc] = useState('');
  const [minR, setMinR] = useState('');
  const [maxR, setMaxR] = useState('');
  const [refPts, setRefPts] = useState('');
  const [loyEnabled, setLoyEnabled] = useState(true);
  const [loySaveErr, setLoySaveErr] = useState('');
  const [loySaveOk, setLoySaveOk] = useState(false);
  const saveLoyaltyCfg = useAdminMutation(adminApi.updateLoyaltySettings, [
    ['admin', 'loyalty-settings'],
    ['admin', 'loyalty', 'summary'],
    ['admin', 'wallets', 'summary'],
  ]);
  const rulesData: LoyaltyUiRow[] = apiRules.map((r) => ({
    ...r,
    rule: r.rule_description ?? r.rule ?? r.event,
  }));
  const [newName, setNewName] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newMult, setNewMult] = useState('1');
  const [newEvent, setNewEvent] = useState('purchase');
  const [addErr, setAddErr] = useState('');
  const [editName, setEditName] = useState('');
  const [editRule, setEditRule] = useState('');
  const [editMult, setEditMult] = useState('1');
  const [editStatus, setEditStatus] = useState('active');
  const [editErr, setEditErr] = useState('');
  const [loyDelOpen, setLoyDelOpen] = useState(false);
  const [loyDelTarget, setLoyDelTarget] = useState<LoyaltyUiRow | null>(null);
  const [loyDelErr, setLoyDelErr] = useState('');

  useEffect(() => {
    if (!loyaltyCfg) return;
    setPpu(String(loyaltyCfg.points_per_currency_unit ?? ''));
    setRpc(String(loyaltyCfg.redeem_points_per_currency ?? ''));
    setMinR(String(loyaltyCfg.min_redeem_points ?? ''));
    setMaxR(String(loyaltyCfg.max_redeem_per_order ?? ''));
    setRefPts(String(loyaltyCfg.referral_bonus_points ?? ''));
    setLoyEnabled(!!loyaltyCfg.loyalty_program_enabled);
    setLoySaveErr('');
  }, [loyaltyCfg]);

  useEffect(() => {
    if (selected && editOpen) {
      setEditName(selected.name);
      setEditRule(selected.rule);
      setEditMult(String(selected.multiplier));
      setEditStatus(selected.status);
      setEditErr('');
    }
  }, [selected, editOpen]);

  const submitLoyaltySettings = async () => {
    setLoySaveErr('');
    setLoySaveOk(false);
    try {
      await saveLoyaltyCfg.mutateAsync({
        points_per_currency_unit: parseFloat(ppu) || 0,
        redeem_points_per_currency: parseFloat(rpc) || 0,
        min_redeem_points: parseInt(minR, 10) || 0,
        max_redeem_per_order: parseInt(maxR, 10) || 0,
        referral_bonus_points: parseInt(refPts, 10) || 0,
        loyalty_program_enabled: loyEnabled,
      });
      setLoySaveOk(true);
      setTimeout(() => setLoySaveOk(false), 4000);
    } catch (e) {
      setLoySaveErr(formatApiError(e));
    }
  };

  const submitAddRule = async () => {
    setAddErr('');
    try {
      await createR.mutateAsync({
        name: newName.trim(),
        rule_description: newRule.trim(),
        multiplier: parseInt(newMult, 10) || 1,
        event: newEvent,
        status: 'active',
      });
      setAddRuleOpen(false);
      setNewName('');
      setNewRule('');
      setNewMult('1');
    } catch (e) {
      setAddErr(formatApiError(e));
    }
  };

  const submitEditRule = async () => {
    if (!selected) return;
    setEditErr('');
    try {
      await updateR.mutateAsync({
        id: selected.id,
        payload: {
          name: editName.trim(),
          rule_description: editRule.trim(),
          multiplier: parseInt(editMult, 10) || 1,
          status: editStatus,
        },
      });
      setEditOpen(false);
    } catch (e) {
      setEditErr(formatApiError(e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">Loyalty & Referral Program</h2><p className="text-sm text-muted-foreground">Manage points rules (bonus totals come from wallet transactions)</p></div>
        <Button size="sm" onClick={() => { setAddErr(''); setAddRuleOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Rule</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Star} title="Bonus txn volume (Rs.)" value={summary != null ? summary.points_issued_sum.toLocaleString() : '—'} color="orange" />
        <AdminStatCard icon={Gift} title="Active loyalty rules" value={loyaltySum != null ? String(loyaltySum.active_loyalty_rules) : '—'} color="green" />
        <AdminStatCard icon={Users} title="Referrals (users)" value={loyaltySum != null ? String(loyaltySum.referral_count) : '—'} color="blue" />
        <AdminStatCard icon={DollarSign} title="Total wallet balance" value={summary != null ? `Rs. ${summary.total_balance.toLocaleString()}` : '—'} color="purple" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Redemption & earn settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loyaltyCfgLoading ? (
            <p className="text-sm text-muted-foreground">Loading loyalty settings…</p>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Loyalty program enabled</span>
                <Switch checked={loyEnabled} onCheckedChange={setLoyEnabled} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Points per 1.00 currency spent</Label><Input value={ppu} onChange={(e) => setPpu(e.target.value)} /></div>
                <div><Label>Points to redeem 1.00 currency</Label><Input value={rpc} onChange={(e) => setRpc(e.target.value)} /></div>
                <div><Label>Min redeem (points)</Label><Input value={minR} onChange={(e) => setMinR(e.target.value)} /></div>
                <div><Label>Max redeem per order (points)</Label><Input value={maxR} onChange={(e) => setMaxR(e.target.value)} /></div>
                <div><Label>Referral bonus (points)</Label><Input value={refPts} onChange={(e) => setRefPts(e.target.value)} /></div>
              </div>
              {loySaveOk ? <p className="text-sm text-emerald-600">Settings saved.</p> : null}
              {loySaveErr ? <p className="text-sm text-destructive">{loySaveErr}</p> : null}
              <Button type="button" onClick={() => { void submitLoyaltySettings(); }} disabled={saveLoyaltyCfg.isPending}>
                Save redemption settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <AdminTable title="Loyalty Rules" subtitle="Define how points are earned and spent"
        data={rulesData}
        columns={[
          { key: 'name', label: 'Rule Name', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'rule', label: 'Rule Description' },
          { key: 'multiplier', label: 'Points', render: (r) => <span className="font-bold text-primary">{r.multiplier} pts</span> },
          { key: 'status', label: 'Status', render: (r) => (
            <Badge variant={r.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", r.status === 'active' && "bg-emerald-500")}>{r.status}</Badge>
          )},
          { key: 'actions', label: '', render: (r) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(r); setEditOpen(true); }}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => { setLoyDelErr(''); setLoyDelTarget(r); setLoyDelOpen(true); }}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          )},
        ]}
        onExport={() => {}} onFilter={() => {}}
      />

      <CRUDModal open={addRuleOpen} onClose={() => { setAddRuleOpen(false); setAddErr(''); }} title="Add Loyalty Rule" onSave={() => { void submitAddRule(); }} loading={createR.isPending} error={addErr}>
        <div className="space-y-4">
          <div><Label>Rule Name</Label><Input placeholder="e.g. Purchase Points" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div><Label>Description</Label><Input placeholder="e.g. 1 point per Rs. 100 spent" value={newRule} onChange={(e) => setNewRule(e.target.value)} /></div>
          <div><Label>Points (multiplier)</Label><Input type="number" placeholder="1" value={newMult} onChange={(e) => setNewMult(e.target.value)} /></div>
          <div><Label>Trigger Event</Label>
            <Select value={newEvent} onValueChange={setNewEvent}>
              <SelectTrigger><SelectValue placeholder="When does this trigger?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">On Purchase</SelectItem>
                <SelectItem value="review">On Review</SelectItem>
                <SelectItem value="referral">On Referral</SelectItem>
                <SelectItem value="birthday">On Birthday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={editOpen} onClose={() => { setEditOpen(false); setEditErr(''); }} title="Edit Loyalty Rule" onSave={() => { void submitEditRule(); }} loading={updateR.isPending} error={editErr}>
        {selected && (
          <div className="space-y-4">
            <div><Label>Rule Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Description</Label><Input value={editRule} onChange={(e) => setEditRule(e.target.value)} /></div>
            <div><Label>Points (multiplier)</Label><Input type="number" value={editMult} onChange={(e) => setEditMult(e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirm
        open={loyDelOpen}
        onClose={() => { setLoyDelOpen(false); setLoyDelTarget(null); setLoyDelErr(''); }}
        onConfirm={() => {
          if (!loyDelTarget) return;
          setLoyDelErr('');
          void (async () => {
            try {
              await deleteR.mutateAsync(loyDelTarget.id);
              setLoyDelOpen(false);
              setLoyDelTarget(null);
            } catch (e) {
              setLoyDelErr(formatApiError(e));
            }
          })();
        }}
        loading={deleteR.isPending}
        title={loyDelTarget ? `Delete loyalty rule "${loyDelTarget.name}"?` : 'Delete rule?'}
        description={loyDelErr || 'This removes the rule from the catalog. Past points are not reversed.'}
      />
    </div>
  );
}

function WalletSettingsView() {
  const { data: ws, isLoading, isError } = useQuery({
    queryKey: ['admin', 'wallet-settings'],
    queryFn: () => adminApi.walletSettings(),
  });
  const updateMut = useAdminMutation(adminApi.updateWalletSettings, [
    ['admin', 'wallet-settings'],
    ['admin', 'wallets', 'summary'],
  ]);
  const [saveErr, setSaveErr] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [maxBal, setMaxBal] = useState('');
  const [dailyXfer, setDailyXfer] = useState('');
  const [minWd, setMinWd] = useState('');
  const [maxWdDay, setMaxWdDay] = useState('');
  const [feeType, setFeeType] = useState<'flat' | 'percentage'>('percentage');
  const [feeVal, setFeeVal] = useState('');
  const [vendorDays, setVendorDays] = useState('');
  const [otpWd, setOtpWd] = useState(true);
  const [otpAbove, setOtpAbove] = useState('');
  const [autoFlag, setAutoFlag] = useState(true);
  const [shared, setShared] = useState(true);
  const [individual, setIndividual] = useState(true);
  const [flat, setFlat] = useState(true);
  const [vendorW, setVendorW] = useState(true);
  const [familyW, setFamilyW] = useState(true);
  const [childW, setChildW] = useState(true);

  useEffect(() => {
    if (!ws) return;
    setMaxBal(String(ws.max_balance_per_user ?? ''));
    setDailyXfer(String(ws.daily_transfer_limit ?? ''));
    setMinWd(String(ws.min_withdrawal ?? ''));
    setMaxWdDay(String(ws.max_withdrawal_per_day ?? ''));
    setFeeType((ws.transaction_fee_type === 'flat' ? 'flat' : 'percentage') as 'flat' | 'percentage');
    setFeeVal(String(ws.transaction_fee_value ?? ''));
    setVendorDays(String(ws.vendor_settlement_days ?? ''));
    setOtpWd(!!ws.otp_for_withdrawals);
    setOtpAbove(String(ws.otp_for_transfers_above ?? ''));
    setAutoFlag(!!ws.auto_flag_suspicious);
    setShared(!!ws.shared_wallet_enabled);
    setIndividual(!!ws.individual_wallet_enabled);
    setFlat(!!ws.flat_wallet_enabled);
    setVendorW(!!ws.vendor_wallet_enabled);
    setFamilyW(!!ws.family_wallet_enabled);
    setChildW(!!ws.child_wallet_enabled);
    setSaveErr('');
  }, [ws]);

  const saveSettings = async () => {
    setSaveErr('');
    setSaveOk(false);
    try {
      await updateMut.mutateAsync({
        max_balance_per_user: parseFloat(maxBal) || 0,
        daily_transfer_limit: parseFloat(dailyXfer) || 0,
        min_withdrawal: parseFloat(minWd) || 0,
        max_withdrawal_per_day: parseFloat(maxWdDay) || 0,
        transaction_fee_type: feeType,
        transaction_fee_value: parseFloat(feeVal) || 0,
        vendor_settlement_days: parseInt(vendorDays, 10) || 0,
        otp_for_withdrawals: otpWd,
        otp_for_transfers_above: parseFloat(otpAbove) || 0,
        auto_flag_suspicious: autoFlag,
        shared_wallet_enabled: shared,
        individual_wallet_enabled: individual,
        flat_wallet_enabled: flat,
        vendor_wallet_enabled: vendorW,
        family_wallet_enabled: familyW,
        child_wallet_enabled: childW,
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 4000);
    } catch (e) {
      setSaveErr(formatApiError(e));
    }
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading wallet settings…</div>;
  }
  if (isError || !ws) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load wallet settings.</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h2 className="text-lg font-bold text-foreground">Wallet Settings</h2><p className="text-sm text-muted-foreground">Global wallet configuration (persisted on the server)</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Wallet Limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Max Balance per User (Rs.)</Label><Input value={maxBal} onChange={(e) => setMaxBal(e.target.value)} /></div>
            <div><Label>Daily Transfer Limit (Rs.)</Label><Input value={dailyXfer} onChange={(e) => setDailyXfer(e.target.value)} /></div>
            <div><Label>Min Withdrawal (Rs.)</Label><Input value={minWd} onChange={(e) => setMinWd(e.target.value)} /></div>
            <div><Label>Max Withdrawal per Day (Rs.)</Label><Input value={maxWdDay} onChange={(e) => setMaxWdDay(e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Enabled wallet types</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Shared', shared, setShared] as const,
              ['Individual', individual, setIndividual] as const,
              ['Flat', flat, setFlat] as const,
              ['Vendor', vendorW, setVendorW] as const,
              ['Family', familyW, setFamilyW] as const,
              ['Child', childW, setChildW] as const,
            ].map(([label, on, setOn]) => (
              <div key={label} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium text-sm">{label}</span>
                <Switch checked={on} onCheckedChange={(v) => setOn(!!v)} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Transaction Rules</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Transaction Fee Type</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={feeType === 'flat' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setFeeType('flat')}>Flat</Button>
                <Button type="button" variant={feeType === 'percentage' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setFeeType('percentage')}>Percentage</Button>
              </div>
            </div>
            <div><Label>Transaction Fee Value</Label><Input value={feeVal} onChange={(e) => setFeeVal(e.target.value)} /></div>
            <div><Label>Vendor Settlement Period (days)</Label><Input value={vendorDays} onChange={(e) => setVendorDays(e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Security Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between"><div><p className="font-medium text-sm">OTP for withdrawals</p><p className="text-xs text-muted-foreground">Require OTP verification</p></div><Switch checked={otpWd} onCheckedChange={setOtpWd} /></div>
            <div><Label>OTP for transfers above (Rs.)</Label><Input value={otpAbove} onChange={(e) => setOtpAbove(e.target.value)} /></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Auto-flag suspicious activity</p></div><Switch checked={autoFlag} onCheckedChange={setAutoFlag} /></div>
          </CardContent>
        </Card>
      </div>
      {saveErr ? <p className="text-sm text-destructive">{saveErr}</p> : null}
      {saveOk ? <p className="text-sm text-emerald-600">Settings saved.</p> : null}
      <Button onClick={() => { void saveSettings(); }} disabled={updateMut.isPending}>Save wallet settings</Button>
    </div>
  );
}

function WalletFlaggedView() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<WalletTxnRow | null>(null);
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const { data: apiRows = [], isLoading, isError, error } = useAdminList<WalletTxnRow>(
    ['admin', 'wallet-transactions', 'flagged-blocked'],
    () => adminApi.walletTransactions({ page_size: 500, status: 'flagged,blocked' }),
  );
  const flaggedData = useMemo(
    () => apiRows.filter((tx) => !clearedIds.has(tx.id)),
    [apiRows, clearedIds],
  );

  const handleClear = (id: string) => {
    setClearedIds((prev) => new Set(prev).add(id));
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading flagged wallet transactions…</div>;
  }
  if (isError) {
    return (
      <div className="p-4 lg:p-6 text-sm text-destructive">
        Could not load flagged transactions.{error ? ` ${formatApiError(error)}` : ''}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <AdminStatCard icon={AlertTriangle} title="Flagged Transactions" value={flaggedData.length} color="orange" />
        <AdminStatCard icon={Ban} title="Blocked" value={flaggedData.filter(f => f.status === 'blocked').length} color="red" />
        <AdminStatCard icon={Activity} title="Under Review" value={flaggedData.filter(f => f.status === 'flagged').length} color="purple" />
      </div>

      <AdminTable title="Flagged & Blocked Transactions" subtitle="Monitor suspicious activity — review, clear, or escalate"
        searchKey="item"
        data={flaggedData}
        columns={[
          { key: 'item', label: 'Description', render: (tx) => (
            <div><p className="font-medium text-sm">{tx.item}</p><p className="text-xs text-muted-foreground">{tx.user}</p></div>
          )},
          { key: 'amount', label: 'Amount', render: (tx) => <span className="font-bold text-destructive">Rs. {Math.abs(tx.amount).toLocaleString()}</span> },
          { key: 'status', label: 'Status', render: (tx) => <Badge variant="destructive" className="text-xs">{tx.status}</Badge> },
          { key: 'time', label: 'Time' },
          { key: 'actions', label: '', render: (tx) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(tx); setReviewOpen(true); }}>
                <Eye className="w-3 h-3 mr-1" /> Review
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => handleClear(tx.id)}>
                <CheckCircle className="w-3 h-3 mr-1" /> Clear
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-destructive"><Ban className="w-3 h-3 mr-1" /> Block</Button>
            </div>
          )}
        ]}
      />

      <CRUDModal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review Flagged Activity" onSave={() => setReviewOpen(false)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Description</p><p className="font-bold">{selected.item}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">User</p><p className="font-bold">{selected.user}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-destructive">Rs. {Math.abs(selected.amount).toLocaleString()}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Time</p><p className="font-bold">{selected.time}</p></div>
            </div>
            <div><Label>Review Note</Label><Textarea placeholder="Add review notes..." rows={3} /></div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleClear(selected.id); setReviewOpen(false); }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Clear & Allow
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setReviewOpen(false)}>
                <Ban className="w-4 h-4 mr-2" /> Block & Escalate
              </Button>
            </div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}
