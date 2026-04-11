import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, extractResults } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

function entryLabel(t: string) {
  const m: Record<string, string> = {
    sale_settlement: 'Sale settlement',
    sale_reversal: 'Sale reversal',
    purchase_cost: 'Stock purchase',
    adjustment: 'Adjustment',
  };
  return m[t] ?? t.replace(/_/g, ' ');
}

function money(n: number) {
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminLedgerModule() {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [entryType, setEntryType] = useState<string>('');
  const [supplierViewId, setSupplierViewId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjDirection, setAdjDirection] = useState<'credit' | 'debit'>('credit');

  const { data: vendorsPage } = useQuery({
    queryKey: ['admin', 'vendors', 'ledger-picker'],
    queryFn: () => adminApi.vendors({ page_size: 500 }),
  });
  const vendors = useMemo(() => extractResults<Record<string, unknown>>(vendorsPage), [vendorsPage]);

  const { data: supPage } = useQuery({
    queryKey: ['admin', 'vendor-suppliers', vendorId, 'ledger-list'],
    queryFn: () => adminApi.vendorSuppliers(vendorId, { page_size: 200 }),
    enabled: Boolean(vendorId),
  });
  const suppliers = useMemo(() => extractResults<Record<string, unknown>>(supPage), [supPage]);

  const { data: page } = useQuery({
    queryKey: ['admin', 'vendor-ledger', vendorId, entryType],
    queryFn: () =>
      adminApi.vendorLedgerEntries(vendorId, {
        page_size: 100,
        ...(entryType ? { entry_type: entryType } : {}),
      }),
    enabled: Boolean(vendorId),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const ledgerTypeFilterOptions = useMemo(() => {
    const types = new Set<string>(['sale_settlement', 'sale_reversal', 'purchase_cost', 'adjustment']);
    for (const r of rows) {
      const t = String(r.entry_type ?? '');
      if (t) types.add(t);
    }
    return [...types].sort().map((value) => ({ value, label: entryLabel(value) }));
  }, [rows]);

  const { data: supplierLedger } = useQuery({
    queryKey: ['admin', 'vendor-supplier-ledger', vendorId, supplierViewId],
    queryFn: () => adminApi.vendorSupplierLedgerAdmin(vendorId, supplierViewId!),
    enabled: Boolean(vendorId && supplierViewId),
  });

  const addLedgerMut = useMutation({
    mutationFn: () => {
      if (!vendorId) throw new Error('Choose a vendor');
      const n = Number(adjAmount);
      if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid positive amount');
      const desc = adjDescription.trim();
      if (!desc) throw new Error('Description is required');
      return adminApi.createAdminVendorLedgerEntry(vendorId, {
        amount: n,
        description: desc,
        direction: adjDirection,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-ledger', vendorId] });
      toast.success('Ledger entry added');
      setAddOpen(false);
      setAdjAmount('');
      setAdjDescription('');
      setAdjDirection('credit');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-muted-foreground">Vendor</span>
        <Select value={vendorId} onValueChange={(v) => { setVendorId(v); setSupplierViewId(null); }}>
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
        <p className="text-sm text-muted-foreground">Select a vendor to view supplier and store ledger (same data as vendor portal).</p>
      ) : (
        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">Supplier accounts</TabsTrigger>
            <TabsTrigger value="store">Store ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
            {!supplierViewId ? (
              <AdminTable
                title="Suppliers"
                subtitle="Posted stock purchases per supplier — debit / credit and balance (amount payable)"
                data={suppliers}
                columns={[
                  { key: 'name', label: 'Supplier' },
                  { key: 'phone', label: 'Phone' },
                  {
                    key: 'ledger_debit',
                    label: 'Debit',
                    render: (r) => money(Number(r.ledger_debit ?? 0)),
                  },
                  {
                    key: 'ledger_credit',
                    label: 'Credit',
                    render: (r) => money(Number(r.ledger_credit ?? 0)),
                  },
                  {
                    key: 'ledger_balance',
                    label: 'Balance',
                    render: (r) => (
                      <span className="font-medium">{money(Number(r.ledger_balance ?? 0))}</span>
                    ),
                  },
                  {
                    key: 'id',
                    label: '',
                    render: (r) => (
                      <Button type="button" size="sm" variant="outline" onClick={() => setSupplierViewId(String(r.id))}>
                        Ledger
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSupplierViewId(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    All suppliers
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {supplierLedger?.supplier?.name ?? 'Supplier ledger'}
                  </h2>
                </div>
                <AdminTable
                  title="Posted purchases"
                  subtitle="Each row is a posted stock purchase. Payments to suppliers are not tracked yet (debit column)."
                  data={(supplierLedger?.rows ?? []) as Record<string, unknown>[]}
                  columns={[
                    {
                      key: 'date',
                      label: 'Date',
                      render: (r) => String(r.date ?? '').slice(0, 19).replace('T', ' '),
                    },
                    { key: 'reference', label: 'Reference' },
                    { key: 'description', label: 'Description' },
                    {
                      key: 'debit',
                      label: 'Debit',
                      render: (r) => money(Number(r.debit ?? 0)),
                    },
                    {
                      key: 'credit',
                      label: 'Credit',
                      render: (r) => (
                        <span className="text-emerald-600">{money(Number(r.credit ?? 0))}</span>
                      ),
                    },
                    {
                      key: 'balance',
                      label: 'Balance',
                      render: (r) => <span className="font-medium">{money(Number(r.balance ?? 0))}</span>,
                    },
                  ]}
                />
                {supplierLedger?.totals ? (
                  <p className="text-sm text-muted-foreground">
                    Totals — Debit: {money(supplierLedger.totals.debit)}, Credit:{' '}
                    {money(supplierLedger.totals.credit)}, Balance: {money(supplierLedger.totals.balance)}
                  </p>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="store" className="space-y-4">
            <div className="flex flex-wrap items-end gap-4 justify-between">
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="ledger-type-filter" className="text-muted-foreground">
                  Entry type
                </Label>
                <Select value={entryType || '__all'} onValueChange={(v) => setEntryType(v === '__all' ? '' : v)}>
                  <SelectTrigger id="ledger-type-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All types</SelectItem>
                    {ledgerTypeFilterOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AdminTable
              title="Store ledger"
              subtitle="Money movement for this vendor store (sales, purchases, reversals, manual adjustments)"
              data={rows}
              searchKey="description"
              searchPlaceholder="Search description…"
              onAdd={() => setAddOpen(true)}
              addLabel="Add ledger"
              columns={[
                {
                  key: 'created_at',
                  label: 'Date',
                  render: (r) => String(r.created_at ?? '').slice(0, 19).replace('T', ' '),
                },
                {
                  key: 'entry_type',
                  label: 'Type',
                  render: (r) => entryLabel(String(r.entry_type ?? '')),
                },
                { key: 'description', label: 'Description' },
                {
                  key: 'amount',
                  label: 'Amount',
                  render: (r) => {
                    const n = Number(r.amount ?? 0);
                    const cls = n < 0 ? 'text-destructive' : n > 0 ? 'text-emerald-600' : '';
                    return (
                      <span className={cls}>
                        {n >= 0 ? '+' : ''}
                        Rs. {n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  },
                },
              ]}
            />

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add ledger entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="adj-direction">Direction</Label>
                    <Select
                      value={adjDirection}
                      onValueChange={(v) => setAdjDirection(v as 'credit' | 'debit')}
                    >
                      <SelectTrigger id="adj-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Credit (inflow to store book)</SelectItem>
                        <SelectItem value="debit">Debit (outflow / cost)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adj-amount">Amount (Rs.)</Label>
                    <Input
                      id="adj-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adj-desc">Description</Label>
                    <Textarea
                      id="adj-desc"
                      placeholder="What this entry is for"
                      rows={3}
                      value={adjDescription}
                      onChange={(e) => setAdjDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => addLedgerMut.mutate()} disabled={addLedgerMut.isPending}>
                    {addLedgerMut.isPending ? 'Saving…' : 'Save entry'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
