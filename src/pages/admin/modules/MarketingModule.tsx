import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image, Clock, Ticket, MoreVertical, Edit, Trash2, Eye, Bell, X
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError, normalizeHexColor, resolveMediaUrl } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import type { AdminSearchOption } from '@/components/admin/AdminSearchCombobox';
import { fetchVendorAdminOptions, fetchCategoryAdminOptions } from '@/components/admin/adminRelationalPickers';

type BannerRow = {
  id: string;
  title: string;
  subtitle?: string;
  placement: string;
  image: string;
  clickUrl: string;
  startDate: string;
  endDate: string;
  status: string;
  clicks: number;
  gradient?: string;
  sortOrder?: number;
  cardVariant?: string;
  ctaText?: string;
  badgeText?: string;
};
type FlashProductPreview = { id: string; name: string; price: number; image_url?: string };
type FlashDealRow = {
  id: string;
  name: string;
  products: number;
  product_ids?: string[];
  products_preview?: FlashProductPreview[];
  products_preview_more?: number;
  discount: number;
  startDate: string;
  endDate: string;
  status: string;
  priority: number;
};
type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  used: number;
  limit: number;
  status: string;
  expires: string;
  vendor: string;
  category: string;
  vendor_id?: string;
  category_id?: string;
  products?: number;
  product_ids?: string[];
  products_preview?: FlashProductPreview[];
  products_preview_more?: number;
};
type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  read: boolean;
  created: string;
};

interface MarketingModuleProps {
  activeSection: string;
}

export default function MarketingModule({ activeSection }: MarketingModuleProps) {
  switch (activeSection) {
    case 'banners': return <BannersView />;
    case 'flash-deals': return <FlashDealsView />;
    case 'coupons': return <CouponsView />;
    case 'notifications': return <NotificationsView />;
    default: return <BannersView />;
  }
}

function BannersView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<BannerRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<BannerRow | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const { data: apiBanners, isLoading, isError } = useAdminList<BannerRow>(
    ['admin', 'banners'],
    () => adminApi.banners({ page_size: 200 }),
  );
  const bannersData = useMemo(() => apiBanners, [apiBanners]);
  const createMutation = useAdminMutation(adminApi.createBanner, [['admin', 'banners']]);
  const updateMutation = useAdminMutation(
    ({ id, payload }: { id: string; payload: FormData }) => adminApi.updateBanner(id, payload),
    [['admin', 'banners']],
  );
  const deleteMutation = useAdminMutation(adminApi.deleteBanner, [['admin', 'banners']]);

  const handleSave = async () => {
    if (!editItem) return;
    const isPromoStrip = editItem.placement === 'promo_strip';
    const isCreate = !editItem.id;
    if (isCreate && !isPromoStrip && !bannerImage) return;
    if (isCreate && isPromoStrip && !editItem.cardVariant?.trim()) return;

    const fd = new FormData();
    fd.append('title', editItem.title ?? '');
    fd.append('subtitle', editItem.subtitle ?? '');
    fd.append('placement', editItem.placement ?? 'homepage');
    fd.append('click_url', editItem.clickUrl ?? '');
    fd.append('start_date', editItem.startDate ?? '');
    fd.append('end_date', editItem.endDate ?? '');
    fd.append('status', editItem.status ?? 'active');
    fd.append('gradient', normalizeHexColor(editItem.gradient ?? ''));
    fd.append('sort_order', String(editItem.sortOrder ?? 0));
    if (isPromoStrip) {
      fd.append('card_variant', (editItem.cardVariant || 'teal_button').trim());
      fd.append('cta_text', editItem.ctaText ?? '');
      fd.append('badge_text', editItem.badgeText ?? '');
    } else {
      fd.append('card_variant', '');
      fd.append('cta_text', editItem.ctaText ?? '');
      fd.append('badge_text', editItem.badgeText ?? '');
    }
    if (bannerImage) fd.append('image', bannerImage);
    if (editItem.id) {
      await updateMutation.mutateAsync({ id: editItem.id, payload: fd });
    } else {
      await createMutation.mutateAsync(fd);
    }
    setModalOpen(false);
    setEditItem(null);
    setBannerImage(null);
  };

  const handleDelete = async () => {
    if (editItem) {
      await deleteMutation.mutateAsync(editItem.id);
    }
    setDeleteOpen(false);
    setEditItem(null);
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading banners…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load banners.</div>;

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="Banners" subtitle="Homepage & category banners with scheduling"
        data={bannersData}
        columns={[
          { key: 'title', label: 'Banner', render: (b) => (
            <div className="flex items-center gap-3">
              <div className="w-16 h-10 rounded bg-muted overflow-hidden flex items-center justify-center">
                {b.image ? (
                  <img src={resolveMediaUrl(b.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.placement}</p></div>
            </div>
          )},
          { key: 'clickUrl', label: 'Action URL' },
          { key: 'schedule', label: 'Schedule', render: (b) => <span className="text-xs">{b.startDate} → {b.endDate}</span> },
          { key: 'clicks', label: 'Clicks', render: (b) => <span className="font-medium">{b.clicks.toLocaleString()}</span> },
          { key: 'status', label: 'Status', render: (b) => (
            <Badge variant={b.status === 'active' ? 'default' : 'secondary'}
              className={cn("text-xs", b.status === 'active' && "bg-emerald-500")}>{b.status}</Badge>
          )},
          { key: 'actions', label: '', render: (b) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditItem({...b}); setBannerImage(null); setModalOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPreviewItem(b); setPreviewOpen(true); }}><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(b); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={() => {
          setEditItem({
            id: '',
            title: '',
            subtitle: '',
            placement: 'homepage',
            image: '',
            clickUrl: '',
            startDate: '',
            endDate: '',
            status: 'active',
            clicks: 0,
            gradient: '',
            sortOrder: 0,
            cardVariant: 'teal_button',
            ctaText: '',
            badgeText: '',
          });
          setBannerImage(null);
          setModalOpen(true);
        }} addLabel="Add Banner"
      />

      {/* Edit/Add Modal */}
      <CRUDModal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); setBannerImage(null); }} title={editItem?.id ? 'Edit Banner' : 'Add Banner'} onSave={handleSave}>
        <div className="space-y-4">
          <div><Label>Banner Title</Label><Input placeholder="Banner headline" value={editItem?.title ?? ''} onChange={e => editItem && setEditItem({...editItem, title: e.target.value})} /></div>
          <div><Label>Subtitle</Label><Input placeholder="Supporting line (hero & promo tiles)" value={editItem?.subtitle ?? ''} onChange={e => editItem && setEditItem({...editItem, subtitle: e.target.value})} /></div>
          <div><Label>Sort order</Label><Input type="number" placeholder="0" value={editItem?.sortOrder ?? 0} onChange={e => editItem && setEditItem({ ...editItem, sortOrder: Number(e.target.value) || 0 })} /></div>
          <div><Label>Placement</Label>
            <Select
              value={editItem?.placement || 'homepage'}
              onValueChange={(v) => {
                if (!editItem) return;
                const next = { ...editItem, placement: v };
                if (v === 'promo_strip' && !next.cardVariant?.trim()) {
                  next.cardVariant = 'teal_button';
                }
                setEditItem(next);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select placement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homepage">Homepage</SelectItem>
                <SelectItem value="category">Category Page</SelectItem>
                <SelectItem value="sidebar">Sidebar</SelectItem>
                <SelectItem value="promo_strip">Home promo strip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {editItem?.placement === 'promo_strip' ? (
            <>
              <div>
                <Label>Card variant</Label>
                <Select value={editItem.cardVariant || 'teal_button'} onValueChange={v => editItem && setEditItem({ ...editItem, cardVariant: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teal_button">Teal + pill CTA</SelectItem>
                    <SelectItem value="white_discount">White + discount badge + link</SelectItem>
                    <SelectItem value="white_link">White + underlined link</SelectItem>
                    <SelectItem value="magenta_button">Magenta + pill CTA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>CTA label</Label><Input placeholder="Order now, Shop now, See All…" value={editItem.ctaText ?? ''} onChange={e => editItem && setEditItem({ ...editItem, ctaText: e.target.value })} /></div>
              <div>
                <Label>Discount / badge line</Label>
                <Input placeholder="e.g. UPTO 80% OFF (white + discount card only)" value={editItem.badgeText ?? ''} onChange={e => editItem && setEditItem({ ...editItem, badgeText: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">No extra section title is shown—only this line in the bordered badge.</p>
              </div>
            </>
          ) : (
            <div>
              <Label>Hero / sidebar CTA label</Label>
              <Input placeholder="Shop now (default if empty)" value={editItem?.ctaText ?? ''} onChange={e => editItem && setEditItem({ ...editItem, ctaText: e.target.value })} />
            </div>
          )}
          <div>
            <Label>{editItem?.placement === 'promo_strip' ? 'Image (optional for promo strip)' : 'Banner Image'}</Label>
            <Input type="file" accept="image/*" onChange={e => setBannerImage(e.target.files?.[0] ?? null)} />
          </div>
          <div><Label>Click Action URL</Label><Input placeholder="/deals or full URL" value={editItem?.clickUrl ?? ''} onChange={e => editItem && setEditItem({...editItem, clickUrl: e.target.value})} /></div>
          <div>
            <Label>Gradient Color</Label>
            <div className="flex gap-2">
              <Input type="color" className="w-12 h-9 p-1" value={normalizeHexColor(editItem?.gradient || '#ffffff') || '#ffffff'} onChange={e => editItem && setEditItem({ ...editItem, gradient: e.target.value })} />
              <Input placeholder="#ffffff" value={editItem?.gradient ?? ''} onChange={(e) => editItem && setEditItem({ ...editItem, gradient: normalizeHexColor(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={editItem?.startDate ?? ''} onChange={e => editItem && setEditItem({...editItem, startDate: e.target.value})} /></div>
            <div><Label>End Date</Label><Input type="date" value={editItem?.endDate ?? ''} onChange={e => editItem && setEditItem({...editItem, endDate: e.target.value})} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(editItem?.status ?? 'active') === 'active'} onCheckedChange={(checked) => editItem && setEditItem({ ...editItem, status: checked ? 'active' : 'scheduled' })} /></div>
        </div>
      </CRUDModal>

      {/* Preview Modal */}
      <CRUDModal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Banner Preview" size="lg" onSave={() => setPreviewOpen(false)} saveLabel="Close">
        {previewItem && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-muted h-40 flex items-center justify-center border">
              {previewItem.image ? (
                <img src={resolveMediaUrl(previewItem.image)} alt={previewItem.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Image className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No image uploaded</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Title</p><p className="font-bold">{previewItem.title}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Subtitle</p><p className="font-bold text-sm">{previewItem.subtitle || '—'}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Placement</p><p className="font-bold capitalize">{previewItem.placement}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Sort order</p><p className="font-bold">{previewItem.sortOrder ?? 0}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Action URL</p><p className="font-bold break-all text-xs">{previewItem.clickUrl}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Clicks</p><p className="font-bold">{previewItem.clicks?.toLocaleString()}</p></div>
              {previewItem.placement === 'promo_strip' && (
                <>
                  <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Card variant</p><p className="font-bold text-xs">{previewItem.cardVariant || '—'}</p></div>
                  <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">CTA / badge</p><p className="font-bold text-xs">{previewItem.ctaText || '—'} / {previewItem.badgeText || '—'}</p></div>
                </>
              )}
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Schedule</p><p className="font-bold text-xs">{previewItem.startDate} → {previewItem.endDate}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={previewItem.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs mt-1", previewItem.status === 'active' && "bg-emerald-500")}>{previewItem.status}</Badge>
              </div>
            </div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirm open={deleteOpen} onClose={() => { setDeleteOpen(false); setEditItem(null); }} onConfirm={handleDelete} />
    </div>
  );
}

function isoToDatetimeLocal(iso: string) {
  if (!iso) return '';
  const s = iso.replace('Z', '');
  return s.length >= 16 ? s.slice(0, 16) : iso;
}

function FlashDealsView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<FlashDealRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlashDealRow | null>(null);
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState('');
  const [priority, setPriority] = useState('0');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productPick, setProductPick] = useState('');
  const [productSummaries, setProductSummaries] = useState<Record<string, FlashProductPreview>>({});
  const productSearchCache = useRef<Record<string, FlashProductPreview>>({});
  const [formError, setFormError] = useState('');
  const { data: flashDeals = [], isLoading, isError } = useAdminList<FlashDealRow>(
    ['admin', 'flash-deals'],
    () => adminApi.flashDeals({ page_size: 200 }),
  );
  const createMut = useAdminMutation(adminApi.createFlashDeal, [['admin', 'flash-deals']]);
  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateFlashDeal(id, payload),
    [['admin', 'flash-deals']],
  );
  const deleteMut = useAdminMutation(adminApi.deleteFlashDeal, [['admin', 'flash-deals']]);

  const fetchProductSearchOptions = useCallback(async (search: string): Promise<AdminSearchOption[]> => {
    const res = await adminApi.products({ search: search.trim() || undefined, page_size: 20 });
    const rows = (res.results || []) as Record<string, unknown>[];
    const opts: AdminSearchOption[] = [];
    for (const p of rows) {
      const id = String(p.id ?? '');
      if (!id) continue;
      const name = String(p.name ?? id);
      const price = Number(p.price ?? 0);
      const image_url = typeof p.image_url === 'string' ? p.image_url : '';
      productSearchCache.current[id] = { id, name, price, image_url };
      opts.push({
        value: id,
        label: name,
        description: `Rs. ${price.toLocaleString()}`,
      });
    }
    return opts;
  }, []);

  const openModal = (row: FlashDealRow | null) => {
    setFormError('');
    setEditItem(row);
    setProductPick('');
    if (row) {
      setName(row.name);
      setDiscount(String(row.discount));
      setPriority(String(row.priority));
      setStartLocal(isoToDatetimeLocal(row.startDate));
      setEndLocal(isoToDatetimeLocal(row.endDate));
      const ids = row.product_ids ?? [];
      setProductIds(ids);
      const sm: Record<string, FlashProductPreview> = {};
      for (const pr of row.products_preview || []) {
        sm[pr.id] = { id: pr.id, name: pr.name, price: pr.price, image_url: pr.image_url };
      }
      for (const id of ids) {
        if (!sm[id]) sm[id] = { id, name: `Product #${id}`, price: 0, image_url: '' };
      }
      setProductSummaries(sm);
    } else {
      setName('');
      setDiscount('');
      setPriority('1');
      setStartLocal('');
      setEndLocal('');
      setProductIds([]);
      setProductSummaries({});
    }
    setModalOpen(true);
  };

  const saveDeal = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!startLocal.trim() || !endLocal.trim()) {
      setFormError('Start and end date/time are required.');
      return;
    }
    const startMs = new Date(startLocal).getTime();
    const endMs = new Date(endLocal).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setFormError('Invalid start or end date/time.');
      return;
    }
    if (endMs <= startMs) {
      setFormError('End must be after start.');
      return;
    }
    const payload: Record<string, unknown> = {
      name: name.trim(),
      discount_percent: Number(discount) || 0,
      priority: Number(priority) || 0,
      start_at: new Date(startLocal).toISOString(),
      end_at: new Date(endLocal).toISOString(),
      product_ids: productIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n)),
    };
    try {
      if (editItem?.id) {
        await updateMut.mutateAsync({ id: editItem.id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setModalOpen(false);
      setEditItem(null);
    } catch (e) {
      setFormError(formatApiError(e));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading flash deals…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load flash deals.</div>;

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="Flash Deals" subtitle="Time-based promotions with auto enable/disable"
        data={flashDeals}
        columns={[
          { key: 'name', label: 'Deal', render: (d) => (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">{d.name}</span>
            </div>
          )},
          { key: 'products', label: 'Products', render: (d) => (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{d.products} item(s)</span>
              <div className="flex flex-wrap gap-1">
                {(d.products_preview || []).slice(0, 4).map((p) => (
                  <div key={p.id} className="w-8 h-8 rounded border overflow-hidden bg-muted shrink-0" title={p.name}>
                    {p.image_url ? (
                      <img src={resolveMediaUrl(p.image_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">—</div>
                    )}
                  </div>
                ))}
                {(d.products_preview_more ?? 0) > 0 ? (
                  <span className="text-[10px] text-muted-foreground self-center">+{d.products_preview_more}</span>
                ) : null}
              </div>
            </div>
          )},
          { key: 'discount', label: 'Discount', render: (d) => <span className="font-bold text-primary">{d.discount}% OFF</span> },
          { key: 'priority', label: 'Priority', render: (d) => <Badge variant="outline" className="text-xs">#{d.priority}</Badge> },
          { key: 'schedule', label: 'Schedule', render: (d) => (
            <div className="text-xs"><p>{d.startDate}</p><p className="text-muted-foreground">to {d.endDate}</p></div>
          )},
          { key: 'status', label: 'Status', render: (d) => (
            <Badge variant={d.status === 'active' ? 'default' : d.status === 'scheduled' ? 'secondary' : 'outline'}
              className={cn("text-xs", d.status === 'active' && "bg-emerald-500")}>{d.status}</Badge>
          )},
          { key: 'actions', label: '', render: (d) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openModal(d)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(d); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={() => openModal(null)} addLabel="Create Flash Deal"
      />
      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); setFormError(''); }}
        title={editItem ? 'Edit Flash Deal' : 'Create Flash Deal'}
        onSave={saveDeal}
        loading={createMut.isPending || updateMut.isPending}
        error={formError}
      >
        <div className="space-y-4">
          <div><Label>Deal Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend Flash Sale" /></div>
          <div><Label>Discount (%)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="25" /></div>
          <div><Label>Priority Rank</Label><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start</Label><Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} /></div>
          </div>
          <div>
            <Label>Add products</Label>
            <p className="text-xs text-muted-foreground mb-2">Search by name or SKU — results load from the server.</p>
            <AdminSearchCombobox
              key={`pick-${productIds.join(',')}`}
              value={productPick}
              queryKeyPrefix="flash-deal-product"
              placeholder="Search products…"
              fetchOptions={fetchProductSearchOptions}
              onChange={(value, label) => {
                if (!value || productIds.includes(value)) {
                  setProductPick('');
                  return;
                }
                const cached = productSearchCache.current[value];
                setProductIds((prev) => [...prev, value]);
                setProductSummaries((s) => ({
                  ...s,
                  [value]: cached || { id: value, name: label || `Product ${value}`, price: 0, image_url: '' },
                }));
                setProductPick('');
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {productIds.map((id) => {
                const s = productSummaries[id];
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md border bg-muted/40 text-xs max-w-[220px]"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0">
                      {s?.image_url ? (
                        <img src={resolveMediaUrl(s.image_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s?.name ?? id}</p>
                      <p className="text-muted-foreground">Rs. {(s?.price ?? 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Remove"
                      onClick={() => {
                        setProductIds((prev) => prev.filter((x) => x !== id));
                        setProductSummaries((prev) => {
                          const next = { ...prev };
                          delete next[id];
                          return next;
                        });
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CRUDModal>
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function CouponsView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<CouponRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);
  const [code, setCode] = useState('');
  const [ctype, setCtype] = useState('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [status, setStatus] = useState('active');
  const [expires, setExpires] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorLabel, setVendorLabel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [couponProductIds, setCouponProductIds] = useState<string[]>([]);
  const [couponProductPick, setCouponProductPick] = useState('');
  const [couponProductSummaries, setCouponProductSummaries] = useState<Record<string, FlashProductPreview>>({});
  const couponProductSearchCache = useRef<Record<string, FlashProductPreview>>({});
  const [formError, setFormError] = useState('');
  const { data: coupons = [], isLoading, isError } = useAdminList<CouponRow>(
    ['admin', 'coupons'],
    () => adminApi.coupons({ page_size: 200 }),
  );
  const createMut = useAdminMutation(adminApi.createCoupon, [['admin', 'coupons']]);
  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateCoupon(id, payload),
    [['admin', 'coupons']],
  );
  const deleteMut = useAdminMutation(adminApi.deleteCoupon, [['admin', 'coupons']]);

  const fetchCouponProductSearchOptions = useCallback(async (search: string): Promise<AdminSearchOption[]> => {
    const res = await adminApi.products({ search: search.trim() || undefined, page_size: 20 });
    const rows = (res.results || []) as Record<string, unknown>[];
    const opts: AdminSearchOption[] = [];
    for (const p of rows) {
      const id = String(p.id ?? '');
      if (!id) continue;
      const name = String(p.name ?? id);
      const price = Number(p.price ?? 0);
      const image_url = typeof p.image_url === 'string' ? p.image_url : '';
      couponProductSearchCache.current[id] = { id, name, price, image_url };
      opts.push({
        value: id,
        label: name,
        description: `Rs. ${price.toLocaleString()}`,
      });
    }
    return opts;
  }, []);

  const openCoupon = (c: CouponRow | null) => {
    setFormError('');
    setEditItem(c);
    if (c) {
      setCode(c.code);
      setCtype(c.type);
      setValue(String(c.value));
      setMinOrder(String(c.minOrder));
      setUsageLimit(c.limit != null ? String(c.limit) : '');
      setStatus(c.status);
      setExpires(c.expires ? c.expires.slice(0, 10) : '');
      setVendorId(c.vendor_id || '');
      setVendorLabel(c.vendor_id ? c.vendor : '');
      setCategoryId(c.category_id || '');
      setCategoryLabel(c.category_id ? c.category : '');
      const cpids = c.product_ids ?? [];
      setCouponProductIds(cpids);
      const csm: Record<string, FlashProductPreview> = {};
      for (const pr of c.products_preview || []) {
        csm[pr.id] = pr;
      }
      for (const id of cpids) {
        if (!csm[id]) csm[id] = { id, name: `Product #${id}`, price: 0, image_url: '' };
      }
      setCouponProductSummaries(csm);
    } else {
      setCode('');
      setCtype('percentage');
      setValue('');
      setMinOrder('0');
      setUsageLimit('');
      setStatus('active');
      setExpires('');
      setVendorId('');
      setVendorLabel('');
      setCategoryId('');
      setCategoryLabel('');
      setCouponProductIds([]);
      setCouponProductSummaries({});
    }
    setCouponProductPick('');
    setModalOpen(true);
  };

  const saveCoupon = async () => {
    setFormError('');
    if (!code.trim()) {
      setFormError('Code is required.');
      return;
    }
    const payload: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      type: ctype,
      value: Number(value) || 0,
      min_order: Number(minOrder) || 0,
      usage_limit: usageLimit === '' ? null : Number(usageLimit),
      status,
      expires_at: expires ? new Date(`${expires}T12:00:00`).toISOString() : null,
      vendor_id: vendorId || null,
      category_id: categoryId || null,
      product_ids: couponProductIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n)),
    };
    try {
      if (editItem?.id) {
        await updateMut.mutateAsync({ id: editItem.id, payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setModalOpen(false);
      setEditItem(null);
    } catch (e) {
      setFormError(formatApiError(e));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading coupons…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load coupons.</div>;

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="Coupons" subtitle="Vendor, category, and optional product whitelist"
        data={coupons}
        columns={[
          { key: 'code', label: 'Code', render: (c) => <span className="font-mono font-bold text-primary">{c.code}</span> },
          { key: 'type', label: 'Type', render: (c) => <Badge variant="outline" className="text-xs capitalize">{c.type}</Badge> },
          { key: 'value', label: 'Value', render: (c) => <span className="font-medium">{c.type === 'percentage' ? `${c.value}%` : `Rs. ${c.value}`}</span> },
          { key: 'minOrder', label: 'Min Order', render: (c) => `Rs. ${c.minOrder}` },
          { key: 'usage', label: 'Usage', render: (c) => `${c.used}/${c.limit ?? '∞'}` },
          {
            key: 'products',
            label: 'Products',
            render: (c) =>
              c.products && c.products > 0 ? (
                <span className="text-xs">{c.products} selected</span>
              ) : (
                <span className="text-xs text-muted-foreground">All in scope</span>
              ),
          },
          { key: 'vendor', label: 'Vendor' },
          { key: 'expires', label: 'Expires' },
          { key: 'status', label: 'Status', render: (c) => (
            <Badge variant={c.status === 'active' ? 'default' : 'secondary'}
              className={cn("text-xs", c.status === 'active' && "bg-emerald-500")}>{c.status}</Badge>
          )},
          { key: 'actions', label: '', render: (c) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openCoupon(c)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(c); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={() => openCoupon(null)} addLabel="Create Coupon"
      />
      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); setFormError(''); }}
        title={editItem ? 'Edit Coupon' : 'Create Coupon'}
        onSave={saveCoupon}
        loading={createMut.isPending || updateMut.isPending}
        error={formError}
      >
        <div className="space-y-4">
          <div><Label>Coupon Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER25" disabled={!!editItem} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Discount Type</Label>
              <Select value={ctype} onValueChange={setCtype}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Flat Amount</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="10" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Min Order (Rs.)</Label><Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="1000" /></div>
            <div><Label>Usage Limit</Label><Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="empty = unlimited" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor</Label>
              <AdminSearchCombobox
                queryKeyPrefix="coupon-vendor"
                value={vendorId}
                selectedLabel={vendorLabel}
                onChange={(v, l) => { setVendorId(v); setVendorLabel(l ?? ''); }}
                fetchOptions={fetchVendorAdminOptions}
                emptyOption={{ label: 'All vendors' }}
                placeholder="Search vendor…"
                clearable
              />
            </div>
            <div>
              <Label>Category</Label>
              <AdminSearchCombobox
                queryKeyPrefix="coupon-category"
                value={categoryId}
                selectedLabel={categoryLabel}
                onChange={(v, l) => { setCategoryId(v); setCategoryLabel(l ?? ''); }}
                fetchOptions={fetchCategoryAdminOptions}
                emptyOption={{ label: 'All categories' }}
                placeholder="Search category…"
                clearable
              />
            </div>
          </div>
          <div>
            <Label>Restrict to products (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Leave empty to use vendor/category only. If you add products, the coupon applies only to those SKUs
              (and still must match vendor/category).
            </p>
            <AdminSearchCombobox
              key={`coupon-pick-${couponProductIds.join(',')}`}
              value={couponProductPick}
              queryKeyPrefix="coupon-product"
              placeholder="Search products…"
              fetchOptions={fetchCouponProductSearchOptions}
              onChange={(value, label) => {
                if (!value || couponProductIds.includes(value)) {
                  setCouponProductPick('');
                  return;
                }
                const cached = couponProductSearchCache.current[value];
                setCouponProductIds((prev) => [...prev, value]);
                setCouponProductSummaries((s) => ({
                  ...s,
                  [value]: cached || { id: value, name: label || `Product ${value}`, price: 0, image_url: '' },
                }));
                setCouponProductPick('');
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {couponProductIds.map((id) => {
                const s = couponProductSummaries[id];
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md border bg-muted/40 text-xs max-w-[220px]"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0">
                      {s?.image_url ? (
                        <img src={resolveMediaUrl(s.image_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s?.name ?? id}</p>
                      <p className="text-muted-foreground">Rs. {(s?.price ?? 0).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Remove"
                      onClick={() => {
                        setCouponProductIds((prev) => prev.filter((x) => x !== id));
                        setCouponProductSummaries((prev) => {
                          const next = { ...prev };
                          delete next[id];
                          return next;
                        });
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Expiry Date</Label><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
        </div>
      </CRUDModal>
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMut.mutateAsync(deleteTarget.id);
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function NotificationsView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [formError, setFormError] = useState('');
  const { data: rawNotifications = [], isLoading, isError } = useAdminList<NotificationRow>(
    ['admin', 'notifications'],
    () => adminApi.notifications({ page_size: 200 }),
  );
  const notifications = rawNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target: n.target,
    created: n.created.slice(0, 19).replace('T', ' '),
    status: n.read ? 'read' : 'unread',
  }));
  const broadcastMut = useAdminMutation(adminApi.broadcastNotification, [['admin', 'notifications']]);
  const deleteMut = useAdminMutation(adminApi.deleteNotification, [['admin', 'notifications']]);

  const sendBroadcast = async () => {
    setFormError('');
    if (!title.trim() || !message.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    try {
      await broadcastMut.mutateAsync({ title: title.trim(), message: message.trim(), target, type: 'marketing' });
      setModalOpen(false);
      setTitle('');
      setMessage('');
      setTarget('all');
    } catch (e) {
      setFormError(formatApiError(e));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading notifications…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load notifications.</div>;

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="Push Notifications" subtitle="Send targeted notifications to users"
        data={notifications}
        columns={[
          { key: 'title', label: 'Title', render: (n) => (
            <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /><span className="font-medium">{n.title}</span></div>
          )},
          { key: 'message', label: 'Message' },
          { key: 'target', label: 'Target' },
          { key: 'created', label: 'Created' },
          { key: 'status', label: 'Read', render: (n) => (
            <Badge variant={n.status === 'read' ? 'secondary' : 'default'} className={cn("text-xs", n.status === 'unread' && "bg-sky-600")}>{n.status}</Badge>
          )},
          { key: 'actions', label: '', render: (n) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteId(n.id); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={() => { setFormError(''); setModalOpen(true); }} addLabel="Send Notification"
      />
      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFormError(''); }}
        title="Send Notification"
        onSave={sendBroadcast}
        loading={broadcastMut.isPending}
        error={formError}
      >
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" /></div>
          <div><Label>Message</Label><Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification body text..." /></div>
          <div><Label>Target Audience</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="vendors">Vendors Only</SelectItem>
                <SelectItem value="admins">Admins / Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Creates one in-app notification per recipient (capped server-side).</p>
        </div>
      </CRUDModal>
      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteId(null); }}
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleteId) return;
          await deleteMut.mutateAsync(deleteId);
          setDeleteOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
