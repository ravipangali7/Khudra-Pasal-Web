import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractResults, vendorApi } from '@/lib/api';

function entryLabel(t: string) {
  const m: Record<string, string> = {
    sale_settlement: 'Sale settlement',
    sale_reversal: 'Sale reversal',
    purchase_cost: 'Stock purchase',
    adjustment: 'Adjustment',
  };
  return m[t] ?? t.replace(/_/g, ' ');
}

export default function VendorLedgerModule() {
  const [entryType, setEntryType] = useState<string>('');

  const { data: page } = useQuery({
    queryKey: ['vendor', 'ledger', entryType],
    queryFn: () =>
      vendorApi.vendorLedger({
        page_size: 100,
        ...(entryType ? { entry_type: entryType } : {}),
      }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
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
        title="Ledger"
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
    </div>
  );
}
