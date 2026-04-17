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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, extractResults } from '@/lib/api';
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

const ALL_VENDORS_VALUE = '__all';

export default function AdminLedgerModule() {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState(ALL_VENDORS_VALUE);
  const [entryType, setEntryType] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjDirection, setAdjDirection] = useState<'credit' | 'debit'>('credit');

  const { data: vendorsPage } = useQuery({
    queryKey: ['admin', 'vendors', 'ledger-picker'],
    queryFn: () => adminApi.vendors({ page_size: 500 }),
  });
  const vendors = useMemo(() => extractResults<Record<string, unknown>>(vendorsPage), [vendorsPage]);

  const { data: page } = useQuery({
    queryKey: ['admin', 'vendor-ledger', vendorId, entryType],
    queryFn: () => {
      const params = {
        page_size: 100,
        ...(entryType ? { entry_type: entryType } : {}),
      };
      return vendorId === ALL_VENDORS_VALUE
        ? adminApi.vendorLedgerEntriesAll(params)
        : adminApi.vendorLedgerEntries(vendorId, params);
    },
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

  const ledgerStats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const amount = Number(row.amount ?? 0);
        if (amount > 0) {
          acc.credit += amount;
        } else if (amount < 0) {
          acc.debit += Math.abs(amount);
        }
        return acc;
      },
      { credit: 0, debit: 0 },
    );
  }, [rows]);
  const ledgerBalance = ledgerStats.credit - ledgerStats.debit;

  const addLedgerMut = useMutation({
    mutationFn: () => {
      if (!vendorId || vendorId === ALL_VENDORS_VALUE) throw new Error('Choose a specific vendor');
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

      <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total credit</p>
              <p className="text-xl font-semibold text-emerald-600">{money(ledgerStats.credit)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total debit</p>
              <p className="text-xl font-semibold text-destructive">{money(ledgerStats.debit)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-xl font-semibold ${ledgerBalance < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {money(ledgerBalance)}
              </p>
            </div>
          </div>

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
            title="Vendor ledger"
            subtitle={
              vendorId === ALL_VENDORS_VALUE ? 'Ledger entries for all vendors' : 'Ledger entries for this vendor'
            }
            data={rows}
            searchKey="description"
            searchPlaceholder="Search description…"
            onAdd={vendorId === ALL_VENDORS_VALUE ? undefined : () => setAddOpen(true)}
            addLabel={vendorId === ALL_VENDORS_VALUE ? undefined : 'Add ledger'}
            columns={[
              ...(vendorId === ALL_VENDORS_VALUE
                ? [
                    {
                      key: 'vendor_name',
                      label: 'Vendor',
                      render: (r: Record<string, unknown>) => String(r.vendor_name ?? '-'),
                    },
                  ]
                : []),
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
                key: 'credit',
                label: 'Credit',
                render: (r) => {
                  const n = Number(r.amount ?? 0);
                  return <span className="text-emerald-600">{n > 0 ? money(n) : money(0)}</span>;
                },
              },
              {
                key: 'debit',
                label: 'Debit',
                render: (r) => {
                  const n = Number(r.amount ?? 0);
                  return <span className="text-destructive">{n < 0 ? money(Math.abs(n)) : money(0)}</span>;
                },
              },
            ]}
          />

          <Dialog open={addOpen && vendorId !== ALL_VENDORS_VALUE} onOpenChange={setAddOpen}>
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
        </div>
    </div>
  );
}
