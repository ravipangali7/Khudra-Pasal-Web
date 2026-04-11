import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractResults, vendorApi } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

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

export default function VendorLedgerModule() {
  const [entryType, setEntryType] = useState<string>('');
  const [supplierViewId, setSupplierViewId] = useState<string | null>(null);

  const { data: supPage } = useQuery({
    queryKey: ['vendor', 'suppliers', 'ledger-list'],
    queryFn: () => vendorApi.suppliers({ page_size: 200 }),
  });
  const suppliers = useMemo(() => extractResults<Record<string, unknown>>(supPage), [supPage]);

  const { data: page } = useQuery({
    queryKey: ['vendor', 'ledger', entryType],
    queryFn: () =>
      vendorApi.vendorLedger({
        page_size: 100,
        ...(entryType ? { entry_type: entryType } : {}),
      }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const { data: supplierLedger } = useQuery({
    queryKey: ['vendor', 'supplier-ledger', supplierViewId],
    queryFn: () => vendorApi.supplierLedger(supplierViewId!),
    enabled: Boolean(supplierViewId),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
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
          <div className="max-w-xs">
            <Select value={entryType || '__all'} onValueChange={(v) => setEntryType(v === '__all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All types</SelectItem>
                <SelectItem value="sale_settlement">Sale settlement</SelectItem>
                <SelectItem value="sale_reversal">Sale reversal</SelectItem>
                <SelectItem value="purchase_cost">Stock purchase</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AdminTable
            title="Store ledger"
            subtitle="Money movement for your store (sales, purchases, reversals)"
            data={rows}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
