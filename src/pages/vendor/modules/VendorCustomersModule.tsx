import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { extractResults, vendorApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function VendorCustomersModule() {
  const [search, setSearch] = useState('');
  const { data: page } = useQuery({
    queryKey: ['vendor', 'customers', search],
    queryFn: () => vendorApi.customers({ page_size: 100, ...(search ? { search } : {}) }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex gap-2 max-w-md">
        <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="button" variant="secondary" onClick={() => setSearch((s) => s.trim())}>
          Search
        </Button>
      </div>
      <AdminTable
        title="Customers"
        subtitle="Buyers who ordered from your store"
        data={rows}
        columns={[
          {
            key: 'name',
            label: 'Customer',
            render: (c) => (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{String(c.name || '?')[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{String(c.name)}</p>
                  <p className="text-xs text-muted-foreground">{String(c.phone)}</p>
                </div>
              </div>
            ),
          },
          { key: 'orders', label: 'Orders' },
          {
            key: 'spent',
            label: 'Total spent',
            render: (c) => <span className="font-medium">Rs. {Number(c.spent).toLocaleString()}</span>,
          },
          { key: 'lastOrder', label: 'Last order' },
        ]}
      />
    </div>
  );
}
