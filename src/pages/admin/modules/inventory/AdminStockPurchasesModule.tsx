import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, extractResults } from '@/lib/api';
import { toast } from 'sonner';

type LineRow = { product_id: string; quantity: string; unit_cost: string };

const ALL_VENDORS_VALUE = '__all';

const STOCK_PURCHASES_PAGE_SIZE = 500;

/** Load every page from the admin “all vendors” list so the table is one combined view. */
async function fetchAllVendorsStockPurchasesPages(filter: string): Promise<Record<string, unknown>[]> {
  const baseParams = {
    page_size: STOCK_PURCHASES_PAGE_SIZE,
    ...(filter ? { status: filter } : {}),
  };
  const merged: Record<string, unknown>[] = [];
  let page = 1;
  for (;;) {
    const res = await adminApi.vendorStockPurchasesAll({ ...baseParams, page });
    merged.push(...extractResults<Record<string, unknown>>(res));
    if (!res.next) break;
    page += 1;
    if (page > 500) break;
  }
  return merged;
}

function rowPurchaseVendorId(row: Record<string, unknown>, listVendorId: string): string {
  if (listVendorId !== ALL_VENDORS_VALUE) return listVendorId;
  const v = row.vendor_id ?? row.vendorId;
  return v != null && String(v).trim() !== '' ? String(v) : '';
}

function formatLineTotal(qty: string, unitCost: string): string {
  if (!qty.trim() || !unitCost.trim()) return '—';
  const q = Number(qty);
  const u = Number(unitCost);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return '—';
  return `Rs. ${(q * u).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminStockPurchasesModule() {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState(ALL_VENDORS_VALUE);
  const [filter, setFilter] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [viewPurchase, setViewPurchase] = useState<{ vendorId: string; purchaseId: string } | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [tax, setTax] = useState('0');
  const [lines, setLines] = useState<LineRow[]>([{ product_id: '', quantity: '1', unit_cost: '' }]);

  const { data: vendorsPage } = useQuery({
    queryKey: ['admin', 'vendors', 'stock-purchases-picker'],
    queryFn: () => adminApi.vendors({ page_size: 500 }),
  });
  const vendors = useMemo(() => extractResults<Record<string, unknown>>(vendorsPage), [vendorsPage]);

  const vendorForScopedQueries =
    editId && editVendorId ? editVendorId : vendorId;

  const { data: supPage } = useQuery({
    queryKey: ['admin', 'vendor-suppliers', vendorForScopedQueries],
    queryFn: () => adminApi.vendorSuppliers(vendorForScopedQueries, { page_size: 200 }),
    enabled: Boolean(vendorForScopedQueries) && vendorForScopedQueries !== ALL_VENDORS_VALUE,
  });
  const suppliers = useMemo(() => extractResults<Record<string, unknown>>(supPage), [supPage]);

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'products', 'stock-purchase-picker', vendorForScopedQueries],
    queryFn: () => adminApi.products({ page_size: 500, seller_id: vendorForScopedQueries }),
    enabled:
      Boolean(vendorForScopedQueries) &&
      vendorForScopedQueries !== ALL_VENDORS_VALUE &&
      open,
  });
  const vendorProducts = useMemo(
    () => extractResults<Record<string, unknown>>(productsPage),
    [productsPage],
  );

  const unitCostForProduct = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of vendorProducts) {
      const raw = Number(p.price ?? 0);
      if (!Number.isFinite(raw)) continue;
      m.set(String(p.id), raw.toFixed(2));
    }
    return m;
  }, [vendorProducts]);

  const draftTotals = useMemo(() => {
    let sub = 0;
    for (const l of lines) {
      if (!l.quantity.trim() || !l.unit_cost.trim()) continue;
      const q = Number(l.quantity);
      const u = Number(l.unit_cost);
      if (Number.isFinite(q) && Number.isFinite(u)) sub += q * u;
    }
    const taxAmt = Number(tax) || 0;
    return { subtotal: sub, tax: taxAmt, total: sub + taxAmt };
  }, [lines, tax]);

  const { data: page } = useQuery({
    queryKey: ['admin', 'stock-purchases', vendorId, filter],
    queryFn: async () => {
      const params = {
        page_size: vendorId === ALL_VENDORS_VALUE ? STOCK_PURCHASES_PAGE_SIZE : 100,
        ...(filter ? { status: filter } : {}),
      };
      if (vendorId === ALL_VENDORS_VALUE) {
        return fetchAllVendorsStockPurchasesPages(filter);
      }
      return adminApi.vendorStockPurchases(vendorId, params);
    },
    enabled: Boolean(vendorId),
  });
  const rows = useMemo(() => {
    const raw = extractResults<Record<string, unknown>>(page);
    if (vendorId !== ALL_VENDORS_VALUE) return raw;
    return raw.map((r) => ({
      ...r,
      _allVendorsSearchText: [r.vendor_name, r.reference, r.supplier_name]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' '),
    }));
  }, [page, vendorId]);

  const activeDetailTarget = editId && editVendorId
    ? {
        vendorId: editVendorId,
        purchaseId: editId,
      }
    : viewPurchase;

  const { data: activeDetail } = useQuery({
    queryKey: ['admin', 'stock-purchase-detail', activeDetailTarget?.vendorId, activeDetailTarget?.purchaseId],
    queryFn: () =>
      adminApi.vendorStockPurchaseDetail(activeDetailTarget!.vendorId, activeDetailTarget!.purchaseId),
    enabled: Boolean(activeDetailTarget?.vendorId && activeDetailTarget?.purchaseId),
  });

  useEffect(() => {
    if (!open) {
      setEditId(null);
      setEditVendorId(null);
      setSupplierId('');
      setTax('0');
      setLines([{ product_id: '', quantity: '1', unit_cost: '' }]);
    }
  }, [open]);

  useEffect(() => {
    setSupplierId('');
  }, [vendorId]);

  useEffect(() => {
    if (!open || !editId || !activeDetail) return;
    setSupplierId(String(activeDetail.supplier_id ?? ''));
    setTax(String(activeDetail.tax ?? '0'));
    const nextLines = Array.isArray(activeDetail.lines)
      ? (activeDetail.lines as Record<string, unknown>[]).map((line) => ({
          product_id: String(line.product_id ?? ''),
          quantity: String(line.quantity ?? ''),
          unit_cost: String(line.unit_cost ?? ''),
        }))
      : [];
    setLines(nextLines.length ? nextLines : [{ product_id: '', quantity: '1', unit_cost: '' }]);
  }, [open, editId, activeDetail]);

  const saveMut = useMutation({
    mutationFn: () => {
      const parsedLines = lines
        .filter((l) => l.product_id.trim() && l.quantity.trim() && l.unit_cost.trim())
        .map((l) => ({
          product_id: Number(l.product_id),
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost),
        }));
      if (!supplierId) throw new Error('Choose a supplier');
      if (!parsedLines.length) throw new Error('Add at least one line with a product, qty, and unit cost');
      const payload = {
        supplier_id: Number(supplierId),
        tax: Number(tax) || 0,
        lines: parsedLines,
      };
      if (editId) {
        const targetVendorId = editVendorId;
        if (!targetVendorId || targetVendorId === ALL_VENDORS_VALUE) {
          throw new Error('Missing vendor for this purchase');
        }
        return adminApi.updateVendorStockPurchase(targetVendorId, editId, payload);
      }
      if (!vendorId || vendorId === ALL_VENDORS_VALUE) throw new Error('Choose a vendor');
      return adminApi.createVendorStockPurchase(vendorId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchases'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchase-detail'] });
      toast.success(editId ? 'Purchase draft updated' : 'Purchase draft created');
      setOpen(false);
      setEditId(null);
      setEditVendorId(null);
      setLines([{ product_id: '', quantity: '1', unit_cost: '' }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ purchaseId, purchaseVendorId }: { purchaseId: string; purchaseVendorId: string }) =>
      adminApi.deleteVendorStockPurchase(purchaseVendorId, purchaseId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchases'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchase-detail'] });
      toast.success('Purchase draft deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postMut = useMutation({
    mutationFn: ({ purchaseId, purchaseVendorId }: { purchaseId: string; purchaseVendorId?: string }) => {
      const resolvedVendorId =
        purchaseVendorId && purchaseVendorId !== ALL_VENDORS_VALUE ? purchaseVendorId : vendorId;
      if (!resolvedVendorId || resolvedVendorId === ALL_VENDORS_VALUE) throw new Error('Choose a vendor');
      return adminApi.postVendorStockPurchase(resolvedVendorId, purchaseId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchases'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-suppliers', vendorId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'ledger-transactions'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-ledger', vendorId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-supplier-ledger', vendorId] });
      toast.success('Posted — stock updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground shrink-0">Vendor</span>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger className="w-[min(100vw-3rem,280px)]">
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VENDORS_VALUE}>All</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={String(v.id)} value={String(v.id)}>
                {String(v.name ?? '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!vendorId ? (
        <p className="text-sm text-muted-foreground">Select a vendor to view and manage stock purchases.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select value={filter || '__all'} onValueChange={(v) => setFilter(v === '__all' ? '' : v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditId(null);
                setEditVendorId(null);
                setOpen(true);
              }}
            >
              New stock purchase
            </Button>
          </div>

          <AdminTable
          title="Stock purchases"
          subtitle="Receive inventory from suppliers (increases product stock when posted)"
          data={rows}
          searchKey={vendorId === ALL_VENDORS_VALUE ? '_allVendorsSearchText' : 'reference'}
          searchPlaceholder={
            vendorId === ALL_VENDORS_VALUE ? 'Search vendor, reference, supplier…' : 'Search by reference…'
          }
          columns={[
            ...(vendorId === ALL_VENDORS_VALUE ? [{ key: 'vendor_name', label: 'Vendor' }] : []),
            { key: 'reference', label: 'Reference' },
            { key: 'supplier_name', label: 'Supplier' },
            {
              key: 'status',
              label: 'Status',
              render: (r) =>
                r.status === 'posted' ? (
                  <Badge variant="default">Posted</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                ),
            },
            {
              key: 'total',
              label: 'Total',
              render: (r) => `Rs. ${Number(r.total ?? 0).toLocaleString()}`,
            },
            { key: 'created_at', label: 'Created' },
            {
              key: 'actions',
              label: 'Action',
              render: (r) => {
                const purchaseId = String(r.id ?? '');
                const purchaseVendorId = rowPurchaseVendorId(r, vendorId);
                const canEdit = r.status === 'draft';
                return (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!purchaseId || !purchaseVendorId}
                      onClick={() => setViewPurchase({ vendorId: purchaseVendorId, purchaseId })}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canEdit || !purchaseId || !purchaseVendorId}
                      onClick={() => {
                        setViewPurchase(null);
                        setEditVendorId(purchaseVendorId);
                        setEditId(purchaseId);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={!canEdit || !purchaseId || !purchaseVendorId || deleteMut.isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete draft purchase "${String(r.reference ?? '')}"?`)) return;
                        deleteMut.mutate({ purchaseId, purchaseVendorId });
                      }}
                    >
                      Delete
                    </Button>
                    {canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={postMut.isPending || !purchaseId || !purchaseVendorId}
                        onClick={() =>
                          postMut.mutate({
                            purchaseId,
                            purchaseVendorId,
                          })
                        }
                      >
                        Post
                      </Button>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
          />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit draft purchase' : 'New draft purchase'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vendor</Label>
              <Select
                value={editId ? (editVendorId ?? ALL_VENDORS_VALUE) : vendorId}
                disabled={Boolean(editId)}
                onValueChange={(v) => {
                  if (editId) setEditVendorId(v);
                  else setVendorId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VENDORS_VALUE}>Select vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={String(v.id)} value={String(v.id)}>
                      {String(v.name ?? '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      {String(s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="asp-tax">Tax (optional)</Label>
              <Input id="asp-tax" value={tax} onChange={(e) => setTax(e.target.value)} type="number" step="0.01" />
            </div>
            <p className="text-sm text-muted-foreground">
              Lines: choose one of your products, quantity, and unit cost.
            </p>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <Label>Product</Label>
                  <Select
                    value={line.product_id ? line.product_id : '__none'}
                    onValueChange={(v) => {
                      const next = [...lines];
                      const pid = v === '__none' ? '' : v;
                      const uc = pid ? unitCostForProduct.get(pid) ?? '' : '';
                      next[idx] = {
                        ...line,
                        product_id: pid,
                        ...(uc !== '' ? { unit_cost: uc } : {}),
                      };
                      setLines(next);
                    }}
                    disabled={productsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={productsLoading ? 'Loading products…' : 'Select product'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select product</SelectItem>
                      {vendorProducts.map((p) => (
                        <SelectItem key={String(p.id)} value={String(p.id)}>
                          {String(p.id)} — {String(p.name ?? '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, quantity: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                <div>
                  <Label>Unit cost</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_cost}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, unit_cost: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label>Line total</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm tabular-nums">
                    {formatLineTotal(line.quantity, line.unit_cost)}
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">
                  Rs.{' '}
                  {draftTotals.subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">
                  Rs.{' '}
                  {draftTotals.tax.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1.5 font-medium">
                <span>Estimated total</span>
                <span className="tabular-nums">
                  Rs.{' '}
                  {draftTotals.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines([...lines, { product_id: '', quantity: '1', unit_cost: '' }])}
            >
              Add line
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                saveMut.isPending ||
                (editId
                  ? !editVendorId || editVendorId === ALL_VENDORS_VALUE
                  : !vendorId || vendorId === ALL_VENDORS_VALUE)
              }
              onClick={() => saveMut.mutate()}
            >
              {editId ? 'Save changes' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewPurchase)} onOpenChange={(v) => !v && setViewPurchase(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Stock purchase {String(activeDetail?.reference ?? viewPurchase?.purchaseId ?? '')}
            </DialogTitle>
          </DialogHeader>
          {!activeDetail ? (
            <p className="text-sm text-muted-foreground">Loading purchase details...</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> {String(activeDetail.supplier_name ?? '')}</div>
                <div><span className="text-muted-foreground">Status:</span> {String(activeDetail.status ?? '')}</div>
                <div><span className="text-muted-foreground">Subtotal:</span> Rs. {Number(activeDetail.subtotal ?? 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Tax:</span> Rs. {Number(activeDetail.tax ?? 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Total:</span> Rs. {Number(activeDetail.total ?? 0).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Created:</span> {String(activeDetail.created_at ?? '').slice(0, 19).replace('T', ' ')}</div>
              </div>
              <AdminTable
                title="Purchase lines"
                subtitle="Products in this stock purchase"
                data={Array.isArray(activeDetail.lines) ? (activeDetail.lines as Record<string, unknown>[]) : []}
                columns={[
                  { key: 'product_name', label: 'Product' },
                  { key: 'sku', label: 'SKU' },
                  { key: 'quantity', label: 'Qty' },
                  { key: 'unit_cost', label: 'Unit cost', render: (r) => `Rs. ${Number(r.unit_cost ?? 0).toLocaleString()}` },
                  { key: 'line_total', label: 'Line total', render: (r) => `Rs. ${Number(r.line_total ?? 0).toLocaleString()}` },
                ]}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
