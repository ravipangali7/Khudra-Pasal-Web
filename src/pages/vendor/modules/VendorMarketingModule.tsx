import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';

function isoToDatetimeLocal(iso: string) {
  if (!iso) return '';
  const s = iso.replace('Z', '');
  return s.length >= 16 ? s.slice(0, 16) : iso;
}

function datetimeLocalToIso(local: string) {
  if (!local) return '';
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export default function VendorMarketingModule({ activeSection }: { activeSection: string }) {
  const qc = useQueryClient();
  const isFlash = activeSection === 'flash-deals';

  const { data: couponPage } = useQuery({
    queryKey: ['vendor', 'coupons'],
    queryFn: () => vendorApi.coupons({ page_size: 100 }),
    enabled: !isFlash,
  });
  const coupons = useMemo(() => extractResults<Record<string, unknown>>(couponPage), [couponPage]);

  const { data: dealPage } = useQuery({
    queryKey: ['vendor', 'flash-deals'],
    queryFn: () => vendorApi.flashDeals({ page_size: 100 }),
    enabled: isFlash,
  });
  const deals = useMemo(() => extractResults<Record<string, unknown>>(dealPage), [dealPage]);
  const { data: productPage } = useQuery({
    queryKey: ['vendor', 'products', 'flash'],
    queryFn: () => vendorApi.products({ page_size: 200, status: 'active' }),
    enabled: isFlash,
  });
  const products = useMemo(() => extractResults<Record<string, unknown>>(productPage), [productPage]);

  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState('');
  const [ctype, setCtype] = useState('percentage');
  const [cvalue, setCvalue] = useState('');
  const [expires, setExpires] = useState('');
  const [couponDeleteId, setCouponDeleteId] = useState<string | null>(null);

  const createCoupon = useMutation({
    mutationFn: () =>
      vendorApi.createCoupon({
        code,
        type: ctype,
        value: Number(cvalue),
        expires_at: expires || null,
        status: 'active',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'coupons'] });
      toast.success('Coupon created');
      setCouponOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: string) => vendorApi.deleteCoupon(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'coupons'] });
      toast.success('Coupon deleted');
      setCouponDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [dealId, setDealId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const attachMut = useMutation({
    mutationFn: () => vendorApi.flashDealAddProducts(dealId, selectedProducts),
    onSuccess: (r) => {
      toast.success(`Added ${r.added} product(s)`);
      setSelectedProducts([]);
      void qc.invalidateQueries({ queryKey: ['vendor', 'flash-deals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [flashCreateOpen, setFlashCreateOpen] = useState(false);
  const [flashEditOpen, setFlashEditOpen] = useState(false);
  const [flashDeleteId, setFlashDeleteId] = useState<string | null>(null);
  const [fdName, setFdName] = useState('');
  const [fdDiscount, setFdDiscount] = useState('');
  const [fdPriority, setFdPriority] = useState('0');
  const [fdStart, setFdStart] = useState('');
  const [fdEnd, setFdEnd] = useState('');
  const [fdEditId, setFdEditId] = useState<string | null>(null);
  const [fdCreateProducts, setFdCreateProducts] = useState<string[]>([]);
  const [fdEditProducts, setFdEditProducts] = useState<string[]>([]);

  const createFlashMut = useMutation({
    mutationFn: () =>
      vendorApi.createFlashDeal({
        name: fdName.trim(),
        discount_percent: Number(fdDiscount),
        start_at: datetimeLocalToIso(fdStart),
        end_at: datetimeLocalToIso(fdEnd),
        priority: Number(fdPriority) || 0,
        product_ids: fdCreateProducts.map((x) => Number(x)),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'flash-deals'] });
      toast.success('Flash deal created');
      setFlashCreateOpen(false);
      setFdName('');
      setFdDiscount('');
      setFdPriority('0');
      setFdStart('');
      setFdEnd('');
      setFdCreateProducts([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFlashMut = useMutation({
    mutationFn: () =>
      vendorApi.updateFlashDeal(fdEditId!, {
        name: fdName.trim(),
        discount_percent: Number(fdDiscount),
        start_at: datetimeLocalToIso(fdStart),
        end_at: datetimeLocalToIso(fdEnd),
        priority: Number(fdPriority) || 0,
        product_ids: fdEditProducts.map((x) => Number(x)),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'flash-deals'] });
      toast.success('Flash deal updated');
      setFlashEditOpen(false);
      setFdEditId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFlashMut = useMutation({
    mutationFn: (id: string) => vendorApi.deleteFlashDeal(id),
    onSuccess: (_d, deletedId) => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'flash-deals'] });
      toast.success('Flash deal deleted');
      setFlashDeleteId(null);
      setDealId((cur) => (cur === deletedId ? '' : cur));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openFlashCreate = () => {
    setFdName('');
    setFdDiscount('');
    setFdPriority('0');
    setFdStart('');
    setFdEnd('');
    setFdCreateProducts([]);
    setFlashCreateOpen(true);
  };

  const openFlashEdit = (d: Record<string, unknown>) => {
    setFdEditId(String(d.id));
    setFdName(String(d.name ?? ''));
    setFdDiscount(String(d.discount_percent ?? ''));
    setFdPriority(String(d.priority ?? '0'));
    setFdStart(isoToDatetimeLocal(String(d.start_at ?? '')));
    setFdEnd(isoToDatetimeLocal(String(d.end_at ?? '')));
    const pids = d.product_ids;
    setFdEditProducts(Array.isArray(pids) ? pids.map(String) : []);
    setFlashEditOpen(true);
  };

  if (isFlash) {
    return (
      <div className="p-4 lg:p-6 space-y-8">
        <AdminTable
          title="Flash deals"
          subtitle="Your deals and platform deals that include your products"
          data={deals}
          onAdd={openFlashCreate}
          addLabel="New flash deal"
          columns={[
            { key: 'id', label: 'ID', render: (d) => <span className="font-mono text-xs">{String(d.id)}</span> },
            { key: 'name', label: 'Deal' },
            {
              key: 'discount_percent',
              label: 'Discount %',
              render: (d) => `${String(d.discount_percent)}%`,
            },
            {
              key: 'product_count',
              label: 'Products',
              render: (d) => String(d.product_count ?? 0),
            },
            {
              key: 'owner',
              label: '',
              render: (d) =>
                d.is_owner ? (
                  <Badge variant="secondary" className="text-xs">
                    Yours
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Platform</span>
                ),
            },
            { key: 'status', label: 'Status', render: (d) => <Badge className="text-xs">{String(d.status)}</Badge> },
            { key: 'end_at', label: 'Ends', render: (d) => String(d.end_at ?? '').slice(0, 16) },
            {
              key: 'actions',
              label: '',
              render: (d) =>
                d.is_owner ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openFlashEdit(d)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setFlashDeleteId(String(d.id))}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null,
            },
          ]}
        />
        <div className="max-w-xl space-y-4 border rounded-lg p-4">
          <Label>Attach products to a deal</Label>
          <Select value={dealId} onValueChange={setDealId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a deal" />
            </SelectTrigger>
            <SelectContent>
              {deals.map((d) => (
                <SelectItem key={String(d.id)} value={String(d.id)}>
                  {String(d.name)} (#{String(d.id)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Your active products</Label>
          <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
            {products.map((p) => (
              <label key={String(p.id)} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(String(p.id))}
                  onChange={(ev) => {
                    const id = String(p.id);
                    setSelectedProducts((prev) =>
                      ev.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                    );
                  }}
                />
                {String(p.name)}
              </label>
            ))}
          </div>
          <Button
            onClick={() => attachMut.mutate()}
            disabled={!dealId || selectedProducts.length === 0 || attachMut.isPending}
          >
            Add to deal
          </Button>
        </div>

        <CRUDModal
          open={flashCreateOpen}
          onClose={() => setFlashCreateOpen(false)}
          title="New flash deal"
          onSave={() => createFlashMut.mutate()}
          loading={createFlashMut.isPending}
          saveLabel="Create"
        >
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={fdName} onChange={(e) => setFdName(e.target.value)} />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input type="number" value={fdDiscount} onChange={(e) => setFdDiscount(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" value={fdPriority} onChange={(e) => setFdPriority(e.target.value)} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={fdStart} onChange={(e) => setFdStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={fdEnd} onChange={(e) => setFdEnd(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Products (optional)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {products.map((p) => (
                  <label key={String(p.id)} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fdCreateProducts.includes(String(p.id))}
                      onChange={(ev) => {
                        const id = String(p.id);
                        setFdCreateProducts((prev) =>
                          ev.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                        );
                      }}
                    />
                    {String(p.name)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CRUDModal>

        <CRUDModal
          open={flashEditOpen}
          onClose={() => {
            setFlashEditOpen(false);
            setFdEditId(null);
          }}
          title="Edit flash deal"
          onSave={() => updateFlashMut.mutate()}
          loading={updateFlashMut.isPending}
          saveLabel="Save"
        >
          <p className="text-xs text-muted-foreground mb-2">
            Saving replaces product membership with the selection below (your products only).
          </p>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={fdName} onChange={(e) => setFdName(e.target.value)} />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input type="number" value={fdDiscount} onChange={(e) => setFdDiscount(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <Input type="number" value={fdPriority} onChange={(e) => setFdPriority(e.target.value)} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={fdStart} onChange={(e) => setFdStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={fdEnd} onChange={(e) => setFdEnd(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Products on this deal</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {products.map((p) => (
                  <label key={String(p.id)} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={fdEditProducts.includes(String(p.id))}
                      onChange={(ev) => {
                        const id = String(p.id);
                        setFdEditProducts((prev) =>
                          ev.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
                        );
                      }}
                    />
                    {String(p.name)}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CRUDModal>

        <DeleteConfirm
          open={Boolean(flashDeleteId)}
          onClose={() => setFlashDeleteId(null)}
          onConfirm={() => flashDeleteId && deleteFlashMut.mutate(flashDeleteId)}
          title="Delete flash deal?"
          description="This removes your flash deal and its product links."
          loading={deleteFlashMut.isPending}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title="Coupons"
        data={coupons}
        onAdd={() => setCouponOpen(true)}
        addLabel="Create coupon"
        columns={[
          { key: 'code', label: 'Code', render: (c) => <span className="font-mono font-bold">{String(c.code)}</span> },
          { key: 'type', label: 'Type' },
          { key: 'value', label: 'Value', render: (c) => String(c.value) },
          {
            key: 'usage',
            label: 'Usage',
            render: (c) => `${String(c.used_count ?? 0)} / ${c.usage_limit != null ? String(c.usage_limit) : '∞'}`,
          },
          { key: 'status', label: 'Status' },
          {
            key: 'actions',
            label: '',
            render: (c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setCouponDeleteId(String(c.id))}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />
      <CRUDModal open={couponOpen} onClose={() => setCouponOpen(false)} title="New coupon" onSave={() => createCoupon.mutate()}>
        <div className="space-y-3">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={ctype} onValueChange={setCtype}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input type="number" value={cvalue} onChange={(e) => setCvalue(e.target.value)} />
          </div>
          <div>
            <Label>Expires at (ISO optional)</Label>
            <Input value={expires} onChange={(e) => setExpires(e.target.value)} placeholder="2026-12-31T23:59:59" />
          </div>
        </div>
      </CRUDModal>
      <DeleteConfirm
        open={Boolean(couponDeleteId)}
        onClose={() => setCouponDeleteId(null)}
        onConfirm={() => couponDeleteId && deleteCoupon.mutate(couponDeleteId)}
        title="Delete coupon?"
        description="Customers will no longer be able to use this coupon."
        loading={deleteCoupon.isPending}
      />
    </div>
  );
}
