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

export default function AdminStockPurchasesModule() {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [tax, setTax] = useState('0');
  const [lines, setLines] = useState<LineRow[]>([{ product_id: '', quantity: '1', unit_cost: '' }]);

  const { data: vendorsPage } = useQuery({
    queryKey: ['admin', 'vendors', 'stock-purchases-picker'],
    queryFn: () => adminApi.vendors({ page_size: 500 }),
  });
  const vendors = useMemo(() => extractResults<Record<string, unknown>>(vendorsPage), [vendorsPage]);

  const { data: supPage } = useQuery({
    queryKey: ['admin', 'vendor-suppliers', vendorId],
    queryFn: () => adminApi.vendorSuppliers(vendorId, { page_size: 200 }),
    enabled: Boolean(vendorId),
  });
  const suppliers = useMemo(() => extractResults<Record<string, unknown>>(supPage), [supPage]);

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'products', 'stock-purchase-picker', vendorId],
    queryFn: () => adminApi.products({ page_size: 500, seller_id: vendorId }),
    enabled: Boolean(vendorId) && open,
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

  const { data: page } = useQuery({
    queryKey: ['admin', 'stock-purchases', vendorId, filter],
    queryFn: () =>
      adminApi.vendorStockPurchases(vendorId, {
        page_size: 100,
        ...(filter ? { status: filter } : {}),
      }),
    enabled: Boolean(vendorId),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  useEffect(() => {
    if (!open) {
      setSupplierId('');
      setTax('0');
      setLines([{ product_id: '', quantity: '1', unit_cost: '' }]);
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: () => {
      if (!vendorId) throw new Error('Choose a vendor');
      const parsedLines = lines
        .filter((l) => l.product_id.trim() && l.quantity.trim() && l.unit_cost.trim())
        .map((l) => ({
          product_id: Number(l.product_id),
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost),
        }));
      if (!supplierId) throw new Error('Choose a supplier');
      if (!parsedLines.length) throw new Error('Add at least one line with a product, qty, and unit cost');
      return adminApi.createVendorStockPurchase(vendorId, {
        supplier_id: Number(supplierId),
        tax: Number(tax) || 0,
        lines: parsedLines,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'stock-purchases', vendorId] });
      toast.success('Purchase draft created');
      setOpen(false);
      setLines([{ product_id: '', quantity: '1', unit_cost: '' }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postMut = useMutation({
    mutationFn: (id: string) => {
      if (!vendorId) throw new Error('Choose a vendor');
      return adminApi.postVendorStockPurchase(vendorId, id);
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
            <Button type="button" onClick={() => setOpen(true)}>
              New stock purchase
            </Button>
          </div>

          <AdminTable
          title="Stock purchases"
          subtitle="Receive inventory from suppliers (increases product stock when posted)"
          data={rows}
          columns={[
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
              key: 'id',
              label: '',
              render: (r) =>
                r.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={postMut.isPending}
                    onClick={() => postMut.mutate(String(r.id))}
                  >
                    Post
                  </Button>
                ) : null,
            },
          ]}
          />
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New draft purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
              <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                <div>
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
                    value={line.unit_cost}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, unit_cost: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
              </div>
            ))}
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
            <Button type="button" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
