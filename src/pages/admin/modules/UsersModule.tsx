import {
  Building2, Edit, Trash2, MoreVertical, Eye, Ban, Unlock,
  CheckCircle, XCircle, Clock, Shield, FileText, Plus,
  DollarSign, Star, Store, Phone, Mail, MapPin, Download, ChevronDown,
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { adminApi, type AdminKycSubmissionRow } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminRouteContext } from '../adminRouteContext';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError, isLikelyPdfMediaUrl, resolveMediaUrlForDisplay } from '../hooks/adminFormUtils';
import { InlinePdfPreview } from '@/components/admin/InlinePdfPreview';
import { useAdminCrudPolicy } from '../hooks/useAdminCrudPolicy';

/** Configurable accept list for customer KYC / document upload (images + PDF). */
const CUSTOMER_DOC_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf,.png,.jpg,.jpeg,.webp';

const VENDOR_KYC_DOC_TYPES = [
  { value: 'citizenship', label: 'Citizenship' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving license' },
] as const;

interface UsersModuleProps {
  activeSection: string;
}

type VendorRow = {
  id: string;
  name: string;
  owner: string;
  products: number;
  orders: number;
  revenue: number;
  status: string;
  commission: number;
  walletBalance: number;
  canPost: boolean;
  canSell: boolean;
  phone?: string;
  contact_email?: string;
  address?: string;
  description?: string;
  logo_url?: string;
};

type StaffAdminRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastLogin: string;
  status: string;
};

export default function UsersModule({ activeSection }: UsersModuleProps) {
  switch (activeSection) {
    case 'admins': return <AdminsView />;
    case 'sellers': return <SellersView />;
    case 'users-kyc': return <KYCView />;
    default: return <CustomersView />;
  }
}

// ==================== CUSTOMERS VIEW ====================
function CustomersView() {
  const adminRoute = useAdminRouteContext();
  const crud = useAdminCrudPolicy();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    kyc: string;
    balance: number;
    orders: number;
    status: string;
    spent: number;
    joined: string;
    customer_document?: string;
    avatar?: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState('normal');
  const [eName, setEName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eRole, setERole] = useState('normal');
  const [eStatus, setEStatus] = useState('active');
  const [eKyc, setEKyc] = useState('pending');
  const [cDocFile, setCDocFile] = useState<File | null>(null);
  const [eDocFile, setEDocFile] = useState<File | null>(null);
  const [formErr, setFormErr] = useState('');
  const userListKeys = [['admin-users-list']];
  const createMut = useAdminMutation(adminApi.createUser, userListKeys);
  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> | FormData }) =>
      adminApi.updateUser(id, payload),
    userListKeys,
  );

  const { data: usersResponse } = useQuery({
    queryKey: ['admin-users-list', statusFilter, roleFilter, kycFilter],
    queryFn: () =>
      adminApi.users({
        customers_only: true,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        kyc_status: kycFilter !== 'all' ? kycFilter : undefined,
        page_size: 100,
      }),
    retry: false,
  });

  const dynamicCustomers =
    usersResponse?.results?.map((user) => {
      const u = user as {
        id: number;
        name: string;
        email?: string;
        phone: string;
        role: string;
        kyc_status: string;
        is_active?: boolean;
        created_at?: string;
        customer_document?: string;
        avatar?: string;
      };
      return {
        id: String(u.id),
        name: u.name,
        email: u.email || `${u.phone}@khudrapasal.local`,
        phone: u.phone,
        role: u.role,
        kyc: u.kyc_status,
        balance: 0,
        orders: 0,
        status: u.is_active === false ? 'blocked' : 'active',
        spent: 0,
        joined: u.created_at?.slice(0, 10) ?? '—',
        customer_document: u.customer_document || '',
        avatar: (u as { avatar?: string }).avatar || '',
      };
    }) ?? [];

  const filtered = dynamicCustomers.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
    if (kycFilter !== 'all' && c.kyc !== kycFilter) return false;
    return true;
  });
  const selectedFromRoute = adminRoute?.itemId ? filtered.find((c) => c.id === adminRoute.itemId) ?? null : null;
  const resolvedSelected = selectedFromRoute ?? selected;
  const resolvedCreateOpen = createOpen || adminRoute?.action === 'add';
  const resolvedEditOpen = editOpen || adminRoute?.action === 'edit';
  const resolvedViewOpen = viewOpen || adminRoute?.action === 'view';
  const editUserId = adminRoute?.action === 'edit' && adminRoute.itemId ? adminRoute.itemId : selected?.id;

  const {
    data: editUserDetail,
    isFetching: editUserDetailLoading,
    isError: editUserDetailError,
    error: editUserDetailErr,
  } = useQuery({
    queryKey: ['admin-user-detail', editUserId],
    queryFn: () => adminApi.userDetail(editUserId!),
    enabled: Boolean(resolvedEditOpen && editUserId),
    retry: false,
  });

  useEffect(() => {
    if (!resolvedEditOpen || !editUserId) return;
    if (editUserDetail && typeof editUserDetail === 'object') {
      const u = editUserDetail as Record<string, unknown>;
      setEName(String(u.name ?? ''));
      setEEmail(String(u.email ?? ''));
      setEPhone(String(u.phone ?? ''));
      setERole(String(u.role ?? 'normal'));
      setEStatus(u.is_active === false ? 'blocked' : 'active');
      setEKyc(String(u.kyc_status ?? 'pending'));
      setEDocFile(null);
      return;
    }
    if (!editUserDetailLoading && resolvedSelected) {
      setEName(resolvedSelected.name);
      setEEmail(resolvedSelected.email);
      setEPhone(resolvedSelected.phone);
      setERole(resolvedSelected.role);
      setEStatus(resolvedSelected.status);
      setEKyc(resolvedSelected.kyc);
      setEDocFile(null);
    }
  }, [resolvedEditOpen, editUserId, editUserDetail, editUserDetailLoading, resolvedSelected]);

  useEffect(() => {
    if (!resolvedEditOpen || !editUserId || !editUserDetail || typeof editUserDetail !== 'object') return;
    if (selectedFromRoute || selected?.id === editUserId) return;
    const u = editUserDetail as Record<string, unknown>;
    const doc =
      typeof u.customer_document === 'string'
        ? u.customer_document
        : '';
    const av = typeof u.avatar === 'string' ? u.avatar : '';
    setSelected({
      id: editUserId,
      name: String(u.name ?? ''),
      email: String(u.email ?? '') || `${String(u.phone ?? '')}@khudrapasal.local`,
      phone: String(u.phone ?? ''),
      role: String(u.role ?? 'normal'),
      kyc: String(u.kyc_status ?? 'pending'),
      balance: 0,
      orders: 0,
      status: u.is_active === false ? 'blocked' : 'active',
      spent: 0,
      joined:
        typeof u.created_at === 'string' && u.created_at.length >= 10
          ? u.created_at.slice(0, 10)
          : '—',
      customer_document: doc,
      avatar: av,
    });
  }, [resolvedEditOpen, editUserId, editUserDetail, selectedFromRoute, selected?.id]);

  const saveCreate = async () => {
    setFormErr('');
    if (!cName.trim() || !cPhone.trim()) {
      setFormErr('Name and phone are required.');
      return;
    }
    try {
      if (cDocFile) {
        const fd = new FormData();
        fd.append('name', cName.trim());
        fd.append('phone', cPhone.trim());
        fd.append('email', cEmail.trim());
        if (cPassword) fd.append('password', cPassword);
        fd.append('role', cRole);
        fd.append('kyc_status', 'pending');
        fd.append('customer_document', cDocFile);
        await createMut.mutateAsync(fd);
      } else {
        await createMut.mutateAsync({
          name: cName.trim(),
          phone: cPhone.trim(),
          email: cEmail.trim(),
          password: cPassword || undefined,
          role: cRole,
          kyc_status: 'pending',
        });
      }
      setCName('');
      setCEmail('');
      setCPhone('');
      setCPassword('');
      setCRole('normal');
      setCDocFile(null);
      adminRoute?.navigateToList();
      setCreateOpen(false);
    } catch (e) {
      setFormErr(formatApiError(e));
    }
  };

  const saveEdit = async () => {
    setFormErr('');
    if (!editUserId) return;
    if (!eName.trim() || !ePhone.trim()) {
      setFormErr('Name and phone are required.');
      return;
    }
    const em = eEmail.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setFormErr('Enter a valid email address or leave it empty.');
      return;
    }
    try {
      if (eDocFile) {
        const fd = new FormData();
        fd.append('name', eName.trim());
        fd.append('email', eEmail.trim());
        fd.append('phone', ePhone.trim());
        fd.append('role', eRole);
        fd.append('is_active', eStatus === 'active' ? 'true' : 'false');
        fd.append('kyc_status', eKyc);
        fd.append('customer_document', eDocFile);
        await updateMut.mutateAsync({ id: editUserId, payload: fd });
      } else {
        await updateMut.mutateAsync({
          id: editUserId,
          payload: {
            name: eName.trim(),
            email: eEmail.trim(),
            phone: ePhone.trim(),
            role: eRole,
            is_active: eStatus === 'active',
            kyc_status: eKyc,
          },
        });
      }
      setEDocFile(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', editUserId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      adminRoute?.navigateToList();
      setEditOpen(false);
    } catch (e) {
      setFormErr(formatApiError(e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {formErr ? <p className="text-sm text-destructive">{formErr}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
            <SelectItem value="child">Child</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="KYC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminTable title="Customers" subtitle="Manage customer accounts, wallets, and statuses" data={filtered}
        columns={[
          { key: 'name', label: 'Customer', render: (c) => {
            const av = c.avatar ? resolveMediaUrlForDisplay(c.avatar) : '';
            return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {av ? <AvatarImage src={av} alt="" className="object-cover" /> : null}
                <AvatarFallback>{c.name[0]}</AvatarFallback>
              </Avatar>
              <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></div>
            </div>
            );
          } },
          { key: 'phone', label: 'Phone' },
          { key: 'role', label: 'Role', render: (c) => <Badge variant={c.role === 'parent' ? 'default' : 'secondary'} className="text-xs capitalize">{c.role}</Badge> },
          { key: 'kyc', label: 'KYC', render: (c) => (
            <Badge variant={c.kyc === 'verified' ? 'outline' : 'secondary'} className="text-xs">
              {c.kyc === 'verified' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}{c.kyc}
            </Badge>
          )},
          {
            key: 'customer_document',
            label: 'Document',
            render: (c) => {
              const url = c.customer_document ? resolveMediaUrlForDisplay(c.customer_document) : '';
              if (!url) return <span className="text-xs text-muted-foreground">—</span>;
              const pdf = /\.pdf(\?|$)/i.test(url);
              if (pdf) {
                return (
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <FileText className="w-3 h-3" /> PDF
                  </a>
                );
              }
              return (
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  <img src={url} alt="" className="h-9 w-9 rounded object-cover border" />
                </a>
              );
            },
          },
          { key: 'balance', label: 'Balance', render: (c) => <span className="font-medium">Rs. {c.balance.toLocaleString()}</span> },
          { key: 'orders', label: 'Orders' },
          { key: 'status', label: 'Status', render: (c) => (
            <Badge variant={c.status === 'active' ? 'default' : 'destructive'} className={cn("text-xs", c.status === 'active' && "bg-emerald-500")}>{c.status}</Badge>
          )},
          { key: 'actions', label: '', render: (c) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => adminRoute?.navigateToView(c.id) ?? (setSelected(c), setViewOpen(true))}><Eye className="w-4 h-4 mr-2 text-emerald-600" /> View Profile</DropdownMenuItem>
                {crud.canCustomerMutate ? (
                  <DropdownMenuItem onClick={() => adminRoute?.navigateToEdit(c.id) ?? (setSelected(c), setEditOpen(true))}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                ) : null}
                {crud.canCustomerMutate ? (
                <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={c.status === 'blocked' ? 'text-emerald-600' : 'text-destructive'}
                  onClick={async () => {
                    try {
                      await updateMut.mutateAsync({
                        id: c.id,
                        payload: { is_active: c.status === 'blocked' },
                      });
                    } catch (e) {
                      setFormErr(formatApiError(e));
                    }
                  }}
                >
                  {c.status === 'blocked' ? <><Unlock className="w-4 h-4 mr-2" /> Unblock</> : <><Ban className="w-4 h-4 mr-2" /> Block</>}
                </DropdownMenuItem>
                </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={crud.canCustomerMutate ? () => adminRoute?.navigateToAdd() ?? setCreateOpen(true) : undefined} addLabel="Create Customer"
        onExport={() => {}} onFilter={() => {}}
        bulkActions={[{ id: 'block', label: 'Block Selected' }]}
      />

      <CRUDModal open={resolvedViewOpen} onClose={() => { adminRoute?.navigateToList(); setViewOpen(false); }} title="Customer Profile" size="xl" onSave={() => { adminRoute?.navigateToList(); setViewOpen(false); }} saveLabel="Close">
        {resolvedSelected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <Avatar className="h-16 w-16 text-2xl">
                {resolvedSelected.avatar ? (
                  <AvatarImage src={resolveMediaUrlForDisplay(resolvedSelected.avatar)} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback>{resolvedSelected.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">{resolvedSelected.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{resolvedSelected.email}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{resolvedSelected.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={resolvedSelected.status === 'active' ? 'default' : 'destructive'} className={cn("text-xs", resolvedSelected.status === 'active' && "bg-emerald-500")}>{resolvedSelected.status}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{resolvedSelected.role}</Badge>
                  <Badge variant={resolvedSelected.kyc === 'verified' ? 'outline' : 'secondary'} className="text-xs">{resolvedSelected.kyc}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{resolvedSelected.orders}</p><p className="text-xs text-muted-foreground">Orders</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">Rs. {resolvedSelected.spent.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Spent</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-600">Rs. {resolvedSelected.balance.toLocaleString()}</p><p className="text-xs text-muted-foreground">Wallet Balance</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{resolvedSelected.joined}</p><p className="text-xs text-muted-foreground">Joined</p></CardContent></Card>
            </div>
            {resolvedSelected.customer_document ? (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Uploaded document</p>
                {(() => {
                  const docUrl = resolveMediaUrlForDisplay(resolvedSelected.customer_document);
                  const pdf = /\.pdf(\?|$)/i.test(docUrl);
                  if (pdf) {
                    return (
                      <a href={docUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        <Download className="w-4 h-4" /> Download PDF
                      </a>
                    );
                  }
                  return <img src={docUrl} alt="Document" className="max-h-48 rounded border object-contain" />;
                })()}
              </div>
            ) : null}
          </div>
        )}
      </CRUDModal>

      <CRUDModal
        open={resolvedEditOpen}
        onClose={() => { adminRoute?.navigateToList(); setEditOpen(false); setFormErr(''); }}
        title="Edit Customer"
        onSave={saveEdit}
        loading={updateMut.isPending}
        error={formErr}
      >
        {resolvedEditOpen && editUserId ? (
          <div className="space-y-4">
            {editUserDetailError ? (
              <p className="text-sm text-destructive">{formatApiError(editUserDetailErr)}</p>
            ) : editUserDetailLoading && !editUserDetail ? (
              <p className="text-sm text-muted-foreground">Loading customer details…</p>
            ) : (
              <>
                <div><Label>Full Name</Label><Input value={eName} onChange={(e) => setEName(e.target.value)} /></div>
                <div><Label>Email</Label><Input value={eEmail} onChange={(e) => setEEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={ePhone} onChange={(e) => setEPhone(e.target.value)} /></div>
                <div><Label>Role</Label>
                  <Select value={eRole} onValueChange={setERole}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>KYC Status</Label>
                  <Select value={eKyc} onValueChange={setEKyc}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Account Status</Label>
                  <Select value={eStatus} onValueChange={setEStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document upload</Label>
                  <Input
                    type="file"
                    accept={CUSTOMER_DOC_ACCEPT}
                    className="cursor-pointer"
                    onChange={(e) => setEDocFile(e.target.files?.[0] ?? null)}
                  />
                  {(() => {
                    const docHint =
                      (editUserDetail as { customer_document?: string } | undefined)?.customer_document ||
                      resolvedSelected?.customer_document;
                    return docHint && !eDocFile ? (
                      <p className="text-xs text-muted-foreground mt-1">Current file on record. Choose a file to replace.</p>
                    ) : null;
                  })()}
                  {eDocFile ? <p className="text-xs text-muted-foreground mt-1">New file: {eDocFile.name}</p> : null}
                </div>
              </>
            )}
          </div>
        ) : null}
      </CRUDModal>

      <CRUDModal
        open={resolvedCreateOpen}
        onClose={() => { adminRoute?.navigateToList(); setCreateOpen(false); setFormErr(''); }}
        title="Create Customer"
        onSave={saveCreate}
        loading={createMut.isPending}
        error={formErr}
      >
        <div className="space-y-4">
          <div><Label>Full Name</Label><Input placeholder="Customer full name" value={cName} onChange={(e) => setCName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="customer@email.com" value={cEmail} onChange={(e) => setCEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input placeholder="98XXXXXXXX" value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" placeholder="Optional — omit for invite flow" value={cPassword} onChange={(e) => setCPassword(e.target.value)} /></div>
          <div><Label>Role</Label>
            <Select value={cRole} onValueChange={setCRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Member</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-3">
              <p className="text-xs text-blue-700 font-medium">Default role is Normal Member</p>
              <p className="text-[11px] text-blue-600 mt-1">After creation, the customer can upgrade to Parent or Child per your onboarding flow.</p>
            </CardContent>
          </Card>
          <div>
            <Label>Document upload</Label>
            <Input
              type="file"
              accept={CUSTOMER_DOC_ACCEPT}
              className="cursor-pointer"
              onChange={(e) => setCDocFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Images or PDF (types configurable via accept attribute).</p>
            {cDocFile ? <p className="text-xs text-muted-foreground mt-1">Selected: {cDocFile.name}</p> : null}
          </div>
        </div>
      </CRUDModal>
    </div>
  );
}

// ==================== SELLERS / VENDORS VIEW ====================
function SellersView() {
  const queryClient = useQueryClient();
  const adminRoute = useAdminRouteContext();
  const crud = useAdminCrudPolicy();
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editVendorOpen, setEditVendorOpen] = useState(false);
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: apiVendors, isLoading, isError } = useAdminList<VendorRow>(
    ['admin', 'vendors'],
    () => adminApi.vendors({ page_size: 200 }),
  );
  const [vendorPatch, setVendorPatch] = useState<Record<string, Partial<VendorRow>>>({});
  const [vendorErr, setVendorErr] = useState('');

  const [aStoreName, setAStoreName] = useState('');
  const [aOwnerName, setAOwnerName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aAddress, setAAddress] = useState('');
  const [aContactEmail, setAContactEmail] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [aCommission, setACommission] = useState('10');
  const [aCanPost, setACanPost] = useState(true);
  const [aCanSell, setACanSell] = useState(true);
  const [aStatus, setAStatus] = useState('pending');
  const [aLogo, setALogo] = useState<File | null>(null);
  const [aBanner, setABanner] = useState<File | null>(null);
  const [aKycDocType, setAKycDocType] = useState('');
  const [aKycIdNumber, setAKycIdNumber] = useState('');
  const [aKycApprove, setAKycApprove] = useState(false);
  const [aKycImage, setAKycImage] = useState<File | null>(null);
  const [aKycBack, setAKycBack] = useState<File | null>(null);
  const [aKycFile, setAKycFile] = useState<File | null>(null);

  const [eStoreName, setEStoreName] = useState('');
  const [eOwnerName, setEOwnerName] = useState('');
  const [eOwnerPhone, setEOwnerPhone] = useState('');
  const [eContactEmail, setEContactEmail] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eCommission, setECommission] = useState('');
  const [eCanPost, setECanPost] = useState(true);
  const [eCanSell, setECanSell] = useState(true);
  const [eStatus, setEStatus] = useState('pending');
  const [eDesc, setEDesc] = useState('');
  const [eLogo, setELogo] = useState<File | null>(null);
  const [eBanner, setEBanner] = useState<File | null>(null);

  const vendorMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> | FormData }) =>
      adminApi.updateVendor(id, payload),
    [['admin', 'vendors']],
  );
  const vendorCreateMut = useAdminMutation(
    (payload: Record<string, unknown> | FormData) => adminApi.createVendor(payload),
    [['admin', 'vendors']],
  );

  const sellersData = useMemo(
    () => apiVendors.map((s) => ({ ...s, ...vendorPatch[s.id] })),
    [apiVendors, vendorPatch],
  );

  const filtered = sellersData.filter((s) => statusFilter === 'all' || s.status === statusFilter);
  const selectedFromRoute = adminRoute?.itemId ? filtered.find((s) => s.id === adminRoute.itemId) ?? null : null;
  const resolvedSelected = selectedFromRoute ?? selected;
  const resolvedAddOpen = addOpen || adminRoute?.action === 'add';
  const resolvedViewOpen = viewOpen || adminRoute?.action === 'view';
  const resolvedEditVendorOpen = editVendorOpen || adminRoute?.action === 'edit';

  const resetAddVendor = () => {
    setAStoreName('');
    setAOwnerName('');
    setAEmail('');
    setAPhone('');
    setAAddress('');
    setAContactEmail('');
    setAPassword('');
    setACommission('10');
    setACanPost(true);
    setACanSell(true);
    setAStatus('pending');
    setALogo(null);
    setABanner(null);
    setAKycDocType('');
    setAKycIdNumber('');
    setAKycApprove(false);
    setAKycImage(null);
    setAKycBack(null);
    setAKycFile(null);
    setVendorErr('');
  };

  const saveAddVendor = async () => {
    setVendorErr('');
    if (!aStoreName.trim() || !aOwnerName.trim() || !aPhone.trim()) {
      setVendorErr('Store name, owner name, and phone are required.');
      return;
    }
    const hasKycFiles = Boolean(aKycImage || aKycFile || aKycBack);
    if (hasKycFiles && !aKycDocType.trim()) {
      setVendorErr('Select a KYC document type when uploading KYC files.');
      return;
    }
    if (aKycDocType.trim() && !hasKycFiles && !aKycApprove) {
      setVendorErr('Add a KYC document (image or PDF) or enable “Verify KYC now”.');
      return;
    }
    try {
      const useMultipart = Boolean(aLogo || aBanner || aKycImage || aKycFile || aKycBack);
      const kycPayload = {
        kyc_approve: aKycApprove,
        ...(aKycDocType.trim() ? { kyc_document_type: aKycDocType.trim() } : {}),
        ...(aKycIdNumber.trim() ? { kyc_document_id_number: aKycIdNumber.trim() } : {}),
      };
      if (useMultipart) {
        const fd = new FormData();
        fd.append('store_name', aStoreName.trim());
        fd.append('name', aOwnerName.trim());
        fd.append('phone', aPhone.trim());
        fd.append('email', aEmail.trim());
        if (aPassword) fd.append('password', aPassword);
        fd.append('address', aAddress.trim());
        fd.append('contact_email', aContactEmail.trim());
        fd.append('commission_rate', String(Number(aCommission) || 10));
        fd.append('can_post', aCanPost ? 'true' : 'false');
        fd.append('can_sell', aCanSell ? 'true' : 'false');
        fd.append('status', aStatus);
        fd.append('kyc_approve', aKycApprove ? 'true' : 'false');
        if (aKycDocType.trim()) fd.append('kyc_document_type', aKycDocType.trim());
        if (aKycIdNumber.trim()) fd.append('kyc_document_id_number', aKycIdNumber.trim());
        if (aLogo) fd.append('logo', aLogo);
        if (aBanner) fd.append('banner', aBanner);
        if (aKycImage) fd.append('kyc_document_image', aKycImage);
        if (aKycFile) fd.append('kyc_document_file', aKycFile);
        if (aKycBack) fd.append('kyc_document_back', aKycBack);
        await vendorCreateMut.mutateAsync(fd);
      } else {
        await vendorCreateMut.mutateAsync({
          store_name: aStoreName.trim(),
          name: aOwnerName.trim(),
          phone: aPhone.trim(),
          email: aEmail.trim(),
          password: aPassword || undefined,
          address: aAddress.trim(),
          contact_email: aContactEmail.trim(),
          commission_rate: Number(aCommission) || 10,
          can_post: aCanPost,
          can_sell: aCanSell,
          status: aStatus,
          ...kycPayload,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc-submissions'] });
      resetAddVendor();
      adminRoute?.navigateToList();
      setAddOpen(false);
    } catch (e) {
      setVendorErr(formatApiError(e));
    }
  };

  const saveEditVendor = async () => {
    if (!resolvedSelected) return;
    setVendorErr('');
    if (!eStoreName.trim()) {
      setVendorErr('Store name is required.');
      return;
    }
    try {
      const useMultipart = Boolean(eLogo || eBanner);
      const basePayload: Record<string, unknown> = {
        store_name: eStoreName.trim(),
        owner_name: eOwnerName.trim(),
        owner_phone: eOwnerPhone.trim(),
        contact_email: eContactEmail.trim(),
        address: eAddress.trim(),
        description: eDesc.trim(),
        commission_rate: Number(eCommission) || 0,
        can_post: eCanPost,
        can_sell: eCanSell,
        status: eStatus,
      };
      if (useMultipart) {
        const fd = new FormData();
        Object.entries(basePayload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        if (eLogo) fd.append('logo', eLogo);
        if (eBanner) fd.append('banner', eBanner);
        await vendorMut.mutateAsync({ id: resolvedSelected.id, payload: fd });
      } else {
        await vendorMut.mutateAsync({ id: resolvedSelected.id, payload: basePayload });
      }
      setELogo(null);
      setEBanner(null);
      adminRoute?.navigateToList();
      setEditVendorOpen(false);
    } catch (e) {
      setVendorErr(formatApiError(e));
    }
  };

  const toggleSelling = async (id: string) => {
    const base = sellersData.find((s) => s.id === id);
    if (!base) return;
    const next = !base.canSell;
    try {
      await vendorMut.mutateAsync({ id, payload: { can_sell: next } });
      setVendorPatch((p) => ({ ...p, [id]: { ...p[id], canSell: next } }));
    } catch (e) {
      setVendorErr(formatApiError(e));
    }
  };
  const togglePosting = async (id: string) => {
    const base = sellersData.find((s) => s.id === id);
    if (!base) return;
    const next = !base.canPost;
    try {
      await vendorMut.mutateAsync({ id, payload: { can_post: next } });
      setVendorPatch((p) => ({ ...p, [id]: { ...p[id], canPost: next } }));
    } catch (e) {
      setVendorErr(formatApiError(e));
    }
  };

  useEffect(() => {
    if (resolvedEditVendorOpen && resolvedSelected) {
      setEStoreName(resolvedSelected.name);
      setEOwnerName(resolvedSelected.owner);
      setEOwnerPhone(resolvedSelected.phone ?? '');
      setEContactEmail(resolvedSelected.contact_email ?? '');
      setEAddress(resolvedSelected.address ?? '');
      setECommission(String(resolvedSelected.commission));
      setECanPost(resolvedSelected.canPost);
      setECanSell(resolvedSelected.canSell);
      setEStatus(resolvedSelected.status);
      setEDesc(resolvedSelected.description ?? '');
      setELogo(null);
      setEBanner(null);
    }
  }, [resolvedEditVendorOpen, resolvedSelected]);

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading vendors…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load vendors.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {vendorErr ? <p className="text-sm text-destructive">{vendorErr}</p> : null}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem><SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem><SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminTable title="Vendors / Sellers" subtitle="Create vendors, edit store details, commissions, and permissions" data={filtered}
        columns={[
          { key: 'name', label: 'Store', render: (s) => {
            const lg = s.logo_url ? resolveMediaUrlForDisplay(s.logo_url) : '';
            return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                {lg ? <img src={lg} alt="" className="h-full w-full object-cover" /> : <Building2 className="w-5 h-5 text-primary" />}
              </div>
              <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">by {s.owner}</p></div>
            </div>
            );
          } },
          { key: 'phone', label: 'Phone', render: (s) => <span className="text-xs">{s.phone || '—'}</span> },
          { key: 'products', label: 'Products' },
          { key: 'revenue', label: 'Revenue', render: (s) => <span className="font-medium">Rs. {(s.revenue / 1000).toFixed(0)}K</span> },
          { key: 'walletBalance', label: 'Wallet', render: (s) => <span className="font-medium">Rs. {s.walletBalance.toLocaleString()}</span> },
          { key: 'commission', label: 'Commission', render: (s) => `${s.commission}%` },
          { key: 'controls', label: 'Controls', render: (s) => (
            <div className="flex items-center gap-2">
              <Badge variant={s.canPost ? 'default' : 'secondary'} className={cn("text-[10px]", crud.canVendorMutate && "cursor-pointer", s.canPost && "bg-emerald-500")} onClick={() => crud.canVendorMutate && togglePosting(s.id)}>Post</Badge>
              <Badge variant={s.canSell ? 'default' : 'secondary'} className={cn("text-[10px]", crud.canVendorMutate && "cursor-pointer", s.canSell && "bg-emerald-500")} onClick={() => crud.canVendorMutate && toggleSelling(s.id)}>Sell</Badge>
            </div>
          )},
          { key: 'status', label: 'Status', render: (s) => (
            <Badge variant={s.status === 'approved' ? 'default' : 'secondary'} className={cn("text-xs", s.status === 'approved' && "bg-emerald-500")}>{s.status}</Badge>
          )},
          { key: 'actions', label: '', render: (s) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => adminRoute?.navigateToView(s.id) ?? (setSelected(s), setViewOpen(true))}><Eye className="w-4 h-4 mr-2 text-emerald-600" /> View Store</DropdownMenuItem>
                {crud.canVendorMutate ? (
                <>
                <DropdownMenuItem onClick={() => adminRoute?.navigateToEdit(s.id) ?? (setSelected(s), setEditVendorOpen(true))}><Edit className="w-4 h-4 mr-2" /> Edit Vendor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/vendor?impersonate=${s.id}&store=${encodeURIComponent(s.name)}`, '_blank')}>
                  <Shield className="w-4 h-4 mr-2 text-blue-500" /> Login as Vendor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toggleSelling(s.id)}>{s.canSell ? <><Ban className="w-4 h-4 mr-2" /> Disable Selling</> : <><CheckCircle className="w-4 h-4 mr-2" /> Enable Selling</>}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => togglePosting(s.id)}>{s.canPost ? <><Ban className="w-4 h-4 mr-2" /> Disable Posting</> : <><CheckCircle className="w-4 h-4 mr-2" /> Enable Posting</>}</DropdownMenuItem>
                {s.status === 'pending' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-emerald-600"
                      onClick={async () => {
                        try {
                          await vendorMut.mutateAsync({ id: s.id, payload: { status: 'approved' } });
                        } catch (e) {
                          setVendorErr(formatApiError(e));
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={async () => {
                        try {
                          await vendorMut.mutateAsync({ id: s.id, payload: { status: 'rejected' } });
                        } catch (e) {
                          setVendorErr(formatApiError(e));
                        }
                      }}
                    >
                      <Ban className="w-4 h-4 mr-2" /> Reject
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    try {
                      await vendorMut.mutateAsync({ id: s.id, payload: { status: 'suspended' } });
                    } catch (e) {
                      setVendorErr(formatApiError(e));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Suspend Vendor
                </DropdownMenuItem>
                </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={crud.canVendorMutate ? () => { resetAddVendor(); adminRoute?.navigateToAdd() ?? setAddOpen(true); } : undefined} addLabel="Add Vendor" onExport={() => {}} onFilter={() => {}}
      />

      <CRUDModal
        open={resolvedAddOpen}
        onClose={() => { resetAddVendor(); adminRoute?.navigateToList(); setAddOpen(false); }}
        title="Add Vendor"
        onSave={saveAddVendor}
        loading={vendorCreateMut.isPending}
        error={vendorErr}
        size="lg"
      >
        <div className="space-y-4">
          <div><Label>Store name</Label><Input placeholder="Vendor store name" value={aStoreName} onChange={(e) => setAStoreName(e.target.value)} /></div>
          <div><Label>Owner name</Label><Input placeholder="Full name" value={aOwnerName} onChange={(e) => setAOwnerName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="vendor@email.com" value={aEmail} onChange={(e) => setAEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input placeholder="98XXXXXXXX" value={aPhone} onChange={(e) => setAPhone(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" placeholder="Optional" value={aPassword} onChange={(e) => setAPassword(e.target.value)} /></div>
          <div><Label>Store address</Label><Input placeholder="Address" value={aAddress} onChange={(e) => setAAddress(e.target.value)} /></div>
          <div><Label>Contact email (store)</Label><Input type="email" placeholder="contact@store.com" value={aContactEmail} onChange={(e) => setAContactEmail(e.target.value)} /></div>
          <div><Label>Commission (%)</Label><Input type="number" placeholder="10" value={aCommission} onChange={(e) => setACommission(e.target.value)} /></div>
          <div><Label>Initial status</Label>
            <Select value={aStatus} onValueChange={setAStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium text-sm">Allow posting (reels / content)</span>
              <Switch checked={aCanPost} onCheckedChange={setACanPost} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium text-sm">Allow selling</span>
              <Switch checked={aCanSell} onCheckedChange={setACanSell} />
            </div>
          </div>
          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium">KYC (optional)</p>
            <p className="text-xs text-muted-foreground">
              Upload the vendor&apos;s identity documents and/or mark them as KYC-verified immediately (same as approving in User KYC).
            </p>
            <div>
              <Label>Document type</Label>
              <Select
                value={aKycDocType || '__none__'}
                onValueChange={(v) => setAKycDocType(v === '__none__' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {VENDOR_KYC_DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document ID number</Label>
              <Input
                placeholder="Optional"
                value={aKycIdNumber}
                onChange={(e) => setAKycIdNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>ID document (image)</Label>
                <Input
                  type="file"
                  accept={CUSTOMER_DOC_ACCEPT}
                  className="cursor-pointer"
                  onChange={(e) => setAKycImage(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label>ID document (PDF)</Label>
                <Input
                  type="file"
                  accept={CUSTOMER_DOC_ACCEPT}
                  className="cursor-pointer"
                  onChange={(e) => setAKycFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Back of ID (optional)</Label>
                <Input
                  type="file"
                  accept={CUSTOMER_DOC_ACCEPT}
                  className="cursor-pointer"
                  onChange={(e) => setAKycBack(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
              <div>
                <span className="font-medium text-sm block">Verify KYC now</span>
                <span className="text-xs text-muted-foreground">
                  Sets the owner account to verified; with uploads, records an admin-approved KYC document.
                </span>
              </div>
              <Switch checked={aKycApprove} onCheckedChange={setAKycApprove} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Logo</Label>
              <Input type="file" accept="image/*" className="cursor-pointer" onChange={(e) => setALogo(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Banner</Label>
              <Input type="file" accept="image/*" className="cursor-pointer" onChange={(e) => setABanner(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={resolvedViewOpen} onClose={() => { adminRoute?.navigateToList(); setViewOpen(false); }} title="Store Details" size="xl" onSave={() => { adminRoute?.navigateToList(); setViewOpen(false); }} saveLabel="Close">
        {resolvedSelected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                {resolvedSelected.logo_url ? (
                  <img src={resolveMediaUrlForDisplay(resolvedSelected.logo_url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">{resolvedSelected.name}</h3>
                <p className="text-sm text-muted-foreground">by {resolvedSelected.owner}</p>
                <p className="text-xs text-muted-foreground mt-1">{resolvedSelected.phone || '—'} · {resolvedSelected.contact_email || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={resolvedSelected.status === 'approved' ? 'default' : 'secondary'} className={cn("text-xs", resolvedSelected.status === 'approved' && "bg-emerald-500")}>{resolvedSelected.status}</Badge>
                </div>
              </div>
            </div>
            {resolvedSelected.address ? <p className="text-sm"><span className="text-muted-foreground">Address: </span>{resolvedSelected.address}</p> : null}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{resolvedSelected.products}</p><p className="text-xs text-muted-foreground">Products</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{resolvedSelected.orders}</p><p className="text-xs text-muted-foreground">Orders</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-600">Rs. {(resolvedSelected.revenue / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Revenue</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-primary">Rs. {resolvedSelected.walletBalance.toLocaleString()}</p><p className="text-xs text-muted-foreground">Wallet</p></CardContent></Card>
            </div>
          </div>
        )}
      </CRUDModal>

      <CRUDModal
        open={resolvedEditVendorOpen}
        onClose={() => { adminRoute?.navigateToList(); setEditVendorOpen(false); setVendorErr(''); }}
        title="Edit Vendor"
        loading={vendorMut.isPending}
        error={vendorErr}
        onSave={saveEditVendor}
        size="lg"
      >
        {resolvedSelected && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-xl"><p className="font-bold text-lg">{resolvedSelected.name}</p><p className="text-sm text-muted-foreground">ID {resolvedSelected.id}</p></div>
            <div><Label>Store name</Label><Input value={eStoreName} onChange={(e) => setEStoreName(e.target.value)} /></div>
            <div><Label>Owner name</Label><Input value={eOwnerName} onChange={(e) => setEOwnerName(e.target.value)} /></div>
            <div><Label>Owner phone</Label><Input value={eOwnerPhone} onChange={(e) => setEOwnerPhone(e.target.value)} /></div>
            <div><Label>Contact email</Label><Input type="email" value={eContactEmail} onChange={(e) => setEContactEmail(e.target.value)} /></div>
            <div><Label>Address</Label><Textarea value={eAddress} onChange={(e) => setEAddress(e.target.value)} rows={2} /></div>
            <div><Label>Description</Label><Textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={2} placeholder="Optional" /></div>
            <div><Label>Commission rate (%)</Label><Input type="number" value={eCommission} onChange={(e) => setECommission(e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={eStatus} onValueChange={setEStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium text-sm">Allow posting</span>
                <Switch checked={eCanPost} onCheckedChange={setECanPost} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium text-sm">Allow selling</span>
                <Switch checked={eCanSell} onCheckedChange={setECanSell} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Replace logo</Label>
                <Input type="file" accept="image/*" className="cursor-pointer" onChange={(e) => setELogo(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label>Replace banner</Label>
                <Input type="file" accept="image/*" className="cursor-pointer" onChange={(e) => setEBanner(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}

// ==================== ADMINS VIEW ====================
function AdminsView() {
  const adminRoute = useAdminRouteContext();
  const crud = useAdminCrudPolicy();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffAdminRow | null>(null);
  const [editItem, setEditItem] = useState<StaffAdminRow | null>(null);
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [aRole, setARole] = useState('staff');
  const [aActive, setAActive] = useState(true);
  const [adminErr, setAdminErr] = useState('');
  const createMut = useAdminMutation(adminApi.createUser, [['admin', 'staff-users'], ['admin-users-list']]);
  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateUser(id, payload),
    [['admin', 'staff-users'], ['admin-users-list']],
  );
  const deleteMut = useAdminMutation(adminApi.deleteUser, [['admin', 'staff-users'], ['admin-users-list']]);
  const { data: admins = [], isLoading, isError } = useAdminList<StaffAdminRow>(
    ['admin', 'staff-users'],
    () => adminApi.staffUsers({ page_size: 200 }),
  );

  const rows = admins.map((a) => ({
    ...a,
    lastLogin: a.lastLogin ? a.lastLogin.slice(0, 19).replace('T', ' ') : '—',
  }));
  const selectedFromRoute = adminRoute?.itemId ? rows.find((a) => a.id === adminRoute.itemId) ?? null : null;
  const resolvedEditItem = selectedFromRoute ?? editItem;
  const resolvedModalOpen = modalOpen || adminRoute?.action === 'add' || adminRoute?.action === 'edit';

  useEffect(() => {
    if (resolvedModalOpen && resolvedEditItem) {
      setAName(resolvedEditItem.name);
      setAEmail(resolvedEditItem.email);
      setAPhone(resolvedEditItem.phone ?? '');
      setAPassword('');
      setARole(resolvedEditItem.role);
      setAActive(resolvedEditItem.status === 'active');
    } else if (resolvedModalOpen && !resolvedEditItem) {
      setAName('');
      setAEmail('');
      setAPhone('');
      setAPassword('');
      setARole('staff');
      setAActive(true);
    }
  }, [resolvedModalOpen, resolvedEditItem]);

  const saveAdmin = async () => {
    setAdminErr('');
    if (!aName.trim() || (!resolvedEditItem && !aPhone.trim())) {
      setAdminErr('Name and phone are required for new admins.');
      return;
    }
    try {
      if (resolvedEditItem) {
        await updateMut.mutateAsync({
          id: resolvedEditItem.id,
          payload: {
            name: aName.trim(),
            email: aEmail.trim(),
            phone: aPhone.trim(),
            role: aRole,
            is_active: aActive,
            is_staff: true,
          },
        });
      } else {
        await createMut.mutateAsync({
          name: aName.trim(),
          phone: aPhone.trim(),
          email: aEmail.trim(),
          password: aPassword || undefined,
          role: aRole,
          is_staff: true,
        });
      }
      adminRoute?.navigateToList();
      setModalOpen(false);
    } catch (e) {
      setAdminErr(formatApiError(e));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading administrators…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load staff users.</div>;

  return (
    <div className="p-4 lg:p-6">
      {adminErr && !resolvedModalOpen ? <p className="text-sm text-destructive mb-2">{adminErr}</p> : null}
      <AdminTable title="Administrators" subtitle="Manage admin roles, permissions, and activity"
        data={rows}
        columns={[
          { key: 'name', label: 'Name', render: (a) => <span className="font-medium">{a.name}</span> },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (a) => <Badge variant="outline" className="text-xs capitalize">{a.role.replace('_', ' ')}</Badge> },
          { key: 'lastLogin', label: 'Last Login' },
          { key: 'status', label: 'Status', render: (a) => (
            <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", a.status === 'active' && "bg-emerald-500")}>{a.status}</Badge>
          )},
          { key: 'actions', label: '', render: (a) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {crud.canEditAdmins ? (
                  <DropdownMenuItem onClick={() => adminRoute?.navigateToEdit(a.id) ?? (setEditItem(a), setModalOpen(true))}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                ) : null}
                {crud.canEditAdmins ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(a); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={crud.canEditAdmins ? () => adminRoute?.navigateToAdd() ?? (setEditItem(null), setModalOpen(true)) : undefined} addLabel="Add Admin"
      />
      <CRUDModal
        open={resolvedModalOpen}
        onClose={() => { adminRoute?.navigateToList(); setModalOpen(false); setAdminErr(''); }}
        title={resolvedEditItem ? 'Edit Administrator' : 'Add Administrator'}
        onSave={saveAdmin}
        loading={createMut.isPending || updateMut.isPending}
        error={adminErr}
      >
        <div className="space-y-4">
          <div><Label>Name</Label><Input placeholder="Admin name" value={aName} onChange={(e) => setAName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" placeholder="admin@khudra.com" value={aEmail} onChange={(e) => setAEmail(e.target.value)} /></div>
          {resolvedEditItem ? (
            <div><Label>Phone (login)</Label><Input placeholder="98XXXXXXXX" value={aPhone} onChange={(e) => setAPhone(e.target.value)} /></div>
          ) : (
            <>
              <div><Label>Phone (login)</Label><Input placeholder="98XXXXXXXX" value={aPhone} onChange={(e) => setAPhone(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={aPassword} onChange={(e) => setAPassword(e.target.value)} /></div>
            </>
          )}
          <div><Label>Role</Label>
            <Select value={aRole} onValueChange={setARole}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="finance">Finance</SelectItem><SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={aActive} onCheckedChange={setAActive} /></div>
        </div>
      </CRUDModal>
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteMut.mutateAsync(deleteTarget.id);
            setDeleteOpen(false);
            setDeleteTarget(null);
          } catch (e) {
            setAdminErr(formatApiError(e));
            setDeleteOpen(false);
          }
        }}
        description="This will remove this administrator's account."
      />
    </div>
  );
}

// ==================== KYC VIEW ====================
function useIsLg() {
  const [lg, setLg] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const fn = () => setLg(m.matches);
    fn();
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, []);
  return lg;
}

function KYCView() {
  const queryClient = useQueryClient();
  const isLg = useIsLg();
  const [selected, setSelected] = useState<AdminKycSubmissionRow | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<AdminKycSubmissionRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (isLg) setMobileSheetOpen(false);
  }, [isLg]);

  const pickRow = (k: AdminKycSubmissionRow) => {
    setSelected(k);
    if (!isLg) setMobileSheetOpen(true);
  };

  const { data: kycResp, isLoading, isError } = useQuery({
    queryKey: ['admin', 'kyc-submissions'],
    queryFn: () => adminApi.kycSubmissions({ page_size: 200 }),
  });

  const kycData = useMemo(() => kycResp?.results ?? [], [kycResp]);

  const filtered = useMemo(() => {
    return kycData.filter((k) => {
      if (statusFilter !== 'all' && k.status !== statusFilter) return false;
      if (typeFilter !== 'all' && k.document_type !== typeFilter) return false;
      return true;
    });
  }, [kycData, statusFilter, typeFilter]);

  const reviewMut = useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      rejection_reason?: string;
    }) => adminApi.updateKycSubmission(id, { status, rejection_reason }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc-submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setSelected((prev) => (prev && String(prev.id) === String(data.id) ? data : prev));
      setRejectOpen(false);
      setRejectReason('');
      setRejectTargetId(null);
      setApproveConfirm(null);
    },
  });

  const openReject = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const submitReject = () => {
    if (!rejectTargetId || !rejectReason.trim()) return;
    reviewMut.mutate({
      id: rejectTargetId,
      status: 'rejected',
      rejection_reason: rejectReason.trim(),
    });
  };

  const handleApprove = (id: string) => {
    reviewMut.mutate({ id, status: 'approved' });
  };

  const renderDocMedia = (d: AdminKycSubmissionRow, largePreviews = false) => {
    const front = d.document_image ? resolveMediaUrlForDisplay(d.document_image) : '';
    const back = d.document_back ? resolveMediaUrlForDisplay(d.document_back) : '';
    const file = d.document_file ? resolveMediaUrlForDisplay(d.document_file) : '';
    const pdfFront = Boolean(front && isLikelyPdfMediaUrl(front));
    const pdfBack = Boolean(back && isLikelyPdfMediaUrl(back));
    const pdfFile = Boolean(file && isLikelyPdfMediaUrl(file));
    const imgMax = largePreviews ? 'max-h-96' : 'max-h-64';
    const iframeMin = largePreviews ? 'min-h-[520px]' : 'min-h-[480px]';
    return (
      <div className="space-y-3 border rounded-lg p-3">
        <p className="text-xs text-muted-foreground capitalize">
          {d.document_type.replace(/_/g, ' ')} · {d.status}
          {d.document_id_number ? ` · ID: ${d.document_id_number}` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          {front ? (
            <a href={front} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Open front
            </a>
          ) : null}
          {back ? (
            <a href={back} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Open back
            </a>
          ) : null}
          {file ? (
            <a href={file} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Open file
            </a>
          ) : null}
        </div>
        {front && !pdfFront ? (
          <div className={cn('overflow-auto rounded border bg-muted/20', imgMax)}>
            <img src={front} alt="Document front" className={cn('w-full object-contain', imgMax)} />
          </div>
        ) : null}
        {front && pdfFront ? (
          <InlinePdfPreview
            title="Document front PDF"
            url={front}
            className={cn('w-full rounded border bg-background', iframeMin)}
          />
        ) : null}
        {back && !pdfBack ? (
          <div className={cn('overflow-auto rounded border bg-muted/20', imgMax)}>
            <img src={back} alt="Document back" className={cn('w-full object-contain', imgMax)} />
          </div>
        ) : null}
        {back && pdfBack ? (
          <InlinePdfPreview
            title="Document back PDF"
            url={back}
            className={cn('w-full rounded border bg-background', iframeMin)}
          />
        ) : null}
        {file ? (
          pdfFile ? (
            <InlinePdfPreview
              title="Uploaded PDF"
              url={file}
              className={cn('w-full rounded border bg-background', iframeMin)}
            />
          ) : (
            <div className={cn('overflow-auto rounded border bg-muted/20', imgMax)}>
              <img src={file} alt="Uploaded file" className={cn('w-full object-contain', imgMax)} />
            </div>
          )
        ) : null}
      </div>
    );
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading KYC queue…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load KYC submissions.</div>;

  const pendingN = kycData.filter((k) => k.status === 'pending').length;
  const reviewN = kycData.filter((k) => k.status === 'review').length;
  const approvedN = kycData.filter((k) => k.status === 'approved').length;
  const rejectedN = kycData.filter((k) => k.status === 'rejected').length;

  const kycDetailPanel =
    selected != null ? (
      <div className="space-y-4 flex flex-col min-h-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-semibold text-sm">{selected.user.name}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-semibold text-sm">{selected.user.phone}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold text-sm break-all">{selected.user.email || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Username / KID</p>
              <p className="font-semibold font-mono text-xs break-all">
                {selected.user.username} · {selected.user.kid}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Portal KYC status</p>
              <p className="font-semibold text-sm capitalize">{selected.user.kyc_status}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Reviewed by</p>
              <p className="font-semibold text-sm">
                {selected.reviewer ? selected.reviewer.name : '—'}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Submission</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Document type</p>
              <p className="font-semibold text-sm capitalize">
                {selected.document_type.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Document status</p>
              <Badge
                variant={
                  selected.status === 'approved'
                    ? 'default'
                    : selected.status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                }
                className={cn('capitalize mt-1', selected.status === 'approved' && 'bg-emerald-500')}
              >
                {selected.status}
              </Badge>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">ID number</p>
              <p className="font-semibold text-sm">{selected.document_id_number || '—'}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="font-semibold text-sm">{selected.submitted_at.slice(0, 19)}</p>
            </div>
            {selected.reviewed_at ? (
              <div className="p-3 bg-muted/50 rounded-lg sm:col-span-2">
                <p className="text-xs text-muted-foreground">Reviewed at</p>
                <p className="font-semibold text-sm">{selected.reviewed_at.slice(0, 19)}</p>
              </div>
            ) : null}
          </div>
        </div>
        {selected.rejection_reason ? (
          <p className="text-sm text-destructive border border-destructive/30 rounded-lg p-3 bg-destructive/5">
            <span className="font-medium">Rejection reason: </span>
            {selected.rejection_reason}
          </p>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Uploaded documents</h3>
          {renderDocMedia(selected, true)}
        </div>
        {(selected.status === 'pending' || selected.status === 'review') && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              disabled={reviewMut.isPending}
              onClick={() => handleApprove(selected.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={reviewMut.isPending}
              onClick={() => openReject(selected.id)}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed rounded-lg bg-muted/20 text-center">
        <FileText className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground max-w-xs">
          Select a submission from the table to view user details, documents, and approve or reject.
        </p>
      </div>
    );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">KYC verification</h2>
          <p className="text-sm text-muted-foreground">
            {pendingN} pending · {approvedN} approved · {rejectedN} rejected — use Preview or a row to open details;
            change status from the table with confirmation.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="citizenship">Citizenship</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="driving_license">Driving license</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{pendingN}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{reviewN}</p>
            <p className="text-xs text-muted-foreground">Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{approvedN}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{rejectedN}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground lg:hidden">
        Tap Preview or a row to open full details and documents.
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,44%)] lg:gap-4 lg:items-start">
        <div className="rounded-md border bg-card overflow-hidden min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell w-[140px]">Submitted</TableHead>
                <TableHead className="w-[100px] text-right">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((kyc) => (
                <TableRow
                  key={kyc.id}
                  data-state={selected?.id === kyc.id ? 'selected' : undefined}
                  className={cn(
                    'cursor-pointer',
                    selected?.id === kyc.id && 'bg-muted/80 hover:bg-muted/80',
                  )}
                  onClick={() => pickRow(kyc)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">{kyc.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{kyc.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{kyc.user.phone}</p>
                        <p className="text-[10px] text-muted-foreground capitalize sm:hidden mt-0.5">
                          {kyc.document_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell capitalize text-muted-foreground text-xs">
                    {kyc.document_type.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-7 gap-1 px-2 text-[10px] capitalize',
                            kyc.status === 'approved' && 'border-emerald-500/50 bg-emerald-500/10',
                            kyc.status === 'rejected' && 'border-destructive/50',
                          )}
                          aria-label={`KYC status: ${kyc.status}, open actions`}
                        >
                          {kyc.status}
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                        {(kyc.status === 'pending' ||
                          kyc.status === 'review' ||
                          kyc.status === 'rejected') && (
                          <DropdownMenuItem
                            onClick={() => {
                              reviewMut.reset();
                              setApproveConfirm(kyc);
                            }}
                            className="text-emerald-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve…
                          </DropdownMenuItem>
                        )}
                        {(kyc.status === 'pending' ||
                          kyc.status === 'review' ||
                          kyc.status === 'approved') && (
                          <DropdownMenuItem
                            onClick={() => openReject(kyc.id)}
                            className="text-destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject…
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {kyc.submitted_at.slice(0, 16).replace('T', ' ')}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => pickRow(kyc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No KYC submissions match the filters.</p>
          ) : null}
        </div>

        <div className="hidden lg:block border rounded-lg bg-card p-4 sticky top-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {kycDetailPanel}
        </div>
      </div>

      <Sheet
        open={mobileSheetOpen && !isLg}
        onOpenChange={(open) => {
          setMobileSheetOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KYC submission detail</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{kycDetailPanel}</div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={approveConfirm != null}
        onOpenChange={(open) => {
          if (!open) setApproveConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this KYC submission?</AlertDialogTitle>
            <AlertDialogDescription>
              {approveConfirm
                ? `This will mark the submission as approved for ${approveConfirm.user.name} and update their portal KYC status.`
                : ' '}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reviewMut.isError ? (
            <p className="text-sm text-destructive">{formatApiError(reviewMut.error)}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={reviewMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!approveConfirm || reviewMut.isPending) return;
                reviewMut.mutate({ id: approveConfirm.id, status: 'approved' });
              }}
            >
              {reviewMut.isPending ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CRUDModal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason('');
          setRejectTargetId(null);
        }}
        title="Reject KYC"
        onSave={() => {
          if (!rejectReason.trim()) return;
          submitReject();
        }}
        saveLabel={reviewMut.isPending ? 'Saving…' : 'Reject submission'}
        loading={reviewMut.isPending}
      >
        <div className="space-y-3">
          <Label htmlFor="kyc-reject-reason">Reason (required)</Label>
          <Textarea
            id="kyc-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what the user should fix."
            rows={4}
          />
          {reviewMut.isError ? (
            <p className="text-sm text-destructive">{formatApiError(reviewMut.error)}</p>
          ) : null}
        </div>
      </CRUDModal>
    </div>
  );
}
