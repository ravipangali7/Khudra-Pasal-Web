import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuppliersManagementSection from '@/components/suppliers/SuppliersManagementSection';
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
    <div className="p-4 lg:p-6">
      <SuppliersManagementSection
        rows={rows}
        q={q}
        setQ={setQ}
        onSearchCommit={() => setQ((s) => s.trim())}
        onAddClick={() => setOpen(true)}
        dialogOpen={open}
        onDialogOpenChange={setOpen}
        name={name}
        setName={setName}
        phone={phone}
        setPhone={setPhone}
        onSave={() => createMut.mutate()}
        savePending={createMut.isPending}
        nameFieldId="vs-name"
        phoneFieldId="vs-phone"
      />
    </div>
  );
}
