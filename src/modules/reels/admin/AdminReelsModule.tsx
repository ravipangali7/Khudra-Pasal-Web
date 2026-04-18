import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye, Trash2, Pause, Play, Search,
  Heart, AlertTriangle, Edit, Zap,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Reel } from '../types';
import { adminApi, extractResults, type AdminAuditLogRow } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  boostStatusFromReel,
  mapApiReelToUi,
  mapUiPlatformToApi,
  mapUiReelStatusToApi,
} from '../api/reelMappers';
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
import BoostModal from '../vendor/BoostModal';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import {
  fetchVendorAdminOptions,
  fetchVendorProductAdminOptions,
} from '@/components/admin/adminRelationalPickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatApiError } from '@/pages/admin/hooks/adminFormUtils';

const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();

function parseCreatedMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function formatReelRelative(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  flagged: 'bg-red-500/10 text-red-400 border-red-500/20',
  deleted: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

interface AdminReel extends Reel {
  category?: string;
  avgWatchTime?: number;
  ordersGenerated?: number;
  boostStatus?: 'none' | 'standard' | 'premium' | 'mega';
}

function deriveCategory(name: string): string {
  const n = name.toLowerCase();
  if (/earbud|phone|laptop|speaker|tech|usb|cable|charger/i.test(n)) return 'Electronics';
  if (/shoe|sneaker|footwear|sandal/i.test(n)) return 'Footwear';
  if (/bag|fabric|dhaka|fashion|cloth|dress/i.test(n)) return 'Fashion';
  return 'General';
}

function enrichAdminReel(r: Reel): AdminReel {
  return {
    ...r,
    category: deriveCategory(r.product.name),
    boostStatus: boostStatusFromReel(r),
  };
}

const AdminReelsModule: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'all' | 'flagged'>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostReel, setBoostReel] = useState<AdminReel | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [reelsData, setReelsData] = useState<AdminReel[]>([]);
  const [editForm, setEditForm] = useState<Partial<AdminReel>>({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [addVendorId, setAddVendorId] = useState('');
  const [addVendorLabel, setAddVendorLabel] = useState('');
  const [addVideoUrl, setAddVideoUrl] = useState('');
  const [addPlatform, setAddPlatform] = useState('direct_mp4');
  const [addCaption, setAddCaption] = useState('');
  const [addTags, setAddTags] = useState('');
  const [addErr, setAddErr] = useState('');
  const [toggleDialog, setToggleDialog] = useState<null | { id: number; productName: string; nextUi: 'active' | 'paused' }>(null);
  const [bulkDialog, setBulkDialog] = useState<null | { action: 'pause' | 'activate' }>(null);
  const [editStatusBaseline, setEditStatusBaseline] = useState<NonNullable<Reel['status']> | undefined>();
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [statusErr, setStatusErr] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editPlatformApi, setEditPlatformApi] = useState('direct_mp4');
  const [editCaption, setEditCaption] = useState('');
  const [editTagsStr, setEditTagsStr] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [editProductLabel, setEditProductLabel] = useState('');
  const [editVendorId, setEditVendorId] = useState('');
  const [editVendorLabel, setEditVendorLabel] = useState('');
  const [editUiStatus, setEditUiStatus] = useState<NonNullable<Reel['status']>>('active');
  const [deleteDialog, setDeleteDialog] = useState<null | { ids: number[]; summary: string }>(null);
  const [deleteErr, setDeleteErr] = useState('');

  const createReelMut = useMutation({
    mutationFn: async () => {
      if (!addVendorId.trim() || !addVideoUrl.trim()) {
        throw new Error('Vendor and video URL are required.');
      }
      const fd = new FormData();
      fd.append('vendor_id', addVendorId.trim());
      fd.append('video_url', addVideoUrl.trim());
      fd.append('platform', addPlatform);
      fd.append('caption', addCaption);
      if (addTags.trim()) fd.append('tags', addTags.trim());
      const thumbEl = document.getElementById('admin-reel-thumb') as HTMLInputElement | null;
      if (thumbEl?.files?.[0]) fd.append('thumbnail', thumbEl.files[0]);
      return adminApi.createReel(fd);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reels'] });
      setAddErr('');
      setAddVideoUrl('');
      setAddCaption('');
      setAddTags('');
      setAddVendorId('');
      setAddVendorLabel('');
      const thumbEl = document.getElementById('admin-reel-thumb') as HTMLInputElement | null;
      if (thumbEl) thumbEl.value = '';
    },
    onError: (e: Error) => setAddErr(formatApiError(e)),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'reels'],
    queryFn: () => adminApi.reels({ page_size: 200 }),
  });

  const baseRows = useMemo(
    () => extractResults(data).map(mapApiReelToUi).map(enrichAdminReel),
    [data],
  );

  useEffect(() => {
    setReelsData(baseRows);
  }, [baseRows]);

  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
    staleTime: 60_000,
  });

  const canAuditReels =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';

  const { data: reelsAuditResp } = useQuery({
    queryKey: ['admin', 'reels-activity-audit'],
    queryFn: () =>
      adminApi.auditLogs({
        module: 'reels-admin',
        page_size: 8,
        ordering: '-created_at',
      }),
    enabled: canAuditReels,
    staleTime: 30_000,
    retry: false,
  });

  const reelsAuditRows: AdminAuditLogRow[] = useMemo(
    () => extractResults<AdminAuditLogRow>(reelsAuditResp),
    [reelsAuditResp],
  );

  const recentReels = useMemo(() => {
    return [...reelsData]
      .sort((a, b) => parseCreatedMs(b.createdAt) - parseCreatedMs(a.createdAt))
      .slice(0, 12);
  }, [reelsData]);

  const categories = [...new Set(reelsData.map(r => r.category).filter(Boolean))];

  const filtered = reelsData.filter(r => {
    if (search && !r.product.name.toLowerCase().includes(search.toLowerCase()) && !r.vendor.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (tab === 'flagged' && r.status !== 'flagged') return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleRow = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedRows.length === paged.length) setSelectedRows([]);
    else setSelectedRows(paged.map(r => r.id));
  };

  const bulkAction = (action: string) => {
    if (action === 'pause' || action === 'activate') {
      if (selectedRows.length === 0) return;
      setStatusErr('');
      setBulkDialog({ action });
      return;
    }
    if (action === 'delete') {
      if (selectedRows.length === 0) return;
      setDeleteErr('');
      setDeleteDialog({
        ids: [...selectedRows],
        summary: `${selectedRows.length} selected reel(s)`,
      });
    }
  };

  const updateReelStatusMut = useMutation({
    mutationFn: async ({ id, uiStatus }: { id: number; uiStatus: 'active' | 'paused' }) =>
      adminApi.updateReel(String(id), { status: mapUiReelStatusToApi(uiStatus) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reels'] });
      setToggleDialog(null);
      setStatusErr('');
    },
    onError: (e: Error) => setStatusErr(formatApiError(e)),
  });

  const bulkStatusMut = useMutation({
    mutationFn: async ({ ids, uiStatus }: { ids: number[]; uiStatus: 'active' | 'paused' }) => {
      const apiStatus = mapUiReelStatusToApi(uiStatus);
      await Promise.all(ids.map(id => adminApi.updateReel(String(id), { status: apiStatus })));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reels'] });
      setBulkDialog(null);
      setSelectedRows([]);
      setStatusErr('');
    },
    onError: (e: Error) => setStatusErr(formatApiError(e)),
  });

  const openStatusToggleDialog = (reel: AdminReel) => {
    setStatusErr('');
    const nextUi: 'active' | 'paused' = reel.status === 'active' ? 'paused' : 'active';
    setToggleDialog({ id: reel.id, productName: reel.product.name, nextUi });
  };

  const deleteReelMut = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => adminApi.deleteReel(String(id))));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reels'] });
      setDeleteDialog(null);
      setDeleteErr('');
      setSelectedRows([]);
    },
    onError: (e: Error) => setDeleteErr(formatApiError(e)),
  });

  const openEdit = (reel: AdminReel) => {
    setEditForm({ ...reel });
    setEditStatusBaseline(reel.status || 'active');
    setEditErr('');
    setEditVideoUrl(reel.videoUrl || '');
    setEditPlatformApi(reel.platformApi || mapUiPlatformToApi(reel.platform));
    setEditCaption(reel.caption || '');
    setEditTagsStr((reel.tags || []).join(', '));
    setEditVendorId(reel.vendor.id);
    setEditVendorLabel(reel.vendor.name);
    const hasProduct = reel.product.id > 0 && reel.product.name !== 'No product linked';
    setEditProductId(hasProduct ? String(reel.product.id) : '');
    setEditProductLabel(hasProduct ? reel.product.name : '');
    setEditUiStatus((reel.status || 'active') as NonNullable<Reel['status']>);
    setEditOpen(true);
    const thumbEl = document.getElementById('admin-reel-edit-thumb') as HTMLInputElement | null;
    if (thumbEl) thumbEl.value = '';
  };

  const saveEditMut = useMutation({
    mutationFn: async () => {
      if (!editForm.id) return;
      const thumbEl = document.getElementById('admin-reel-edit-thumb') as HTMLInputElement | null;
      const file = thumbEl?.files?.[0];
      const tagsPayload = editTagsStr.trim();
      const apiStatus = mapUiReelStatusToApi(editUiStatus);
      if (file) {
        const fd = new FormData();
        fd.append('video_url', editVideoUrl.trim());
        fd.append('platform', editPlatformApi);
        fd.append('caption', editCaption.slice(0, 200));
        if (tagsPayload) fd.append('tags', tagsPayload);
        fd.append('status', apiStatus);
        fd.append('product_id', editProductId.trim());
        fd.append('thumbnail', file);
        return adminApi.updateReel(String(editForm.id), fd);
      }
      return adminApi.updateReel(String(editForm.id), {
        video_url: editVideoUrl.trim(),
        platform: editPlatformApi,
        caption: editCaption.slice(0, 200),
        tags: tagsPayload,
        status: apiStatus,
        product_id: editProductId.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reels'] });
      setEditOpen(false);
      setEditErr('');
    },
    onError: (e: Error) => setEditErr(formatApiError(e)),
  });

  const saveEdit = () => {
    if (!editForm.id) return;
    const cur = editUiStatus;
    const baseline = editStatusBaseline ?? 'active';
    if (cur !== baseline) {
      setEditConfirmOpen(true);
      return;
    }
    void saveEditMut.mutateAsync();
  };

  const confirmEditSave = () => {
    setEditConfirmOpen(false);
    void saveEditMut.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading reels…</div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-sm text-destructive">Could not load reels. Sign in as staff and ensure the API is running.</div>
    );
  }

  const boostStatusColors: Record<string, string> = {
    none: 'text-muted-foreground',
    standard: 'text-blue-400',
    premium: 'text-amber-400',
    mega: 'text-red-400',
  };

  return (
    <div className="space-y-6 pb-24 scroll-smooth">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">KhudraReels Management</h2>
          <p className="text-sm text-muted-foreground">Full CRUD — manage all vendor reels, analytics, and boost campaigns.</p>
        </div>
      </div>

      {/* Stats */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Add reel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Vendor</Label>
            <AdminSearchCombobox
              queryKeyPrefix="admin-add-reel-vendor"
              value={addVendorId}
              selectedLabel={addVendorLabel}
              onChange={(v, l) => {
                setAddVendorId(v);
                setAddVendorLabel(l ?? '');
              }}
              fetchOptions={fetchVendorAdminOptions}
              placeholder="Search vendor…"
              clearable
            />
          </div>
          <div>
            <Label>Video URL</Label>
            <Input value={addVideoUrl} onChange={(e) => setAddVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Platform</Label>
              <Select value={addPlatform} onValueChange={setAddPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_mp4">Direct MP4</SelectItem>
                  <SelectItem value="youtube_shorts">YouTube Shorts</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Thumbnail (optional)</Label>
              <Input id="admin-reel-thumb" type="file" accept="image/*" className="cursor-pointer" />
            </div>
          </div>
          <div>
            <Label>Caption</Label>
            <Input value={addCaption} onChange={(e) => setAddCaption(e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={addTags} onChange={(e) => setAddTags(e.target.value)} />
          </div>
          {addErr ? <p className="text-sm text-destructive">{addErr}</p> : null}
          <Button type="button" disabled={createReelMut.isPending} onClick={() => { void createReelMut.mutateAsync(); }}>
            {createReelMut.isPending ? 'Saving…' : 'Create reel'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reels', value: reelsData.length, icon: Play, color: 'text-blue-400' },
          { label: 'Total Views', value: formatCount(reelsData.reduce((a, r) => a + r.views, 0)), icon: Eye, color: 'text-emerald-400' },
          { label: 'Total Likes', value: formatCount(reelsData.reduce((a, r) => a + r.likes, 0)), icon: Heart, color: 'text-amber-400' },
          { label: 'Flagged', value: reelsData.filter(r => r.status === 'flagged').length, icon: AlertTriangle, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['overview', 'all', 'flagged'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'flagged' ? `Flagged (${reelsData.filter(r => r.status === 'flagged').length})` : t}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Top Performing Reels</h3>
            <div className="space-y-3">
              {[...reelsData].sort((a, b) => b.views - a.views).slice(0, 12).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <img src={r.product.image} alt="" className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.product.name}</p>
                    <p className="text-xs text-muted-foreground">{r.vendor.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-foreground">{formatCount(r.views)}</p>
                    <p className="text-[10px] text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6 flex flex-col min-h-0">
            <h3 className="font-semibold text-foreground mb-4">Activity</h3>
            {canAuditReels && reelsAuditRows.length > 0 ? (
              <div className="space-y-3 flex-1 min-h-0">
                <p className="text-xs text-muted-foreground -mt-1 mb-2">Recent API changes (reels)</p>
                {reelsAuditRows.map((row) => (
                  <div key={row.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{row.description || row.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.user}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-foreground whitespace-nowrap">{formatReelRelative(row.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentReels.length > 0 ? (
              <div className="space-y-3 flex-1 min-h-0">
                <p className="text-xs text-muted-foreground -mt-1 mb-2">Recently added reels</p>
                {recentReels.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <img src={r.product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.product.name}</p>
                      <p className="text-xs text-muted-foreground">{r.vendor.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-foreground whitespace-nowrap">{formatReelRelative(r.createdAt)}</p>
                      <p className="text-[10px] text-muted-foreground">created</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reels yet. Create one above or check back later.</p>
            )}
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              Full platform audit history: Security → Audit Trail (super admin). Reel metrics above are live from the API.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or vendor..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm text-foreground" />
            </div>
            {tab !== 'flagged' && (
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm text-foreground">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="flagged">Flagged</option>
              </select>
            )}
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border bg-background text-sm text-foreground">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {statusErr ? <p className="text-sm text-destructive px-1">{statusErr}</p> : null}

          {/* Bulk Actions */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium text-foreground">{selectedRows.length} selected</span>
              <button type="button" disabled={bulkStatusMut.isPending} onClick={() => bulkAction('activate')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50">Activate</button>
              <button type="button" disabled={bulkStatusMut.isPending} onClick={() => bulkAction('pause')} className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50">Pause</button>
              <button onClick={() => bulkAction('delete')} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">Delete</button>
              <button onClick={() => { setBoostReel(reelsData.find(r => r.id === selectedRows[0]) || null); setBoostOpen(true); }} className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Boost</button>
              <button onClick={() => setSelectedRows([])} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          )}

          {/* Full CRUD Table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 w-10">
                      <input type="checkbox" checked={selectedRows.length === paged.length && paged.length > 0} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Thumbnail</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Product</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Vendor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Caption</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Tags</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Views</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Likes</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Boost</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Created</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(reel => (
                    <tr key={reel.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <input type="checkbox" checked={selectedRows.includes(reel.id)} onChange={() => toggleRow(reel.id)} className="rounded" />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">#{reel.id}</td>
                      <td className="p-3">
                        <img src={reel.product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-foreground text-xs">{reel.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">NPR {reel.product.price.toLocaleString()}</p>
                      </td>
                      <td className="p-3 text-foreground text-xs">{reel.vendor.name}</td>
                      <td className="p-3 text-xs text-muted-foreground">{reel.category || '-'}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[150px] truncate">{reel.caption}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(reel.tags || []).slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-foreground">{formatCount(reel.views)}</td>
                      <td className="p-3 font-mono text-xs text-foreground">{formatCount(reel.likes)}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium capitalize ${boostStatusColors[reel.boostStatus || 'none']}`}>
                          {reel.boostStatus === 'none' ? '-' : reel.boostStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[reel.status || 'active']}`}>
                          {reel.status || 'active'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{reel.createdAt || '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEdit(reel)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            disabled={updateReelStatusMut.isPending}
                            onClick={() => openStatusToggleDialog(reel)}
                            className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
                            title={reel.status === 'active' ? 'Pause' : 'Activate'}
                          >
                            {reel.status === 'active' ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                          </button>
                          <button onClick={() => { setBoostReel(reel); setBoostOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted" title="Boost">
                            <Zap className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteErr('');
                              setDeleteDialog({ ids: [reel.id], summary: reel.product.name });
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm">
              <span className="text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal — same fields as Add reel */}
      {editOpen && editForm.id != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-lg w-full mx-4 border max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-lg">Edit reel</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Vendor</Label>
                <p className="mt-1 text-sm text-foreground">{editVendorLabel || '—'}</p>
                <p className="text-[10px] text-muted-foreground">Vendor cannot be changed here</p>
              </div>
              <div>
                <Label>Video URL</Label>
                <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={editPlatformApi} onValueChange={setEditPlatformApi}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct_mp4">Direct MP4</SelectItem>
                      <SelectItem value="youtube_shorts">YouTube Shorts</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>New thumbnail (optional)</Label>
                  <Input id="admin-reel-edit-thumb" type="file" accept="image/*" className="cursor-pointer" />
                </div>
              </div>
              <div>
                <Label>Product</Label>
                <AdminSearchCombobox
                  queryKeyPrefix={`admin-edit-reel-product-${editVendorId}`}
                  value={editProductId}
                  selectedLabel={editProductLabel}
                  onChange={(v, l) => {
                    setEditProductId(v);
                    setEditProductLabel(l ?? '');
                  }}
                  fetchOptions={(s) => fetchVendorProductAdminOptions(editVendorId, s)}
                  placeholder="Search product…"
                  emptyOption={{ label: 'No product linked' }}
                  clearable
                />
              </div>
              <div>
                <Label>Caption</Label>
                <Input value={editCaption} onChange={(e) => setEditCaption(e.target.value)} maxLength={200} />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={editTagsStr} onChange={(e) => setEditTagsStr(e.target.value)} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <select
                    value={editUiStatus}
                    onChange={(e) => setEditUiStatus(e.target.value as NonNullable<Reel['status']>)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {deriveCategory(editProductLabel || editForm.product?.name || '')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Derived from product name</p>
                </div>
              </div>
            </div>
            {editErr ? <p className="text-sm text-destructive mt-2">{editErr}</p> : null}
            <div className="flex gap-2 mt-6">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="button" className="flex-1" disabled={saveEditMut.isPending} onClick={() => { void saveEdit(); }}>
                {saveEditMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog(null);
            setDeleteErr('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reel(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog
                ? `This cannot be undone. ${deleteDialog.summary} (IDs: ${deleteDialog.ids.map((i) => `#${i}`).join(', ')}).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteErr ? <p className="text-sm text-destructive px-1">{deleteErr}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReelMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReelMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteDialog) return;
                void deleteReelMut.mutateAsync(deleteDialog.ids);
              }}
            >
              {deleteReelMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={toggleDialog !== null} onOpenChange={(open) => { if (!open) setToggleDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleDialog?.nextUi === 'paused' ? 'Pause this reel?' : 'Activate this reel?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleDialog
                ? `Reel #${toggleDialog.id} — ${toggleDialog.productName}. This will set status to ${toggleDialog.nextUi === 'paused' ? 'paused' : 'active'} in the backend.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateReelStatusMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateReelStatusMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!toggleDialog) return;
                void updateReelStatusMut.mutateAsync({ id: toggleDialog.id, uiStatus: toggleDialog.nextUi });
              }}
            >
              {updateReelStatusMut.isPending ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDialog !== null} onOpenChange={(open) => { if (!open) setBulkDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDialog?.action === 'activate' ? 'Activate selected reels?' : 'Pause selected reels?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDialog && selectedRows.length > 0
                ? `This will update ${selectedRows.length} reel(s) to ${bulkDialog.action === 'activate' ? 'active' : 'paused'} in the backend.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkStatusMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkStatusMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!bulkDialog || selectedRows.length === 0) return;
                const uiStatus = bulkDialog.action === 'activate' ? 'active' : 'paused';
                void bulkStatusMut.mutateAsync({ ids: [...selectedRows], uiStatus });
              }}
            >
              {bulkStatusMut.isPending ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update reel status?</AlertDialogTitle>
            <AlertDialogDescription>
              You are changing this reel&apos;s moderation status. This will be saved on the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saveEditMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saveEditMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!editForm.id) return;
                void confirmEditSave();
              }}
            >
              {saveEditMut.isPending ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Boost Modal */}
      {boostReel && (
        <BoostModal
          isOpen={boostOpen}
          onClose={() => { setBoostOpen(false); setBoostReel(null); }}
          reelId={boostReel.id}
          reelName={boostReel.product?.name ?? 'Reel'}
          patchReel={(id, body) => adminApi.updateReel(id, body)}
          invalidateQueryKeys={[['admin', 'reels']]}
        />
      )}
    </div>
  );
};

export default AdminReelsModule;
