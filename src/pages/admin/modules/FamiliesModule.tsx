import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Eye, Edit, Lock, Unlock, History, MoreVertical, Wallet, TrendingUp,
  AlertTriangle, Plus, Trash2, Users, CheckCircle, Ban, Shield, User, X,
  DollarSign, Phone
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { adminApi, type AdminWalletTransactionRow } from '@/lib/api';
import { toast } from 'sonner';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError, formatCompactRs } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import {
  fetchUserAdminOptions,
  fetchWalletAdminOptions,
} from '@/components/admin/adminRelationalPickers';
import { useAdminRouteContext } from '../adminRouteContext';

type FamilyLinkedWalletRow = {
  id: string;
  owner: string;
  type: string;
  balance: number;
  status: string;
  family: string;
  lastActivity: string;
};

type FamilyRow = {
  id: string;
  name: string;
  leader: string;
  members: number;
  totalBalance: number;
  status: string;
  created: string;
  type: string;
};

type FamilyMemberRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  joinedDate: string;
  initial_balance?: number;
  spending_limit_daily?: number;
  spending_limit_weekly?: number;
  spending_limit_monthly?: number;
  wallet_id?: string;
  wallet_balance?: number | null;
  wallet_type?: string;
  wallet_label?: string;
};

type GroupWalletRow = {
  id: string;
  balance: number;
  type: string;
  label: string;
  status: string;
  owner_name: string;
};

interface FamiliesModuleProps {
  activeSection: string;
}

function FamiliesModule({ activeSection }: FamiliesModuleProps) {
  if (activeSection === 'families-wallets') return <FamilyWalletControl />;
  return <FamiliesView />;
}

function FamiliesView() {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [memberLimitsOpen, setMemberLimitsOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [selected, setSelected] = useState<FamilyRow | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMemberRow | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState('family');
  const [addLeaderId, setAddLeaderId] = useState('');
  const [addLeaderLabel, setAddLeaderLabel] = useState('');
  const [addErr, setAddErr] = useState('');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('family');
  const [editStatus, setEditStatus] = useState('active');
  const [editErr, setEditErr] = useState('');
  const [addMemUserId, setAddMemUserId] = useState('');
  const [addMemUserLabel, setAddMemUserLabel] = useState('');
  const [addMemRole, setAddMemRole] = useState('guest');
  const [addMemErr, setAddMemErr] = useState('');
  const [editMemRole, setEditMemRole] = useState('guest');
  const [editMemStatus, setEditMemStatus] = useState('active');
  const [editMemErr, setEditMemErr] = useState('');
  const [limitsDaily, setLimitsDaily] = useState('');
  const [limitsWeekly, setLimitsWeekly] = useState('');
  const [limitsMonthly, setLimitsMonthly] = useState('');
  const [limitsErr, setLimitsErr] = useState('');
  const [allowOnline, setAllowOnline] = useState(true);
  const [allowCash, setAllowCash] = useState(true);
  const [permErr, setPermErr] = useState('');
  const [delErr, setDelErr] = useState('');

  const { data: allFamilies = [], isLoading, isError } = useAdminList<FamilyRow>(
    ['admin', 'families'],
    () => adminApi.families({ page_size: 200 }),
  );

  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });
  const canViewFamilyAudit =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';

  const { data: membersPayload, isFetching: membersLoading } = useQuery({
    queryKey: ['admin', 'family-members', selected?.id],
    queryFn: () => adminApi.familyMembers(selected!.id),
    enabled: !!selected && membersOpen,
  });
  const members: FamilyMemberRow[] = (membersPayload?.members ?? []) as FamilyMemberRow[];

  const { data: auditRows = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'family-audit', selected?.id],
    () => adminApi.auditLogs({ object_type: 'FamilyGroup', object_id: selected!.id, page_size: 100 }),
    { enabled: !!selected && auditOpen && canViewFamilyAudit },
  );

  const { data: permPayload } = useQuery({
    queryKey: ['admin', 'family-perm', selected?.id],
    queryFn: () => adminApi.familyPermissions(selected!.id),
    enabled: !!selected && permOpen,
  });

  const famInv = [['admin', 'families']] as const;
  const memInv = [['admin', 'family-members'], ['admin', 'families']] as const;
  const famAuditAll = [['admin', 'family-audit']] as const;
  const createFam = useAdminMutation(adminApi.createFamily, [famInv[0]], (data) => {
    const id = data && typeof data === 'object' && 'id' in data ? String((data as { id: unknown }).id) : '';
    return id ? [[`admin`, 'family-audit', id]] : [...famAuditAll];
  });
  const updateFam = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateFamily(id, payload),
    [famInv[0]],
    (_, v) => [[`admin`, 'family-audit', v.id]],
  );
  const deleteFam = useAdminMutation(
    (id: string) => adminApi.deleteFamily(id),
    [famInv[0]],
    (_, id) => [[`admin`, 'family-audit', id]],
  );
  const addMem = useAdminMutation(
    ({ fid, payload }: { fid: string; payload: Record<string, unknown> }) => adminApi.createFamilyMember(fid, payload),
    memInv,
    (_, v) => [[`admin`, 'family-audit', v.fid]],
  );
  const patchMem = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateFamilyMember(id, payload),
    memInv,
    () => [...famAuditAll],
  );
  const removeMem = useAdminMutation(
    (id: string) => adminApi.deleteFamilyMember(id),
    memInv,
    () => [...famAuditAll],
  );
  const savePerm = useAdminMutation(
    ({ fid, payload }: { fid: string; payload: Record<string, unknown> }) => adminApi.updateFamilyPermissions(fid, payload),
    [['admin', 'family-perm']],
    (_, v) => [[`admin`, 'family-audit', v.fid]],
  );

  useEffect(() => {
    if (permPayload) {
      setAllowOnline(!!permPayload.allow_online_purchases);
      setAllowCash(!!permPayload.allow_cash_withdrawal);
      setPermErr('');
    }
  }, [permPayload]);

  useEffect(() => {
    if (selectedMember && editMemberOpen) {
      setEditMemRole(selectedMember.role);
      setEditMemStatus(selectedMember.status);
      setEditMemErr('');
    }
  }, [selectedMember, editMemberOpen]);

  useEffect(() => {
    if (selectedMember && memberLimitsOpen) {
      setLimitsDaily(String(selectedMember.spending_limit_daily ?? ''));
      setLimitsWeekly(String(selectedMember.spending_limit_weekly ?? ''));
      setLimitsMonthly(String(selectedMember.spending_limit_monthly ?? ''));
      setLimitsErr('');
    }
  }, [selectedMember, memberLimitsOpen]);

  useEffect(() => {
    if (selected && editOpen) {
      setEditName(selected.name);
      setEditType(selected.type);
      setEditStatus(selected.status);
      setEditErr('');
    }
  }, [selected, editOpen]);

  const filtered = allFamilies.filter(f => {
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const logs = auditRows.map((row) => ({
    action: String(row.action ?? ''),
    by: String(row.user ?? ''),
    time: String(row.time ?? ''),
    ip: row.ip_address != null && String(row.ip_address) !== '' ? String(row.ip_address) : '—',
  }));

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading families…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load family groups.</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Users} title="Total Groups" value={allFamilies.length} color="blue" />
        <AdminStatCard icon={CheckCircle} title="Active" value={allFamilies.filter(f => f.status === 'active').length} color="green" />
        <AdminStatCard icon={Lock} title="Frozen" value={allFamilies.filter(f => f.status === 'frozen').length} color="red" />
        <AdminStatCard icon={DollarSign} title="Total Balance" value={formatCompactRs(allFamilies.reduce((a, f) => a + f.totalBalance, 0))} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="hostel">Hostel</SelectItem>
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

      <AdminTable title="All Families & Groups"
        subtitle="Full CRUD — manage members, override permissions, freeze accounts, audit logs"
        data={filtered}
        columns={[
          { key: 'name', label: 'Group', render: (f) => (
            <div><p className="font-medium text-sm">{f.name}</p><p className="text-xs text-muted-foreground">Leader: {f.leader}</p></div>
          )},
          { key: 'type', label: 'Type', render: (f) => <Badge variant="outline" className="text-xs capitalize">{f.type}</Badge> },
          { key: 'members', label: 'Members', render: (f) => <span className="font-medium">{f.members}</span> },
          { key: 'totalBalance', label: 'Total Balance', render: (f) => <span className="font-medium">Rs. {f.totalBalance.toLocaleString()}</span> },
          { key: 'status', label: 'Status', render: (f) => (
            <Badge variant={f.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", f.status === 'active' && "bg-emerald-500")}>
              {f.status === 'frozen' && <Lock className="w-3 h-3 mr-1" />}{f.status}
            </Badge>
          )},
          { key: 'created', label: 'Created' },
          { key: 'actions', label: '', render: (f) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSelected(f); setViewDetailOpen(true); }}><Eye className="w-4 h-4 mr-2" /> View details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(f); setMembersOpen(true); }}><Users className="w-4 h-4 mr-2" /> View Members</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(f); setPermOpen(true); }}><Shield className="w-4 h-4 mr-2" /> Override Permissions</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelected(f); setEditOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit Group</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  void updateFam.mutateAsync({
                    id: f.id,
                    payload: { status: f.status === 'frozen' ? 'active' : 'frozen' },
                  });
                }}>{f.status === 'frozen'
                  ? <><Unlock className="w-4 h-4 mr-2" /> Unfreeze group</>
                  : <><Lock className="w-4 h-4 mr-2" /> Freeze group</>
                }</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSelected(f); setAuditOpen(true); }}><History className="w-4 h-4 mr-2" /> Audit Log</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { setSelected(f); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete Group</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )},
        ]}
        onAdd={() => { setAddErr(''); setAddName(''); setAddLeaderId(''); setAddLeaderLabel(''); setAddOpen(true); }} addLabel="Add Group"
        searchKey="name" onExport={() => {}} onFilter={() => {}}
      />

      {/* Add Group Modal */}
      <CRUDModal open={addOpen} onClose={() => { setAddOpen(false); setAddErr(''); }} title="Create Family / Group" onSave={() => {
        setAddErr('');
        void (async () => {
          try {
            await createFam.mutateAsync({
              name: addName.trim(),
              type: addType,
              leader_id: addLeaderId.trim(),
              status: 'active',
            });
            setAddOpen(false);
            setAddName('');
            setAddLeaderId('');
            setAddLeaderLabel('');
          } catch (e) {
            setAddErr(formatApiError(e));
          }
        })();
      }} loading={createFam.isPending} error={addErr}>
        <div className="space-y-4">
          <div><Label>Group Name</Label><Input placeholder="e.g. Sharma Family / Flat 302" value={addName} onChange={(e) => setAddName(e.target.value)} /></div>
          <div><Label>Group Type</Label>
            <Select value={addType} onValueChange={setAddType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="flat">Flat / Apartment</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="hostel">Hostel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Leader</Label>
            <AdminSearchCombobox
              queryKeyPrefix="family-leader"
              value={addLeaderId}
              selectedLabel={addLeaderLabel}
              onChange={(v, l) => { setAddLeaderId(v); setAddLeaderLabel(l ?? ''); }}
              fetchOptions={fetchUserAdminOptions}
              placeholder="Search by name or phone…"
              clearable
            />
          </div>
        </div>
      </CRUDModal>

      {/* Edit Group Modal */}
      <CRUDModal open={editOpen} onClose={() => { setEditOpen(false); setEditErr(''); }} title="Edit Group" onSave={() => {
        if (!selected) return;
        setEditErr('');
        void (async () => {
          try {
            await updateFam.mutateAsync({
              id: selected.id,
              payload: { name: editName.trim(), type: editType, status: editStatus },
            });
            setEditOpen(false);
          } catch (e) {
            setEditErr(formatApiError(e));
          }
        })();
      }} loading={updateFam.isPending} error={editErr}>
        {selected && (
          <div className="space-y-4">
            <div><Label>Group Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Group Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Leader (read-only)</Label><Input value={selected.leader} readOnly className="bg-muted/50" /></div>
            <div><Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CRUDModal>

      <CRUDModal open={viewDetailOpen} onClose={() => { setViewDetailOpen(false); }} title={selected ? `Group — ${selected.name}` : 'Group'} onSave={() => setViewDetailOpen(false)} saveLabel="Close">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium capitalize">{selected.type}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium capitalize">{selected.status}</p></div>
              <div><p className="text-xs text-muted-foreground">Leader</p><p className="font-medium">{selected.leader}</p></div>
              <div><p className="text-xs text-muted-foreground">Members</p><p className="font-medium">{selected.members}</p></div>
              <div><p className="text-xs text-muted-foreground">Total balance</p><p className="font-medium">{formatCompactRs(selected.totalBalance)}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{selected.created}</p></div>
            </div>
          </div>
        )}
      </CRUDModal>

      {/* Delete Confirm */}
      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setDelErr(''); }} onConfirm={() => {
        if (!selected) return;
        setDelErr('');
        void (async () => {
          try {
            await deleteFam.mutateAsync(selected.id);
            setDeleteOpen(false);
          } catch (e) {
            setDelErr(formatApiError(e));
          }
        })();
      }}
        loading={deleteFam.isPending}
        title={`Delete "${selected?.name}"?`}
        description={delErr || 'This will permanently remove the group and all member associations. This action cannot be undone.'} />

      {/* Members Modal — Full CRUD */}
      <CRUDModal open={membersOpen} onClose={() => setMembersOpen(false)} title={`Members — ${selected?.name}`} size="xl" onSave={() => setMembersOpen(false)} saveLabel="Close">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{membersLoading ? 'Loading…' : `${members.length} members`}</p>
            <Button size="sm" onClick={() => { setAddMemErr(''); setAddMemUserId(''); setAddMemUserLabel(''); setAddMemberOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Member</Button>
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback>{m.name?.[0] ?? '?'}</AvatarFallback></Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{m.name}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.phone} • Joined {m.joinedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right text-sm">
                    <p className="font-medium">{m.wallet_balance != null ? `Rs. ${m.wallet_balance.toLocaleString()}` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Wallet · Alloc. Rs. {(m.initial_balance ?? 0).toLocaleString()}</p>
                  </div>
                  <Badge variant={m.status === 'active' ? 'default' : 'destructive'}
                    className={cn("text-xs", m.status === 'active' && "bg-emerald-500")}>{m.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedMember(m); setEditMemberOpen(true); }}><Edit className="w-3 h-3 mr-2" /> Edit Member</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedMember(m); setMemberLimitsOpen(true); }}><Shield className="w-3 h-3 mr-2" /> Set Limits</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        void patchMem.mutateAsync({
                          id: m.id,
                          payload: { status: m.status === 'frozen' ? 'active' : 'frozen' },
                        });
                      }}>{m.status === 'frozen'
                        ? <><Unlock className="w-3 h-3 mr-2" /> Unfreeze</>
                        : <><Lock className="w-3 h-3 mr-2" /> Freeze</>
                      }</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { void removeMem.mutateAsync(m.id); }}><Trash2 className="w-3 h-3 mr-2" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {!membersLoading && members.length === 0 && <p className="text-center text-muted-foreground py-8">No members found for this group.</p>}
          </div>
        </div>
      </CRUDModal>

      {/* Add Member Modal */}
      <CRUDModal open={addMemberOpen} onClose={() => { setAddMemberOpen(false); setAddMemErr(''); }} title="Add Member" onSave={() => {
        if (!selected) return;
        setAddMemErr('');
        void (async () => {
          try {
            await addMem.mutateAsync({
              fid: selected.id,
              payload: {
                user_id: addMemUserId.trim(),
                role: addMemRole,
                status: 'active',
              },
            });
            setAddMemberOpen(false);
            setAddMemUserId('');
            setAddMemUserLabel('');
          } catch (e) {
            setAddMemErr(formatApiError(e));
          }
        })();
      }} loading={addMem.isPending} error={addMemErr}>
        <div className="space-y-4">
          <div>
            <Label>User</Label>
            <AdminSearchCombobox
              queryKeyPrefix="family-member-user"
              value={addMemUserId}
              selectedLabel={addMemUserLabel}
              onChange={(v, l) => { setAddMemUserId(v); setAddMemUserLabel(l ?? ''); }}
              fetchOptions={fetchUserAdminOptions}
              placeholder="Search by name or phone…"
              clearable
            />
          </div>
          <div><Label>Role</Label>
            <Select value={addMemRole} onValueChange={setAddMemRole}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CRUDModal>

      {/* Edit Member Modal */}
      <CRUDModal open={editMemberOpen} onClose={() => { setEditMemberOpen(false); setEditMemErr(''); }} title="Edit Member" onSave={() => {
        if (!selectedMember) return;
        setEditMemErr('');
        void (async () => {
          try {
            await patchMem.mutateAsync({
              id: selectedMember.id,
              payload: { role: editMemRole, status: editMemStatus },
            });
            setEditMemberOpen(false);
          } catch (e) {
            setEditMemErr(formatApiError(e));
          }
        })();
      }} loading={patchMem.isPending} error={editMemErr}>
        {selectedMember && (
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={selectedMember.name} readOnly className="bg-muted/50" /></div>
            <div><Label>Phone</Label><Input value={selectedMember.phone} readOnly className="bg-muted/50" /></div>
            <div><Label>Role</Label>
              <Select value={editMemRole} onValueChange={setEditMemRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={editMemStatus} onValueChange={setEditMemStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CRUDModal>

      {/* Member Limits Modal */}
      <CRUDModal open={memberLimitsOpen} onClose={() => { setMemberLimitsOpen(false); setLimitsErr(''); }} title={`Set Limits — ${selectedMember?.name}`} onSave={() => {
        if (!selectedMember) return;
        setLimitsErr('');
        void (async () => {
          try {
            await patchMem.mutateAsync({
              id: selectedMember.id,
              payload: {
                spending_limit_daily: parseFloat(limitsDaily) || 0,
                spending_limit_weekly: parseFloat(limitsWeekly) || 0,
                spending_limit_monthly: parseFloat(limitsMonthly) || 0,
              },
            });
            setMemberLimitsOpen(false);
          } catch (e) {
            setLimitsErr(formatApiError(e));
          }
        })();
      }} loading={patchMem.isPending} error={limitsErr}>
        <div className="space-y-4">
          <div><Label>Daily Spending Limit (Rs.)</Label><Input type="number" value={limitsDaily} onChange={(e) => setLimitsDaily(e.target.value)} /></div>
          <div><Label>Weekly Limit (Rs.)</Label><Input type="number" value={limitsWeekly} onChange={(e) => setLimitsWeekly(e.target.value)} /></div>
          <div><Label>Monthly Limit (Rs.)</Label><Input type="number" value={limitsMonthly} onChange={(e) => setLimitsMonthly(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Group-level purchase permissions are edited in Override Permissions.</p>
        </div>
      </CRUDModal>

      {/* Override Permissions Modal */}
      <CRUDModal open={permOpen} onClose={() => { setPermOpen(false); setPermErr(''); }} title={`Override Permissions — ${selected?.name}`} onSave={() => {
        if (!selected) return;
        setPermErr('');
        void (async () => {
          try {
            await savePerm.mutateAsync({
              fid: selected.id,
              payload: {
                allow_online_purchases: allowOnline,
                allow_cash_withdrawal: allowCash,
              },
            });
            setPermOpen(false);
          } catch (e) {
            setPermErr(formatApiError(e));
          }
        })();
      }} loading={savePerm.isPending} error={permErr}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-2 dark:bg-yellow-900/20 dark:border-yellow-800">
            These flags are stored on the family group and enforced server-side.
          </p>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium text-sm">Allow online purchases</p><p className="text-xs text-muted-foreground">Members can buy from the store</p></div>
            <Switch checked={allowOnline} onCheckedChange={setAllowOnline} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium text-sm">Allow cash withdrawal</p><p className="text-xs text-muted-foreground">Wallet withdrawals to cash/bank</p></div>
            <Switch checked={allowCash} onCheckedChange={setAllowCash} />
          </div>
        </div>
      </CRUDModal>

      {/* Audit Log Modal */}
      <CRUDModal open={auditOpen} onClose={() => setAuditOpen(false)} title={`Audit Log — ${selected?.name}`} size="xl" onSave={() => setAuditOpen(false)} saveLabel="Close">
        <div className="space-y-2">
          {!canViewFamilyAudit ? (
            <p className="text-center text-muted-foreground py-8">
              Family audit history is only available to super administrators.
            </p>
          ) : logs.length === 0
            ? <p className="text-center text-muted-foreground py-8">No audit log entries.</p>
            : logs.map((log, i) => (
              <div key={i} className="flex items-start justify-between p-3 border rounded-lg bg-muted/20">
                <div>
                  <p className="font-medium text-sm">{log.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">by {log.by}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-mono text-xs text-muted-foreground">{log.time}</p>
                  <p className="font-mono text-xs text-muted-foreground bg-muted px-1 rounded mt-0.5">IP: {log.ip}</p>
                </div>
              </div>
            ))
          }
        </div>
      </CRUDModal>
    </div>
  );
}

function FamilyWalletDetailView({ walletId }: { walletId: string }) {
  const routeCtx = useAdminRouteContext();
  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });
  const canManageWalletFreeze =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';

  const { data: detail, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'wallet', walletId],
    queryFn: () => adminApi.getAdminWallet(walletId),
    retry: false,
  });
  const { data: txns = [], isLoading: txLoading } = useAdminList<AdminWalletTransactionRow>(
    ['admin', 'wallet-transactions', 'wallet', walletId],
    () => adminApi.walletTransactions({ wallet_id: walletId, page_size: 200 }),
  );
  const updateWalletMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateWallet(id, payload),
    [
      ['admin', 'wallets'],
      ['admin', 'wallets', 'family-only'],
      ['admin', 'wallets', 'summary'],
      ['admin', 'wallet', walletId],
      ['admin', 'wallet-transactions', 'wallet', walletId],
    ],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );

  const toggleFreeze = () => {
    if (!detail) return;
    const next = detail.status === 'active' ? 'frozen' : 'active';
    void (async () => {
      try {
        await updateWalletMut.mutateAsync({ id: walletId, payload: { status: next } });
        toast.success(next === 'frozen' ? 'Wallet frozen.' : 'Wallet is now active.');
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading wallet…</div>;
  }
  if (isError || !detail) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Button variant="outline" size="sm" onClick={() => routeCtx?.navigateToList()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
        </Button>
        <p className="text-sm text-destructive">
          {formatApiError(error) || 'Could not load wallet.'}
        </p>
      </div>
    );
  }

  const walletStatusLabel = detail.status === 'active' ? 'Active' : 'Frozen';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => routeCtx?.navigateToList()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
        </Button>
        <Badge
          variant={detail.status === 'active' ? 'default' : 'destructive'}
          className={cn('text-xs', detail.status === 'active' && 'bg-emerald-500')}
        >
          {detail.status === 'frozen' ? <Lock className="w-3 h-3 mr-1 inline" /> : null}
          Wallet: {walletStatusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{detail.owner}</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Wallet #{detail.id} · {detail.type}
              {detail.label ? ` · ${detail.label}` : ''}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{formatCompactRs(detail.balance)}</p>
            <p className="text-xs text-muted-foreground">Group / family: {detail.family}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canManageWalletFreeze ? (
              detail.status === 'active' ? (
                <Button variant="destructive" size="sm" onClick={toggleFreeze} disabled={updateWalletMut.isPending}>
                  <Lock className="w-3 h-3 mr-1" /> Freeze wallet
                </Button>
              ) : (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={toggleFreeze} disabled={updateWalletMut.isPending}>
                  <Unlock className="w-3 h-3 mr-1" /> Unfreeze wallet
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Only super admins can freeze or unfreeze wallets.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Transaction history</h4>
        {txLoading ? (
          <p className="text-xs text-muted-foreground">Loading transactions…</p>
        ) : txns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No transactions for this wallet.</p>
        ) : (
          <div className="space-y-1 max-h-[480px] overflow-y-auto border rounded-lg p-2">
            {txns.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-2 border-b last:border-0 text-sm">
                <div>
                  <p className="font-medium">{tx.item}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.type} · {tx.time}</p>
                </div>
                <div className="text-right">
                  <span className={cn('font-bold', tx.amount >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                    {formatCompactRs(tx.amount)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FamilyWalletControl() {
  const routeCtx = useAdminRouteContext();
  const viewWalletId =
    routeCtx?.action === 'view' && routeCtx.itemId?.trim() && /^\d+$/.test(routeCtx.itemId.trim())
      ? routeCtx.itemId.trim()
      : '';

  const [viewOpen, setViewOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [selected, setSelected] = useState<FamilyRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cdWalletId, setCdWalletId] = useState('');
  const [cdWalletLabel, setCdWalletLabel] = useState('');
  const [cdAmount, setCdAmount] = useState('');
  const [cdReason, setCdReason] = useState('');
  const [cdErr, setCdErr] = useState('');

  const { data: allFamilies = [], isLoading, isError } = useAdminList<FamilyRow>(
    ['admin', 'families'],
    () => adminApi.families({ page_size: 200 }),
    { enabled: !viewWalletId },
  );
  const { data: summary } = useQuery({
    queryKey: ['admin', 'wallets', 'summary'],
    queryFn: () => adminApi.walletsSummary(),
  });
  const { data: walletDetail } = useQuery({
    queryKey: ['admin', 'family-members', 'wallet-tab', selected?.id],
    queryFn: async () => {
      const r = await adminApi.familyMembers(selected!.id);
      return {
        members: (r.members ?? []) as FamilyMemberRow[],
        group_wallets: (r.group_wallets ?? []) as GroupWalletRow[],
      };
    },
    enabled: !!selected && viewOpen,
  });
  const detailMembers = walletDetail?.members ?? [];
  const groupWallets = walletDetail?.group_wallets ?? [];
  const updateFam = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateFamily(id, payload),
    [['admin', 'families']],
    (_, v) => [['admin', 'family-audit', v.id]],
  );
  const adjustMut = useAdminMutation(
    adminApi.walletAdjust,
    [
      ['admin', 'wallets'],
      ['admin', 'wallet-transactions'],
      ['admin', 'wallets', 'summary'],
      ['admin', 'families'],
      ['admin', 'family-members'],
    ],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );
  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });
  const canManageWalletFreeze =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';
  const { data: familyWallets = [] } = useAdminList<FamilyLinkedWalletRow>(
    ['admin', 'wallets', 'family-only'],
    () => adminApi.wallets({ page_size: 500, family_only: true }),
    { enabled: !viewWalletId },
  );
  const updateWalletMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateWallet(id, payload),
    [
      ['admin', 'wallets'],
      ['admin', 'wallets', 'family-only'],
      ['admin', 'wallets', 'summary'],
      ['admin', 'family-members'],
    ],
    (_, v) => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
      ['admin', 'wallet', v.id],
      ['admin', 'wallet-transactions', 'wallet', v.id],
    ],
  );

  if (viewWalletId) {
    return <FamilyWalletDetailView walletId={viewWalletId} />;
  }

  const filtered = allFamilies.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    return true;
  });

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading families…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load family groups.</div>;
  }

  const frozenFamilyWalletCount = familyWallets.filter((w) => w.status === 'frozen').length;

  const freezeWalletRow = (id: string, current: string) => {
    if (!canManageWalletFreeze) {
      toast.error('Only super admins can freeze or unfreeze wallets.');
      return;
    }
    const next = current === 'active' ? 'frozen' : 'active';
    void (async () => {
      try {
        await updateWalletMut.mutateAsync({ id, payload: { status: next } });
        toast.success(next === 'frozen' ? 'Wallet frozen.' : 'Wallet active.');
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Wallet} title="Groups" value={String(allFamilies.length)} color="blue" />
        <AdminStatCard icon={Users} title="Family-linked wallets" value={String(familyWallets.length)} color="green" />
        <AdminStatCard icon={Lock} title="Frozen wallets" value={String(frozenFamilyWalletCount)} color="red" />
        <AdminStatCard icon={AlertTriangle} title="Flagged wallet txns" value={summary != null ? String(summary.flagged_transactions) : '—'} color="orange" />
      </div>

      <AdminTable
        title="Family-linked wallets"
        subtitle="Wallet status (Active/Frozen) is independent of family group status. Use Actions for freeze/unfreeze or open the detail page."
        data={familyWallets}
        columns={[
          { key: 'family', label: 'Group', render: (w) => <span className="font-medium">{w.family}</span> },
          { key: 'owner', label: 'Owner / label' },
          { key: 'type', label: 'Type', render: (w) => <Badge variant="outline" className="text-xs capitalize">{w.type}</Badge> },
          { key: 'balance', label: 'Balance', render: (w) => <span className="font-bold">Rs. {w.balance.toLocaleString()}</span> },
          {
            key: 'status',
            label: 'Wallet status',
            render: (w) => (
              <Badge
                variant={w.status === 'active' ? 'default' : 'destructive'}
                className={cn('text-xs', w.status === 'active' && 'bg-emerald-500')}
              >
                {w.status === 'frozen' ? <Lock className="w-3 h-3 mr-1" /> : null}
                {w.status === 'active' ? 'Active' : 'Frozen'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (w) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Wallet actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => routeCtx?.navigateToView(w.id)}>
                    <Eye className="w-4 h-4 mr-2" /> Details
                  </DropdownMenuItem>
                  {canManageWalletFreeze ? (
                    <>
                      <DropdownMenuSeparator />
                      {w.status === 'active' ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => freezeWalletRow(w.id, w.status)}
                        >
                          <Lock className="w-4 h-4 mr-2" /> Freeze
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-emerald-600"
                          onClick={() => freezeWalletRow(w.id, w.status)}
                        >
                          <Unlock className="w-4 h-4 mr-2" /> Unfreeze
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
        onExport={() => {}}
      />

      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-xs text-muted-foreground w-full sm:w-auto sm:mr-2">Filters apply to family groups below.</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="hostel">Hostel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminTable title="Family groups" subtitle="Group status (freeze group) syncs linked wallets via system rules. Use the table above for per-wallet freeze."
        data={filtered}
        columns={[
          { key: 'name', label: 'Group', render: (f) => <span className="font-medium">{f.name}</span> },
          { key: 'type', label: 'Type', render: (f) => <Badge variant="outline" className="text-xs capitalize">{f.type}</Badge> },
          { key: 'leader', label: 'Leader' },
          { key: 'members', label: 'Members' },
          { key: 'totalBalance', label: 'Total Balance', render: (f) => <span className="font-bold">Rs. {f.totalBalance.toLocaleString()}</span> },
          { key: 'status', label: 'Group status', render: (f) => (
            <Badge variant={f.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", f.status === 'active' && "bg-emerald-500")}>{f.status}</Badge>
          )},
          { key: 'actions', label: '', render: (f) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(f); setViewOpen(true); }}>
                <Eye className="w-3 h-3 mr-1" /> Group details
              </Button>
              <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(f); setCdErr(''); setCreditOpen(true); }}>
                <DollarSign className="w-3 h-3 mr-1" /> Credit/Debit
              </Button>
              {f.status === 'active'
                ? <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={() => { void updateFam.mutateAsync({ id: f.id, payload: { status: 'frozen' } }); }}><Lock className="w-3 h-3 mr-1" /> Freeze</Button>
                : <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => { void updateFam.mutateAsync({ id: f.id, payload: { status: 'active' } }); }}><Unlock className="w-3 h-3 mr-1" /> Unfreeze</Button>
              }
            </div>
          )}
        ]}
        onExport={() => {}}
      />

      {/* Wallet Detail Modal */}
      <CRUDModal open={viewOpen} onClose={() => setViewOpen(false)} title={`Wallet Control — ${selected?.name}`} size="xl" onSave={() => setViewOpen(false)} saveLabel="Close">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{formatCompactRs(selected.totalBalance)}</p>
                <p className="text-xs text-muted-foreground">Total Balance (group wallets)</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{selected.members}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </CardContent></Card>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Wallets in this group</h4>
              {groupWallets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No wallets linked to this group.</p>
              ) : (
                <div className="space-y-1">
                  {groupWallets.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">Rs. {w.balance.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{w.type}{w.label ? ` · ${w.label}` : ''}{w.owner_name ? ` · ${w.owner_name}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={w.status === 'active' ? 'default' : 'destructive'}
                          className={cn('text-[10px]', w.status === 'active' && 'bg-emerald-500')}
                        >
                          {w.status === 'active' ? 'Active' : 'Frozen'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Wallet actions">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => routeCtx?.navigateToView(String(w.id))}>
                              <Eye className="w-4 h-4 mr-2" /> Details
                            </DropdownMenuItem>
                            {canManageWalletFreeze ? (
                              <>
                                <DropdownMenuSeparator />
                                {w.status === 'active' ? (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => freezeWalletRow(String(w.id), w.status)}
                                  >
                                    <Lock className="w-4 h-4 mr-2" /> Freeze
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-emerald-600"
                                    onClick={() => freezeWalletRow(String(w.id), w.status)}
                                  >
                                    <Unlock className="w-4 h-4 mr-2" /> Unfreeze
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Members</h4>
              {detailMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{m.name?.[0] ?? '?'}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{m.wallet_balance != null ? `Rs. ${m.wallet_balance.toLocaleString()}` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Wallet{m.wallet_type ? ` (${m.wallet_type})` : ''}</p>
                    <p className="text-[10px] text-muted-foreground">Joined alloc. Rs. {(m.initial_balance ?? 0).toLocaleString()}</p>
                    <Badge variant={m.status === 'active' ? 'default' : 'destructive'} className={cn("text-[10px] mt-1", m.status === 'active' && "bg-emerald-500")}>{m.status}</Badge>
                  </div>
                </div>
              ))}
              {detailMembers.length === 0 && <p className="text-xs text-muted-foreground">No members loaded.</p>}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {selected.status === 'active'
                  ? <Button variant="destructive" size="sm" onClick={() => { void updateFam.mutateAsync({ id: selected.id, payload: { status: 'frozen' } }); }}><Lock className="w-3 h-3 mr-1" /> Freeze group</Button>
                  : <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => { void updateFam.mutateAsync({ id: selected.id, payload: { status: 'active' } }); }}><Unlock className="w-3 h-3 mr-1" /> Unfreeze group</Button>
                }
                <Button variant="outline" size="sm" onClick={() => { setViewOpen(false); setCdErr(''); setCdWalletId(''); setCdWalletLabel(''); setCdAmount(''); setCreditOpen(true); }}><DollarSign className="w-3 h-3 mr-1" /> Wallet adjust</Button>
              </div>
            </div>
          </div>
        )}
      </CRUDModal>

      {/* Credit/Debit Modal */}
      <CRUDModal open={creditOpen} onClose={() => { setCreditOpen(false); setCdErr(''); }} title={`Wallet adjust — ${selected?.name ?? 'group'}`} error={cdErr}>
        {selected && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Search and select a wallet (e.g. member wallet from the Wallet module).</p>
            <div>
              <Label>Wallet</Label>
              <AdminSearchCombobox
                queryKeyPrefix="family-wallet-adjust"
                value={cdWalletId}
                selectedLabel={cdWalletLabel}
                onChange={(v, l) => { setCdWalletId(v); setCdWalletLabel(l ?? ''); }}
                fetchOptions={fetchWalletAdminOptions}
                placeholder="Search wallet by owner or id…"
                clearable
              />
            </div>
            <div><Label>Amount (Rs.)</Label><Input type="number" placeholder="0" value={cdAmount} onChange={(e) => setCdAmount(e.target.value)} /></div>
            <div><Label>Reason</Label><Textarea placeholder="Admin adjustment reason..." rows={2} value={cdReason} onChange={(e) => setCdReason(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!cdWalletId || !cdAmount || adjustMut.isPending} onClick={() => {
                setCdErr('');
                void (async () => {
                  try {
                    await adjustMut.mutateAsync({
                      wallet_id: cdWalletId.trim(),
                      amount: parseFloat(cdAmount),
                      direction: 'credit',
                      reason: cdReason || undefined,
                    });
                    setCreditOpen(false);
                    setCdWalletId('');
                    setCdWalletLabel('');
                    setCdAmount('');
                    setCdReason('');
                  } catch (e) {
                    setCdErr(formatApiError(e));
                  }
                })();
              }}>+ Credit</Button>
              <Button variant="destructive" disabled={!cdWalletId || !cdAmount || adjustMut.isPending} onClick={() => {
                setCdErr('');
                void (async () => {
                  try {
                    await adjustMut.mutateAsync({
                      wallet_id: cdWalletId.trim(),
                      amount: parseFloat(cdAmount),
                      direction: 'debit',
                      reason: cdReason || undefined,
                    });
                    setCreditOpen(false);
                    setCdWalletId('');
                    setCdWalletLabel('');
                    setCdAmount('');
                    setCdReason('');
                  } catch (e) {
                    setCdErr(formatApiError(e));
                  }
                })();
              }}>- Debit</Button>
            </div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}

export default FamiliesModule;
