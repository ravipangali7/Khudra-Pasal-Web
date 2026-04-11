import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuppliersManagementSection from '@/components/suppliers/SuppliersManagementSection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, extractResults } from '@/lib/api';
import { useAdminRouteContext } from '@/pages/admin/adminRouteContext';
import { toast } from 'sonner';

const SELECT_TRIGGER =
  'w-[min(100vw-3rem,280px)] rounded-lg border-[#E0E0E0]';

export default function AdminSuppliersModule() {
  const qc = useQueryClient();
  const adminRoute = useAdminRouteContext();
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
      if (adminRoute?.action === 'add') adminRoute.navigateToList();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (adminRoute?.moduleId !== 'suppliers') return;
    if (adminRoute.action !== 'add') {
      setOpen(false);
      return;
    }
    if (!vendorId) {
      toast.info('Select a vendor before adding a supplier.');
      adminRoute.navigateToList();
      return;
    }
    setOpen(true);
  }, [adminRoute?.moduleId, adminRoute?.action, vendorId]);

  const onDialogOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v && adminRoute?.action === 'add') adminRoute.navigateToList();
  };

  const onAddClick = () => {
    if (!vendorId) {
      toast.error('Select a vendor first');
      return;
    }
    adminRoute?.navigateToAdd();
  };

  return (
    <div className="p-4 lg:p-6">
      <SuppliersManagementSection
        rows={rows}
        q={q}
        setQ={setQ}
        onSearchCommit={() => setQ((s) => s.trim())}
        onAddClick={onAddClick}
        dialogOpen={open}
        onDialogOpenChange={onDialogOpenChange}
        name={name}
        setName={setName}
        phone={phone}
        setPhone={setPhone}
        onSave={() => createMut.mutate()}
        savePending={createMut.isPending}
        saveDisabled={!vendorId}
        nameFieldId="as-name"
        phoneFieldId="as-phone"
        showList={Boolean(vendorId)}
        toolbarPrefix={
          <>
            <span className="text-sm font-medium text-foreground">Vendor</span>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className={SELECT_TRIGGER}>
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
          </>
        }
      />
    </div>
  );
}
