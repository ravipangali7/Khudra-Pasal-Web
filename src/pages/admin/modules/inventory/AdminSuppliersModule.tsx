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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, extractResults } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSuppliersModule() {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const { data: vendorsPage } = useQuery({
    queryKey: ['admin', 'vendors', 'suppliers-picker'],
    queryFn: () => adminApi.vendors({ page_size: 500 }),
  });
  const vendors = useMemo(() => extractResults<Record<string, unknown>>(vendorsPage), [vendorsPage]);

  const { data: page } = useQuery({
    queryKey: ['admin', 'vendor-suppliers', vendorId, q],
    queryFn: () =>
      adminApi.vendorSuppliers(vendorId, {
        page_size: 100,
        ...(q.trim() ? { q: q.trim() } : {}),
      }),
    enabled: Boolean(vendorId),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const createMut = useMutation({
    mutationFn: () => {
      if (!vendorId) throw new Error('Choose a vendor');
      return adminApi.createVendorSupplier(vendorId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-suppliers', vendorId] });
      toast.success('Supplier added');
      setOpen(false);
      setName('');
      setPhone('');
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
        <p className="text-sm text-muted-foreground">Select a vendor to view and manage suppliers.</p>
      ) : (
        <>
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
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="as-name">Name</Label>
              <Input
                id="as-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <Label htmlFor="as-phone">Phone</Label>
              <Input
                id="as-phone"
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
