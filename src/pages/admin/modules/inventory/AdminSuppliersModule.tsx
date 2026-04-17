import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import SuppliersManagementSection from '@/components/suppliers/SuppliersManagementSection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { adminApi, extractResults } from '@/lib/api';
import { useAdminRouteContext } from '@/pages/admin/adminRouteContext';
import { toast } from 'sonner';

const SELECT_TRIGGER =
  'w-[min(100vw-3rem,280px)] rounded-lg border-[#E0E0E0]';

function money(n: number) {
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminSuppliersModule() {
  const qc = useQueryClient();
  const adminRoute = useAdminRouteContext();
  const [vendorId, setVendorId] = useState('__all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ledgerView, setLedgerView] = useState<{ vendorId: string; supplierId: string } | null>(null);

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

  const saveMut = useMutation({
    mutationFn: () => {
      if (!vendorId || vendorId === '__all') throw new Error('Choose a vendor');
      const payload = { name: name.trim(), phone: phone.trim() || undefined };
      if (editId) return adminApi.updateVendorSupplier(vendorId, editId, payload);
      return adminApi.createVendorSupplier(vendorId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-suppliers', vendorId] });
      toast.success(editId ? 'Supplier updated' : 'Supplier added');
      setOpen(false);
      setEditId(null);
      setName('');
      setPhone('');
      if (adminRoute?.action === 'add') adminRoute.navigateToList();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ({ targetVendorId, supplierId }: { targetVendorId: string; supplierId: string }) =>
      adminApi.deleteVendorSupplier(targetVendorId, supplierId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'vendor-suppliers'] });
      toast.success('Supplier deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: supplierLedger } = useQuery({
    queryKey: ['admin', 'vendor-supplier-ledger', ledgerView?.vendorId, ledgerView?.supplierId],
    queryFn: () => adminApi.vendorSupplierLedgerAdmin(ledgerView!.vendorId, ledgerView!.supplierId),
    enabled: Boolean(ledgerView?.vendorId && ledgerView?.supplierId),
  });

  useEffect(() => {
    if (adminRoute?.moduleId !== 'suppliers') return;
    if (adminRoute.action !== 'add') {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [adminRoute?.moduleId, adminRoute?.action, vendorId]);

  const onDialogOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setEditId(null);
      setName('');
      setPhone('');
      if (adminRoute?.action === 'add') adminRoute.navigateToList();
    }
  };

  const onAddClick = () => {
    adminRoute?.navigateToAdd();
  };

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
          onAddClick();
        }}
        dialogOpen={open}
        onDialogOpenChange={onDialogOpenChange}
        name={name}
        setName={setName}
        phone={phone}
        setPhone={setPhone}
        onSave={() => saveMut.mutate()}
        savePending={saveMut.isPending}
        saveDisabled={!vendorId || vendorId === '__all' || !name.trim() || saveMut.isPending}
        renderActions={(row) => {
          const targetVendorId = vendorId !== '__all' ? vendorId : String(row.vendor_id ?? '');
          const supplierId = String(row.id ?? '');
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!targetVendorId || !supplierId}
                onClick={() => setLedgerView({ vendorId: targetVendorId, supplierId })}
              >
                View
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={vendorId === '__all'}
                onClick={() => {
                  setEditId(supplierId);
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
                disabled={!targetVendorId || !supplierId || deleteMut.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete supplier "${String(row.name ?? '')}"?`)) return;
                  deleteMut.mutate({ targetVendorId, supplierId });
                }}
              >
                Delete
              </Button>
            </div>
          );
        }}
        nameFieldId="as-name"
        phoneFieldId="as-phone"
        showList={Boolean(vendorId)}
        dialogFieldsPrefix={
          <div>
            <Label htmlFor="as-vendor">Vendor</Label>
            <Select
              value={vendorId}
              onValueChange={setVendorId}
            >
              <SelectTrigger id="as-vendor" className={SELECT_TRIGGER}>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Select vendor</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={String(v.id)} value={String(v.id)}>
                    {String(v.name ?? '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        toolbarPrefix={
          <>
            <span className="text-sm font-medium text-foreground">Vendor</span>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className={SELECT_TRIGGER}>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
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

      <Dialog open={Boolean(ledgerView)} onOpenChange={(v) => !v && setLedgerView(null)}>
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
