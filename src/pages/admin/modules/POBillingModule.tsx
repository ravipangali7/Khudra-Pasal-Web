import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { useAdminCrudPolicy } from '../hooks/useAdminCrudPolicy';
import { formatApiError, resolveMediaUrl } from '../hooks/adminFormUtils';
import {
  Receipt, Plus, Minus, Trash2, Download, Printer
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { adminApi, type AdminPurchaseOrderDetail } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import { fetchUserAdminOptions, fetchVendorAdminOptions } from '@/components/admin/adminRelationalPickers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import InvoiceDocument, { invoicePrintStyles, type InvoiceDocProps } from '@/components/admin/InvoiceDocument';

type POListRow = {
  id: string;
  pk: number;
  customer: string;
  seller: string;
  items: number;
  total: number;
  status: string;
  date: string;
  record_type?: 'purchase_order' | 'pos_order';
};

type POProductRow = { id: string; name: string; sku: string; price: number; image_url?: string };

interface POItem {
  product: POProductRow;
  quantity: number;
}

function poDetailToInvoice(
  po: AdminPurchaseOrderDetail,
  site: Record<string, unknown>,
  hidePrices?: boolean,
): InvoiceDocProps {
  const currency = String(site.currency ?? 'NPR');
  return {
    title: hidePrices ? 'Packing slip' : 'Purchase order',
    docId: po.id,
    date: po.date,
    branding: {
      site_name: String(site.site_name ?? 'Khudra Pasal'),
      site_logo_url: String(site.site_logo_url ?? ''),
      phone: String(site.phone ?? ''),
      address: String(site.address ?? ''),
      currency,
    },
    billTo: { name: po.customer, phone: '', address: '' },
    lines: po.lines.map((ln) => ({
      name: ln.name,
      sku: ln.sku,
      qty: ln.quantity,
      unit_price: ln.unit_price,
      total: ln.line_total,
      image_url: ln.image_url,
    })),
    subtotal: po.subtotal,
    discount: po.discount,
    delivery: po.delivery_fee,
    total: po.total,
    hidePrices,
  };
}

export default function POBillingModule() {
  const crud = useAdminCrudPolicy();
  const [modalOpen, setModalOpen] = useState(false);
  const [previewPk, setPreviewPk] = useState<number | null>(null);
  const [previewRecordType, setPreviewRecordType] = useState<'purchase_order' | 'pos_order'>('purchase_order');
  const [previewPacking, setPreviewPacking] = useState(false);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [poCustomer, setPoCustomer] = useState('');
  const [poCustomerLabel, setPoCustomerLabel] = useState('');
  const [poVendorId, setPoVendorId] = useState('');
  const [poVendorLabel, setPoVendorLabel] = useState('');
  const [sellerKind, setSellerKind] = useState<'inhouse' | 'vendor'>('inhouse');
  const [poDiscount, setPoDiscount] = useState(0);
  const [poDelivery, setPoDelivery] = useState(0);
  const [poErr, setPoErr] = useState('');
  const createPo = useAdminMutation(adminApi.createPurchaseOrder, [['admin', 'purchase-orders', 'po']]);

  const { data: siteRaw } = useQuery({
    queryKey: ['admin', 'site-settings', 'po-invoice'],
    queryFn: () => adminApi.siteSettings(),
  });
  const site = (siteRaw ?? {}) as Record<string, unknown>;

  const { data: previewDetail } = useQuery({
    queryKey: ['admin', 'purchase-orders', 'detail', previewPk, previewRecordType],
    queryFn: () =>
      previewRecordType === 'pos_order'
        ? adminApi.purchaseOrderPosDetail(previewPk!)
        : adminApi.purchaseOrderDetail(previewPk!),
    enabled: previewPk != null,
  });

  const invoiceProps = useMemo(() => {
    if (!previewDetail) return null;
    return poDetailToInvoice(previewDetail, site, previewPacking);
  }, [previewDetail, site, previewPacking]);

  const { data: purchaseOrders = [] } = useAdminList<POListRow>(
    ['admin', 'purchase-orders', 'po'],
    () => adminApi.purchaseOrders({ page_size: 200 }),
  );
  const { data: productRows = [] } = useAdminList<POProductRow>(
    ['admin', 'products', 'po-picker'],
    () => adminApi.products({ page_size: 200 }),
  );

  const addItem = (product: POProductRow) => {
    setPoItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const subtotal = poItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const discountAmt = (subtotal * poDiscount) / 100;
  const total = subtotal - discountAmt + poDelivery;

  const submitPo = async () => {
    setPoErr('');
    if (poItems.length === 0) {
      setPoErr('Add at least one product.');
      return;
    }
    try {
      await createPo.mutateAsync({
        customer_id: poCustomer.trim() || null,
        seller_id: sellerKind === 'vendor' && poVendorId.trim() ? poVendorId.trim() : null,
        items: poItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
        })),
        discount: discountAmt,
        delivery_fee: poDelivery,
        payment_method: 'cash',
      });
      setModalOpen(false);
      setPoItems([]);
      setPoCustomer('');
      setPoCustomerLabel('');
      setPoVendorId('');
      setPoVendorLabel('');
      setPoDiscount(0);
      setPoDelivery(0);
    } catch (e) {
      setPoErr(formatApiError(e));
    }
  };

  const openInvoicePreview = (
    pk: number,
    packing: boolean,
    recordType: 'purchase_order' | 'pos_order' = 'purchase_order',
  ) => {
    setPreviewPacking(packing);
    setPreviewRecordType(recordType);
    setPreviewPk(pk);
  };

  const runPrint = async () => {
    const root = document.getElementById('invoice-print-root');
    if (!root) return;

    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }),
      ),
    );

    const el = document.createElement('style');
    el.setAttribute('data-invoice-print', '1');
    el.textContent = invoicePrintStyles();
    document.head.appendChild(el);
    const cleanup = () => {
      document.querySelectorAll('style[data-invoice-print]').forEach((n) => n.remove());
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 2000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* PO History */}
      <AdminTable title="Purchase Orders" subtitle="Generate PO Bills — discount & delivery calculation"
        data={purchaseOrders}
        columns={[
          { key: 'id', label: 'PO ID', render: (p) => <span className="font-mono font-medium">{p.id}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'seller', label: 'Seller' },
          { key: 'items', label: 'Items', render: (p) => String(p.items) },
          { key: 'total', label: 'Total', render: (p) => <span className="font-bold">Rs. {p.total.toLocaleString()}</span> },
          { key: 'status', label: 'Status', render: (p) => (
            <Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className={cn("text-xs", p.status === 'completed' && "bg-emerald-500")}>{p.status}</Badge>
          )},
          { key: 'date', label: 'Date' },
          { key: 'actions', label: '', render: (p) => (
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" className="h-7" type="button" onClick={() => openInvoicePreview(p.pk, false, p.record_type ?? 'purchase_order')}>
                <Download className="w-3 h-3 mr-1" /> Preview
              </Button>
              <Button size="sm" variant="outline" className="h-7" type="button" onClick={() => openInvoicePreview(p.pk, true, p.record_type ?? 'purchase_order')}>
                Slip
              </Button>
              <Button size="sm" variant="outline" className="h-7" type="button" onClick={() => openInvoicePreview(p.pk, false, p.record_type ?? 'purchase_order')}>
                <Printer className="w-3 h-3 mr-1" /> Print
              </Button>
            </div>
          )}
        ]}
        onAdd={crud.canPOCreate ? () => setModalOpen(true) : undefined} addLabel="Generate PO"
      />

      <Dialog open={previewPk != null} onOpenChange={(o) => { if (!o) { setPreviewPk(null); setPreviewRecordType('purchase_order'); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPacking ? 'Packing slip' : 'Invoice preview'}</DialogTitle>
          </DialogHeader>
          {invoiceProps ? <InvoiceDocument {...invoiceProps} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPreviewPk(null)}>Close</Button>
            <Button type="button" onClick={runPrint}><Printer className="w-4 h-4 mr-2" /> Print / Save PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Generator Modal */}
      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPoItems([]); setPoErr(''); }}
        title="Generate Purchase Order"
        size="xl"
        saveLabel="Generate PO Bill"
        onSave={submitPo}
        loading={createPo.isPending}
        error={poErr}
      >
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Product Selection */}
          <div className="space-y-4">
            <div>
              <Label>Customer (optional)</Label>
              <AdminSearchCombobox
                queryKeyPrefix="po-customer"
                value={poCustomer}
                selectedLabel={poCustomerLabel}
                onChange={(v, l) => { setPoCustomer(v); setPoCustomerLabel(l ?? ''); }}
                fetchOptions={fetchUserAdminOptions}
                placeholder="Search user…"
                clearable
              />
            </div>
            <div><Label>Seller Type</Label>
              <Select value={sellerKind} onValueChange={(v) => setSellerKind(v as 'inhouse' | 'vendor')}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="inhouse">In-House</SelectItem><SelectItem value="vendor">Vendor</SelectItem></SelectContent>
              </Select>
            </div>
            {sellerKind === 'vendor' ? (
              <div>
                <Label>Vendor</Label>
                <AdminSearchCombobox
                  queryKeyPrefix="po-vendor"
                  value={poVendorId}
                  selectedLabel={poVendorLabel}
                  onChange={(v, l) => { setPoVendorId(v); setPoVendorLabel(l ?? ''); }}
                  fetchOptions={fetchVendorAdminOptions}
                  placeholder="Search vendor…"
                  clearable
                />
              </div>
            ) : null}
            <div><Label>Add Products</Label></div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {productRows.map(product => {
                const img = product.image_url ? resolveMediaUrl(product.image_url) : '';
                return (
                <div key={product.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/30 cursor-pointer gap-2"
                  onClick={() => addItem(product)}>
                  <div className="flex items-center gap-2 min-w-0">
                    {img ? <img src={img} alt="" className="h-10 w-10 rounded object-cover shrink-0" /> : null}
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{product.name}</p><p className="text-xs text-muted-foreground">SKU: {product.sku}</p></div>
                  </div>
                  <div className="text-right shrink-0"><span className="font-medium text-sm">Rs. {product.price.toLocaleString()}</span></div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Right: PO Preview */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">PO Items</h4>
            {poItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Click products to add to PO</p>
              </div>
            ) : (
              <div className="space-y-2">
                {poItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.product.price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setPoItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setPoItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setPoItems(prev => prev.filter(i => i.product.id !== item.product.id))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <span className="text-sm font-medium w-20 text-right">Rs. {(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {poItems.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                <div><Label>Discount (%)</Label><Input type="number" value={poDiscount || ''} onChange={e => setPoDiscount(Number(e.target.value))} className="h-8" /></div>
                <div><Label>Delivery (Rs.)</Label><Input type="number" value={poDelivery || ''} onChange={e => setPoDelivery(Number(e.target.value) || 0)} className="h-8" /></div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                  {poDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({poDiscount}%)</span><span>-Rs. {discountAmt.toFixed(0)}</span></div>}
                  {poDelivery > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>Rs. {poDelivery.toLocaleString()}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">Rs. {total.toFixed(0)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CRUDModal>
    </div>
  );
}
