import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SuppliersManagementSection from '@/components/suppliers/SuppliersManagementSection';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';

function money(n: number) {
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function VendorSuppliersModule() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null);

  const { data: page } = useQuery({
    queryKey: ['vendor', 'suppliers', q],
    queryFn: () => vendorApi.suppliers({ page_size: 100, ...(q.trim() ? { q: q.trim() } : {}) }),
  });
  const rows = useMemo(() => extractResults<Record<string, unknown>>(page), [page]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };
      if (editId) return vendorApi.updateSupplier(editId, payload);
      return vendorApi.createSupplier(payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'suppliers'] });
      toast.success(editId ? 'Supplier updated' : 'Supplier added');
      setOpen(false);
      setEditId(null);
      setName('');
      setPhone('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => vendorApi.deleteSupplier(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'suppliers'] });
      toast.success('Supplier deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: supplierLedger } = useQuery({
    queryKey: ['vendor', 'supplier-ledger', ledgerSupplierId],
    queryFn: () => vendorApi.supplierLedger(ledgerSupplierId!),
    enabled: Boolean(ledgerSupplierId),
  });

  return (
    <div className="p-4 lg:p-6">
      <SuppliersManagementSection
        rows={rows}
        q={q}
        setQ={setQ}
        onSearchCommit={() => setQ((s) => s.trim())}
        onAddClick={() => {
          setEditId(null);
          setName('');
          setPhone('');
          setOpen(true);
        }}
        dialogOpen={open}
        onDialogOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditId(null);
            setName('');
            setPhone('');
          }
        }}
        name={name}
        setName={setName}
        phone={phone}
        setPhone={setPhone}
        onSave={() => saveMut.mutate()}
        savePending={saveMut.isPending}
        renderActions={(row) => (
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => setLedgerSupplierId(String(row.id))}>
              View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditId(String(row.id));
                setName(String(row.name ?? ''));
                setPhone(String(row.phone ?? ''));
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                const id = String(row.id ?? '');
                if (!id) return;
                if (!window.confirm(`Delete supplier "${String(row.name ?? '')}"?`)) return;
                deleteMut.mutate(id);
              }}
            >
              Delete
            </Button>
          </div>
        )}
        nameFieldId="vs-name"
        phoneFieldId="vs-phone"
      />

      <Dialog open={Boolean(ledgerSupplierId)} onOpenChange={(v) => !v && setLedgerSupplierId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{supplierLedger?.supplier?.name ?? 'Supplier ledger'}</DialogTitle>
          </DialogHeader>
          <AdminTable
            title="Supplier ledger"
            subtitle="Posted purchases and running balance"
            data={(supplierLedger?.rows ?? []) as Record<string, unknown>[]}
            columns={[
              {
                key: 'date',
                label: 'Date',
                render: (r) => String(r.date ?? '').slice(0, 19).replace('T', ' '),
              },
              { key: 'reference', label: 'Reference' },
              { key: 'description', label: 'Description' },
              { key: 'debit', label: 'Debit', render: (r) => money(Number(r.debit ?? 0)) },
              { key: 'credit', label: 'Credit', render: (r) => money(Number(r.credit ?? 0)) },
              { key: 'balance', label: 'Balance', render: (r) => <span className="font-medium">{money(Number(r.balance ?? 0))}</span> },
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
