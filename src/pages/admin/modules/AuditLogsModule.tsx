import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import {
  adminApi,
  extractResults,
  type AdminAuditLogDetail,
  type AdminAuditLogRow,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { formatApiError } from '../hooks/adminFormUtils';

const ACTION_KINDS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'read', label: 'Read' },
  { value: 'other', label: 'Other' },
] as const;

/** Friendly labels for known module keys (merged with live API distinct list). */
const MODULES = [
  { value: 'all', label: 'All modules' },
  { value: 'admin_api', label: 'Admin API' },
  { value: 'auth', label: 'Auth' },
  { value: 'customers', label: 'Customers' },
  { value: 'employees', label: 'Employees' },
  { value: 'roles', label: 'Roles' },
  { value: 'families', label: 'Families' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'wallet-master', label: 'Wallet master' },
  { value: 'security', label: 'Security' },
  { value: 'loyalty', label: 'Loyalty' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'product_approvals', label: 'Product approvals' },
  { value: 'withdrawals', label: 'Withdrawals' },
  { value: 'cms', label: 'CMS' },
  { value: 'flash_deals', label: 'Flash deals' },
  { value: 'users', label: 'Users' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'orders', label: 'Orders' },
  { value: 'products', label: 'Products' },
  { value: 'sellers', label: 'Sellers' },
  { value: 'settings', label: 'Settings' },
] as const;

const DOMAIN_TYPES = [
  { value: 'all', label: 'All categories' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'family', label: 'Family' },
  { value: 'kyc', label: 'KYC' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'order', label: 'Order' },
  { value: 'user', label: 'User' },
  { value: 'security', label: 'Security' },
  { value: 'settings', label: 'Settings' },
] as const;

function canAccessAuditLogs(profile: { is_superuser: boolean; role: string } | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.is_superuser) || profile.role === 'super_admin';
}

type StaffOption = { id: string; name: string; phone: string };

export default function AuditLogsModule() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [userId, setUserId] = useState('all');
  const [actionKind, setActionKind] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState<'-created_at' | 'created_at'>('-created_at');
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });

  const allowed = canAccessAuditLogs(profile);

  const listParams = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {
      page,
      page_size: pageSize,
      ordering,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (userId !== 'all') p.user_id = userId;
    if (actionKind !== 'all') p.action_kind = actionKind;
    if (moduleFilter !== 'all') p.module = moduleFilter;
    if (typeFilter !== 'all') p.type = typeFilter;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  }, [
    page,
    pageSize,
    ordering,
    debouncedSearch,
    userId,
    actionKind,
    moduleFilter,
    typeFilter,
    dateFrom,
    dateTo,
  ]);

  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
    isFetching,
  } = useQuery({
    queryKey: ['admin', 'employee-audit-logs', listParams],
    queryFn: () => adminApi.auditLogs(listParams),
    enabled: allowed,
    retry: false,
  });

  const { data: staffPaged } = useQuery({
    queryKey: ['admin', 'staff-users', 'audit-filters'],
    queryFn: () => adminApi.staffUsers({ page_size: 500 }),
    enabled: allowed,
  });

  const { data: filterOpts } = useQuery({
    queryKey: ['admin', 'audit-filter-options'],
    queryFn: () => adminApi.auditLogFilterOptions(),
    enabled: allowed,
    staleTime: 60_000,
  });

  const moduleOptions = useMemo(() => {
    const labelFor = (v: string) =>
      MODULES.find((m) => m.value === v)?.label ?? v.replace(/_/g, ' ');
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [{ value: 'all', label: 'All modules' }];
    seen.add('all');
    for (const m of filterOpts?.modules ?? []) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      out.push({ value: m, label: labelFor(m) });
    }
    for (const m of MODULES) {
      if (m.value === 'all' || seen.has(m.value)) continue;
      seen.add(m.value);
      out.push({ value: m.value, label: m.label });
    }
    const rest = out.slice(1).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [out[0], ...rest];
  }, [filterOpts]);

  const staffOptions: StaffOption[] = useMemo(() => {
    const byId = new Map<string, StaffOption>();
    const rows = staffPaged ? extractResults<StaffOption>(staffPaged) : [];
    for (const r of rows) {
      byId.set(String(r.id), {
        id: String(r.id),
        name: r.name,
        phone: r.phone || '',
      });
    }
    for (const a of filterOpts?.actors ?? []) {
      if (!byId.has(a.id)) {
        byId.set(a.id, {
          id: a.id,
          name: (a.name || '').trim() || `User ${a.id}`,
          phone: (a.phone || '').trim(),
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [staffPaged, filterOpts]);

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErr,
  } = useQuery({
    queryKey: ['admin', 'audit-log-detail', detailId],
    queryFn: () => adminApi.auditLogDetail(detailId!),
    enabled: Boolean(detailId) && allowed,
    retry: false,
  });

  const results: AdminAuditLogRow[] = listData?.results ?? [];
  const totalCount = listData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    userId,
    actionKind,
    moduleFilter,
    typeFilter,
    dateFrom,
    dateTo,
    ordering,
    pageSize,
  ]);

  if (profileLoading) {
    return (
      <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-4 lg:p-6 space-y-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" /> Audit Logs
        </h2>
        <p className="text-sm text-destructive">
          Access denied. Audit logs are only available to super administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Lock className="w-5 h-5 text-muted-foreground" /> Audit Logs
        </h2>
        <p className="text-sm text-muted-foreground">
          Immutable activity trail — filter, search, and inspect metadata.
        </p>
      </div>

      {listError ? (
        <p className="text-sm text-destructive">{formatApiError(listErr)}</p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Description, module, object type…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Action</Label>
            <Select value={actionKind} onValueChange={setActionKind}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_KINDS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sort</Label>
            <Select
              value={ordering}
              onValueChange={(v) => setOrdering(v as '-created_at' | 'created_at')}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Newest first</SelectItem>
                <SelectItem value="created_at">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Page size</Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {listLoading && !listData ? (
            <p className="p-6 text-sm text-muted-foreground">Loading audit logs…</p>
          ) : results.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No audit entries match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/50 border-y">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">
                      User
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Action
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Module
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Time
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      IP
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase w-24">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 align-top">
                      <td className="px-3 py-2 text-xs">{row.user}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {row.action_kind || '—'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.module || '—'}
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <span className="text-xs line-clamp-2">{row.description}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {row.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {row.time}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {row.ip_address ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setDetailId(row.id)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isFetching && listData ? (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t">Refreshing…</p>
          ) : null}
        </CardContent>
      </Card>

      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {totalCount} total · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(detailId)} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit log details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : detailError ? (
            <p className="text-sm text-destructive">{formatApiError(detailErr)}</p>
          ) : detail ? (
            <AuditDetailBody detail={detail} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditDetailBody({ detail }: { detail: AdminAuditLogDetail }) {
  const metaStr = useMemo(() => {
    try {
      return JSON.stringify(detail.metadata ?? {}, null, 2);
    } catch {
      return String(detail.metadata);
    }
  }, [detail.metadata]);

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">ID</span>
          <p className="font-mono">{detail.id}</p>
        </div>
        <div>
          <span className="text-muted-foreground">User</span>
          <p>{detail.user}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Action kind</span>
          <p className="capitalize">{detail.action_kind}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Module</span>
          <p>{detail.module || '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Category</span>
          <p className="capitalize">{detail.type}</p>
        </div>
        <div>
          <span className="text-muted-foreground">IP</span>
          <p className="font-mono">{detail.ip_address ?? '—'}</p>
        </div>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">Description</span>
        <p className="mt-0.5">{detail.description}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">Time</span>
        <p className="font-mono text-xs mt-0.5">{detail.created_at}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">Object</span>
        <p className="font-mono text-xs mt-0.5">
          {detail.object_type || '—'} {detail.object_id ? `#${detail.object_id}` : ''}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">Metadata (JSON)</span>
        <pre className="mt-1 p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {metaStr}
        </pre>
      </div>
    </div>
  );
}
