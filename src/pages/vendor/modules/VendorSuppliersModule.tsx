import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';

export default function VendorSuppliersModule() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const { data: page } = useQuery({
    queryKey: ['vendor', 'suppliers', q],
    queryFn: () => vendorApi.suppliers({ page_size: 100, ...(q.trim() ? { q: q.trim() } : {}) }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const createMut = useMutation({
    mutationFn: () =>
      vendorApi.createSupplier({
        name: name.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'suppliers'] });
      toast.success('Supplier added');
      setOpen(false);
      setName('');
      setPhone('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <div className="flex gap-2 max-w-md flex-1">
          <Input
            placeholder="Search name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={() => setQ((s) => s.trim())}>
            Search
          </Button>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Add supplier
        </Button>
      </div>

      <AdminTable
        title="Suppliers"
        subtitle="Wholesalers and vendors you buy stock from"
        data={rows}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          {
            key: 'is_active',
            label: 'Active',
            render: (r) => (r.is_active ? 'Yes' : 'No'),
          },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="vs-name">Name</Label>
              <Input
                id="vs-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label htmlFor="vs-phone">Phone</Label>
              <Input
                id="vs-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
