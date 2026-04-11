import { useMemo, useState } from 'react';
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
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';

type LineRow = { product_id: string; quantity: string; unit_cost: string };

function formatLineTotal(qty: string, unitCost: string): string {
  if (!qty.trim() || !unitCost.trim()) return '—';
  const q = Number(qty);
  const u = Number(unitCost);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return '—';
  return `Rs. ${(q * u).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function VendorStockPurchasesModule() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [tax, setTax] = useState('0');
  const [lines, setLines] = useState<LineRow[]>([{ product_id: '', quantity: '1', unit_cost: '' }]);

  const { data: supPage } = useQuery({
    queryKey: ['vendor', 'suppliers', 'all'],
    queryFn: () => vendorApi.suppliers({ page_size: 200 }),
  });
  const suppliers = useMemo(() => extractResults<Record<string, unknown>>(supPage), [supPage]);

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor', 'products', 'stock-purchase-picker'],
    queryFn: () => vendorApi.products({ page_size: 500 }),
    enabled: open,
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
    queryKey: ['vendor', 'stock-purchases', filter],
    queryFn: () =>
      vendorApi.stockPurchases({
        page_size: 100,
        ...(filter ? { status: filter } : {}),
      }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const createMut = useMutation({
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
      return vendorApi.createStockPurchase({
        supplier_id: Number(supplierId),
        tax: Number(tax) || 0,
        lines: parsedLines,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'stock-purchases'] });
      toast.success('Purchase draft created');
      setOpen(false);
      setLines([{ product_id: '', quantity: '1', unit_cost: '' }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postMut = useMutation({
    mutationFn: (id: string) => vendorApi.postStockPurchase(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'stock-purchases'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'ledger'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'suppliers'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'supplier-ledger'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('Posted — stock updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
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
              <Label htmlFor="vsp-tax">Tax (optional)</Label>
              <Input id="vsp-tax" value={tax} onChange={(e) => setTax(e.target.value)} type="number" step="0.01" />
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
            <Button type="button" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
