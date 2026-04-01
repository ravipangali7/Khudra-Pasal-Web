import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Eye, Truck, Package, RefreshCw, CheckCircle,
  Download, FileText, Clock
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { adminApi, extractResults, type AdminOrderDetail, type AdminOrderListRow } from '@/lib/api';
import { useAdminRouteContext } from '../adminRouteContext';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { useAdminCrudPolicy } from '../hooks/useAdminCrudPolicy';
import { formatApiError, resolveMediaUrl } from '../hooks/adminFormUtils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import InvoiceDocument, { invoicePrintStyles, type InvoiceDocProps } from '@/components/admin/InvoiceDocument';

interface OrdersModuleProps {
  activeSection: string;
}

export default function OrdersModule({ activeSection }: OrdersModuleProps) {
  switch (activeSection) {
    case 'orders-settings': return <OrderSettingsView />;
    default: return <AllOrdersView />;
  }
}

function orderToInvoiceProps(
  order: AdminOrderDetail,
  site: Record<string, unknown>,
  hidePrices?: boolean,
): InvoiceDocProps {
  const tax = Math.max(0, order.total - order.subtotal + order.discount_amount - order.delivery_fee);
  const currency = String(site.currency ?? 'NPR');
  return {
    title: hidePrices ? 'Packing slip' : 'Invoice',
    docId: order.id,
    date: order.date.slice(0, 10),
    branding: {
      site_name: String(site.site_name ?? 'Khudra Pasal'),
      site_logo_url: String(site.site_logo_url ?? ''),
      phone: String(site.phone ?? ''),
      address: String(site.address ?? ''),
      currency,
    },
    billTo: {
      name: order.customer,
      phone: order.phone,
      address: order.full_address || order.address,
    },
    lines: (order.item_lines ?? []).map((l) => ({
      name: l.name,
      sku: l.sku,
      qty: l.qty,
      unit_price: l.unit_price,
      total: l.total,
      image_url: l.image_url,
    })),
    subtotal: order.subtotal,
    discount: order.discount_amount,
    delivery: order.delivery_fee,
    tax,
    total: order.total,
    hidePrices,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildInvoiceDownloadHtml(doc: InvoiceDocProps): string {
  const cur = doc.branding.currency || 'NPR';
  const siteLogo = doc.branding.site_logo_url ? resolveMediaUrl(doc.branding.site_logo_url) : '';
  const priceColumns = doc.hidePrices ? '' : `
      <th style="text-align:right; padding: 8px 0;">Price</th>
      <th style="text-align:right; padding: 8px 0;">Total</th>
  `;
  const lineRows = doc.lines.map((line) => `
      <tr>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; width: 48px;">
          ${line.image_url ? `<img src="${escapeHtml(resolveMediaUrl(line.image_url))}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />` : `<div style="width: 40px; height: 40px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0;"></div>`}
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">${escapeHtml(line.name)}</td>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${line.qty}</td>
        ${doc.hidePrices ? '' : `<td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${cur} ${line.unit_price.toLocaleString()}</td>`}
        ${doc.hidePrices ? '' : `<td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${cur} ${line.total.toLocaleString()}</td>`}
      </tr>
  `).join('');
  const totalsBlock = doc.hidePrices ? '' : `
      <div style="margin-top: 16px; margin-left:auto; width: 320px;">
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Subtotal</span><span>${cur} ${doc.subtotal.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Discount</span><span>${cur} ${doc.discount.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Delivery</span><span>${cur} ${doc.delivery.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Tax</span><span>${cur} ${doc.tax.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding-top: 8px; margin-top: 8px; border-top: 1px solid #cbd5e1; font-size: 18px; font-weight: 700;">
          <span>Total</span><span>${cur} ${doc.total.toLocaleString()}</span>
        </div>
      </div>
  `;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(doc.title)} ${escapeHtml(doc.docId)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #0f172a; margin: 24px;">
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display:flex; align-items:flex-start; gap: 10px;">
          ${siteLogo
      ? `<img src="${escapeHtml(siteLogo)}" alt="" style="width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;" />`
      : `<div style="width: 56px; height: 56px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:700;">${escapeHtml((doc.branding.site_name || 'K').charAt(0).toUpperCase())}</div>`}
          <div>
            <h1 style="margin:0; font-size: 22px;">${escapeHtml(doc.branding.site_name)}</h1>
            ${doc.branding.phone ? `<div style="color:#475569; font-size: 13px; margin-top: 4px;">${escapeHtml(doc.branding.phone)}</div>` : ''}
            ${doc.branding.address ? `<div style="color:#475569; font-size: 13px; margin-top: 2px;">${escapeHtml(doc.branding.address)}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">${escapeHtml(doc.title)}</div>
          <div style="font-weight: 700;">${escapeHtml(doc.docId)}</div>
          <div style="font-size: 13px; color: #475569;">${escapeHtml(doc.date)}</div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Bill to</div>
        <div style="font-weight: 600;">${escapeHtml(doc.billTo.name)}</div>
        ${doc.billTo.phone ? `<div style="font-size: 13px; color:#475569;">${escapeHtml(doc.billTo.phone)}</div>` : ''}
        ${doc.billTo.address ? `<div style="font-size: 13px; color:#475569;">${escapeHtml(doc.billTo.address)}</div>` : ''}
      </div>

      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding: 8px 0; border-bottom: 1px solid #cbd5e1; width: 48px;">Img</th>
            <th style="text-align:left; padding: 8px 0; border-bottom: 1px solid #cbd5e1;">Item</th>
            <th style="text-align:right; padding: 8px 0; border-bottom: 1px solid #cbd5e1;">Qty</th>
            ${priceColumns}
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
      ${totalsBlock}
    </div>
  </body>
</html>`;
}

function downloadInvoiceFile(doc: InvoiceDocProps): void {
  const blob = new Blob([buildInvoiceDownloadHtml(doc)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const suffix = doc.hidePrices ? 'packing-slip' : 'invoice';
  a.href = url;
  a.download = `${doc.docId}-${suffix}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AllOrdersView() {
  const adminRoute = useAdminRouteContext();
  const crud = useAdminCrudPolicy();
  const [selectedPk, setSelectedPk] = useState<number | null>(null);
  const [docPreview, setDocPreview] = useState<'invoice' | 'packing' | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionErr, setActionErr] = useState('');
  const routeViewPk = adminRoute?.action === 'view' && adminRoute.itemId ? Number(adminRoute.itemId) : null;
  const activePk = routeViewPk ?? selectedPk;

  const { data: listData, isLoading: listLoading, isError: listError } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.orders({ page_size: 200 }),
  });

  const allOrders = useMemo(() => extractResults<AdminOrderListRow>(listData), [listData]);

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'orders', activePk],
    enabled: activePk != null,
    queryFn: () => adminApi.orderDetail(activePk!),
  });

  const { data: siteRaw } = useQuery({
    queryKey: ['admin', 'site-settings', 'order-invoice'],
    queryFn: () => adminApi.siteSettings(),
  });
  const site = (siteRaw ?? {}) as Record<string, unknown>;

  const order: AdminOrderDetail | null = activePk != null ? (orderDetail ?? null) : null;

  const docInvoiceProps = useMemo(() => {
    if (!order || !docPreview) return null;
    return orderToInvoiceProps(order, site, docPreview === 'packing');
  }, [order, site, docPreview]);

  const updateOrderMut = useAdminMutation(
    ({ pk, payload }: { pk: number; payload: Record<string, unknown> }) => adminApi.updateOrder(pk, payload),
    [['admin', 'orders']],
  );
  const refundMut = useAdminMutation(
    ({ pk, payload }: { pk: number; payload: { amount: number; reason: string } }) => adminApi.refundOrder(pk, payload),
    [['admin', 'orders']],
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    processing: 'bg-blue-100 text-blue-700 border-blue-300',
    shipped: 'bg-purple-100 text-purple-700 border-purple-300',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
    refunded: 'bg-red-100 text-red-700 border-red-300',
  };

  const runPrint = () => {
    const el = document.createElement('style');
    el.setAttribute('data-invoice-print', '1');
    el.textContent = invoicePrintStyles();
    document.head.appendChild(el);
    window.print();
    setTimeout(() => {
      document.querySelectorAll('style[data-invoice-print]').forEach((n) => n.remove());
    }, 2000);
  };

  const refundedSoFar = order?.refunded_total ?? 0;
  const refundRemaining = order ? Math.max(0, order.total - refundedSoFar) : 0;

  const detailView =
    activePk != null ? (
      detailLoading || !order ? (
        <div className="p-4 lg:p-6">
          <Button variant="ghost" size="sm" onClick={() => adminRoute?.navigateToList() ?? setSelectedPk(null)}>← Back</Button>
          <p className="text-sm text-muted-foreground mt-4">Loading order…</p>
        </div>
      ) : (
        <div className="p-4 lg:p-6 space-y-4">
          {actionErr ? <p className="text-sm text-destructive">{actionErr}</p> : null}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => adminRoute?.navigateToList() ?? setSelectedPk(null)}>← Back</Button>
            <h2 className="text-lg font-bold">Order {order.id}</h2>
            <Badge className={cn("text-xs capitalize", statusColors[order.status] ?? 'bg-muted')}>{order.status}</Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{order.customer}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{order.phone}</span></div>
                  <div><span className="text-muted-foreground">Payment:</span> <Badge variant="outline" className="text-xs">{order.payment}</Badge></div>
                  <div><span className="text-muted-foreground">Seller:</span> <span className="font-medium">{order.seller}</span></div>
                  <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{order.address}</span></div>
                  <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{order.date}</span></div>
                  {order.tracking_number ? (
                    <div><span className="text-muted-foreground">Tracking:</span> <span className="font-medium">{order.tracking_number}</span></div>
                  ) : null}
                </div>
                {order.item_lines?.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium">Line items</p>
                    <ul className="text-sm space-y-1">
                      {order.item_lines.map((line, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{line.name} × {line.qty}</span>
                          <span className="font-mono">Rs. {line.total.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="border-t pt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">Rs. {order.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>Rs. {order.delivery_fee.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>Rs. {order.discount_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t"><span>Total</span><span className="text-primary">Rs. {order.total.toLocaleString()}</span></div>
                  <p className="text-xs text-muted-foreground pt-1">Payment status: {order.payment_status}</p>
                  {refundedSoFar > 0 ? (
                    <p className="text-xs text-amber-700">Refunded so far: Rs. {refundedSoFar.toLocaleString()}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {['pending', 'processing', 'shipped', 'delivered'].map((s) => (
                    <Button
                      key={s}
                      variant={order.status === s ? 'default' : 'outline'}
                      className="w-full justify-start capitalize"
                      size="sm"
                      disabled={!crud.canOrderStatus || updateOrderMut.isPending}
                      onClick={async () => {
                        setActionErr('');
                        if (order.status === s) return;
                        try {
                          await updateOrderMut.mutateAsync({ pk: order.pk, payload: { status: s } });
                        } catch (e) {
                          setActionErr(formatApiError(e));
                        }
                      }}
                    >
                      {s === 'pending' && <Clock className="w-4 h-4 mr-2" />}
                      {s === 'processing' && <Package className="w-4 h-4 mr-2" />}
                      {s === 'shipped' && <Truck className="w-4 h-4 mr-2" />}
                      {s === 'delivered' && <CheckCircle className="w-4 h-4 mr-2" />}
                      {s}
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    type="button"
                    onClick={() => {
                      if (!order) return;
                      downloadInvoiceFile(orderToInvoiceProps(order, site, false));
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" /> Download Invoice
                  </Button>
                  <Button variant="outline" className="w-full" size="sm" type="button" onClick={() => setDocPreview('packing')}>
                    <Download className="w-4 h-4 mr-2" /> Packing Slip
                  </Button>
                  {crud.canRefund && refundRemaining > 0 && order.status !== 'refunded' ? (
                    <Button variant="outline" className="w-full text-destructive" size="sm" type="button" onClick={() => {
                      setRefundAmount(String(refundRemaining));
                      setRefundReason('');
                      setRefundOpen(true);
                    }}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Process Refund
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    ) : null;

  const listView =
    listLoading ? (
      <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading orders…</div>
    ) : listError ? (
      <div className="p-4 lg:p-6 text-sm text-destructive">Could not load orders. Sign in as staff with a valid token.</div>
    ) : (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard icon={ShoppingCart} title="All Orders" value={allOrders.length} color="blue" />
          <AdminStatCard icon={Clock} title="Pending" value={allOrders.filter((o) => o.status === 'pending').length} color="orange" />
          <AdminStatCard icon={Package} title="Processing" value={allOrders.filter((o) => o.status === 'processing').length} color="purple" />
          <AdminStatCard icon={Truck} title="Shipped" value={allOrders.filter((o) => o.status === 'shipped').length} color="cyan" />
          <AdminStatCard icon={CheckCircle} title="Delivered" value={allOrders.filter((o) => o.status === 'delivered').length} color="green" />
        </div>

        <AdminTable
          title="All Orders"
          subtitle="Manage order lifecycle — Pending → Processing → Shipped → Delivered"
          data={allOrders}
          columns={[
            { key: 'id', label: 'Order ID', render: (o) => <span className="font-medium text-primary cursor-pointer" onClick={() => adminRoute?.navigateToView(String(o.pk)) ?? setSelectedPk(o.pk)}>{o.id}</span> },
            { key: 'customer', label: 'Customer', render: (o) => <div><p className="font-medium text-sm">{o.customer}</p><p className="text-xs text-muted-foreground">{o.phone}</p></div> },
            { key: 'total', label: 'Total', render: (o) => <span className="font-bold">Rs. {o.total.toLocaleString()}</span> },
            { key: 'items', label: 'Items' },
            { key: 'payment', label: 'Payment', render: (o) => <Badge variant="outline" className="text-xs">{o.payment}</Badge> },
            { key: 'seller', label: 'Seller' },
            { key: 'status', label: 'Status', render: (o) => (
              <Badge className={cn("text-xs capitalize", statusColors[o.status] ?? 'bg-muted')}>{o.status}</Badge>
            )},
            { key: 'actions', label: '', render: (o) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7" onClick={() => adminRoute?.navigateToView(String(o.pk)) ?? setSelectedPk(o.pk)}><Eye className="w-3 h-3 mr-1" /> View</Button>
              </div>
            )},
          ]}
          onExport={() => {}} onFilter={() => {}}
        />
      </div>
    );

  return (
    <>
      {activePk != null ? detailView : listView}

      <Dialog open={docPreview != null} onOpenChange={(o) => { if (!o) setDocPreview(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{docPreview === 'packing' ? 'Packing slip' : 'Invoice'}</DialogTitle>
          </DialogHeader>
          {docInvoiceProps ? <InvoiceDocument {...docInvoiceProps} /> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDocPreview(null)}>Close</Button>
            <Button type="button" onClick={() => { if (docInvoiceProps) downloadInvoiceFile(docInvoiceProps); }}>
              <Download className="w-4 h-4 mr-2" /> Download Bill
            </Button>
            <Button type="button" variant="outline" onClick={runPrint}><Download className="w-4 h-4 mr-2" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount (max Rs. {refundRemaining.toLocaleString()})</Label><Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} /></div>
            <div><Label>Reason</Label><Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Required" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={refundMut.isPending || !order}
              onClick={async () => {
                if (!order) return;
                const amt = parseFloat(refundAmount);
                if (!Number.isFinite(amt) || amt <= 0) return;
                if (!refundReason.trim()) return;
                setActionErr('');
                try {
                  await refundMut.mutateAsync({
                    pk: order.pk,
                    payload: { amount: amt, reason: refundReason.trim() },
                  });
                  setRefundOpen(false);
                } catch (e) {
                  setActionErr(formatApiError(e));
                }
              }}
            >
              {refundMut.isPending ? 'Submitting…' : 'Submit refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderSettingsView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'order-settings'],
    queryFn: () => adminApi.orderSettings(),
  });
  const [refundDays, setRefundDays] = useState(7);
  const [cancelHours, setCancelHours] = useState(48);
  const [guestCheckout, setGuestCheckout] = useState(true);
  const [verifyRequired, setVerifyRequired] = useState(true);
  const [autoDelivery, setAutoDelivery] = useState(true);
  const [saveErr, setSaveErr] = useState('');
  const saveMut = useAdminMutation(adminApi.updateOrderSettings, [['admin', 'order-settings']]);

  useEffect(() => {
    if (!data) return;
    setRefundDays(data.refund_validity_days);
    setCancelHours(data.auto_cancel_hours);
    setGuestCheckout(!!data.guest_checkout);
    setVerifyRequired(!!data.order_verification_required);
    setAutoDelivery(!!data.auto_assign_delivery);
    setSaveErr('');
  }, [data]);

  const save = async () => {
    setSaveErr('');
    try {
      await saveMut.mutateAsync({
        refund_validity_days: refundDays,
        auto_cancel_hours: cancelHours,
        guest_checkout: guestCheckout,
        order_verification_required: verifyRequired,
        auto_assign_delivery: autoDelivery,
      });
    } catch (e) {
      setSaveErr(formatApiError(e));
    }
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading order settings…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load order settings.</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h2 className="text-lg font-bold">Order Settings</h2><p className="text-sm text-muted-foreground">Configure order processing rules</p></div>
      {saveErr ? <p className="text-sm text-destructive">{saveErr}</p> : null}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Order Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Refund Validity (days)</Label><Input type="number" min={0} value={refundDays} onChange={(e) => setRefundDays(parseInt(e.target.value, 10) || 0)} /></div>
            <div><Label>Auto-cancel after (hours)</Label><Input type="number" min={0} value={cancelHours} onChange={(e) => setCancelHours(parseInt(e.target.value, 10) || 0)} /></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Guest Checkout</p><p className="text-xs text-muted-foreground">Allow orders without account</p></div><Switch checked={guestCheckout} onCheckedChange={setGuestCheckout} /></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Order Verification Required</p><p className="text-xs text-muted-foreground">OTP verify before processing</p></div><Switch checked={verifyRequired} onCheckedChange={setVerifyRequired} /></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-sm">Auto-assign Delivery</p><p className="text-xs text-muted-foreground">Assign nearest delivery man</p></div><Switch checked={autoDelivery} onCheckedChange={setAutoDelivery} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Status Flow</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Pending → Processing', 'Processing → Shipped', 'Shipped → Delivered', 'Any → Refunded'].map((flow, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <span className="text-sm font-medium">{flow}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Button type="button" onClick={() => { void save(); }} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save Order Settings'}</Button>
    </div>
  );
}
