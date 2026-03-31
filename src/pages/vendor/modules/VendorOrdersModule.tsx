import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

type OrderDetail = Record<string, unknown>;
type RefundRow = {
  refund_number?: string;
  status?: string;
  amount?: number;
  reason?: string;
  created_at?: string;
};
type AddressRow = Record<string, unknown> | null;

function OrderDetailBody({
  detail,
  shipDraft,
  setShipDraft,
}: {
  detail: OrderDetail;
  shipDraft: { tracking: string; carrier: string; notes: string };
  setShipDraft: Dispatch<SetStateAction<{ tracking: string; carrier: string; notes: string }>>;
}) {
  const addr = detail.address as AddressRow;
  const lines = (detail.item_lines as Record<string, unknown>[]) || [];
  const refunds = (detail.refunds as RefundRow[]) || [];

  return (
    <div className="space-y-6 text-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
          <p className="font-medium">{String(detail.customer ?? '—')}</p>
          <p className="text-muted-foreground">{String(detail.customer_phone ?? '')}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment</p>
          <p>
            <span className="font-medium capitalize">{String(detail.payment_method ?? '—')}</span>
            {' · '}
            <Badge variant="outline" className="text-xs capitalize">
              {String(detail.payment_status ?? '—')}
            </Badge>
          </p>
          <p className="text-muted-foreground">Status: {String(detail.status ?? '—')}</p>
        </div>
      </div>

      {addr ? (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery address</p>
          <p className="font-medium">{String(addr.full_name ?? '')}</p>
          <p className="text-muted-foreground">{String(addr.mobile ?? '')}</p>
          {addr.secondary_contact ? (
            <p className="text-muted-foreground">Alt: {String(addr.secondary_contact)}</p>
          ) : null}
          <p>{String(addr.area_location ?? '')}</p>
          {addr.landmark ? <p className="text-muted-foreground">Landmark: {String(addr.landmark)}</p> : null}
          {addr.delivery_notes ? (
            <p className="text-muted-foreground whitespace-pre-wrap">Notes: {String(addr.delivery_notes)}</p>
          ) : null}
          {addr.google_map_link ? (
            <a
              href={String(addr.google_map_link)}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs underline break-all"
            >
              Map link
            </a>
          ) : null}
          {addr.latitude != null && addr.longitude != null ? (
            <p className="text-xs text-muted-foreground">
              {String(addr.latitude)}, {String(addr.longitude)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No delivery address (pickup or POS).</p>
      )}

      <div className="rounded-lg border p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Totals</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-w-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-right tabular-nums">Rs. {Number(detail.subtotal ?? 0).toLocaleString()}</span>
          <span className="text-muted-foreground">Delivery</span>
          <span className="text-right tabular-nums">Rs. {Number(detail.delivery_fee ?? 0).toLocaleString()}</span>
          <span className="text-muted-foreground">Discount</span>
          <span className="text-right tabular-nums">Rs. {Number(detail.discount_amount ?? 0).toLocaleString()}</span>
          <span className="font-semibold">Total</span>
          <span className="text-right font-semibold tabular-nums">Rs. {Number(detail.total ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {refunds.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wide">Refunds</p>
          <ul className="space-y-2">
            {refunds.map((r, i) => (
              <li key={r.refund_number ?? i} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{String(r.refund_number ?? '')}</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {String(r.status ?? '')}
                  </Badge>
                  <span className="font-medium">Rs. {Number(r.amount ?? 0).toLocaleString()}</span>
                </div>
                {r.reason ? (
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                    <span className="font-medium text-foreground">Reason: </span>
                    {r.reason}
                  </p>
                ) : null}
                {r.created_at ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{String(r.created_at)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Line items</p>
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="p-2 font-medium">Product</th>
                <th className="p-2 font-medium">SKU</th>
                <th className="p-2 font-medium text-right">Qty</th>
                <th className="p-2 font-medium text-right">Unit</th>
                <th className="p-2 font-medium text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {String(line.image_url ?? '').trim() ? (
                        <img
                          src={String(line.image_url)}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      ) : null}
                      <span>{String(line.name)}</span>
                    </div>
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">{String(line.sku ?? '—')}</td>
                  <td className="p-2 text-right tabular-nums">{String(line.qty)}</td>
                  <td className="p-2 text-right tabular-nums">Rs. {Number(line.unit_price).toLocaleString()}</td>
                  <td className="p-2 text-right font-medium tabular-nums">Rs. {Number(line.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shipping & notes</p>
        <div className="grid gap-2">
          <Label>Tracking</Label>
          <Input
            value={shipDraft.tracking}
            onChange={(e) => setShipDraft((d) => ({ ...d, tracking: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Carrier</Label>
          <Input
            value={shipDraft.carrier}
            onChange={(e) => setShipDraft((d) => ({ ...d, carrier: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Input
            value={shipDraft.notes}
            onChange={(e) => setShipDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

export default function VendorOrdersModule({ activeSection }: { activeSection: string }) {
  const qc = useQueryClient();
  const isReturns = activeSection === 'returns';
  const { data: ordersResp } = useQuery({
    queryKey: ['vendor', 'orders', activeSection],
    queryFn: () =>
      vendorApi.orders({
        page_size: 100,
        ...(activeSection === 'pending' ? { status: 'pending' } : {}),
        ...(isReturns ? { has_refund: true } : {}),
      }),
  });
  const { data: refundsResp } = useQuery({
    queryKey: ['vendor', 'refunds'],
    queryFn: () => vendorApi.refunds({ page_size: 100 }),
    enabled: isReturns,
  });
  const orders = useMemo(() => extractResults<Record<string, unknown>>(ordersResp), [ordersResp]);
  const refunds = useMemo(() => extractResults<Record<string, unknown>>(refundsResp), [refundsResp]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [shipDraft, setShipDraft] = useState({ tracking: '', carrier: '', notes: '' });

  const detailQuery = useQuery({
    queryKey: ['vendor', 'order-detail', detailId],
    queryFn: () => vendorApi.orderDetail(detailId!),
    enabled: Boolean(detailOpen && detailId),
  });

  useEffect(() => {
    const d = detailQuery.data;
    if (!d) return;
    setShipDraft({
      tracking: String(d.tracking_number ?? ''),
      carrier: String(d.carrier ?? ''),
      notes: String(d.notes ?? ''),
    });
  }, [detailQuery.data, detailId]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const onDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailId(null);
  };

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => vendorApi.updateOrder(id, { status }),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'order-detail', v.id] });
      toast.success('Order updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shipMut = useMutation({
    mutationFn: () =>
      vendorApi.updateOrder(detailId!, {
        tracking_number: shipDraft.tracking,
        carrier: shipDraft.carrier,
        notes: shipDraft.notes,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'order-detail', detailId] });
      toast.success('Shipping info saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailDialog = (
    <Dialog open={detailOpen} onOpenChange={onDetailOpenChange}>
      <DialogContent
        className={cn(
          'max-w-3xl max-h-[90vh] overflow-y-auto',
          'sm:max-w-3xl w-[calc(100vw-2rem)]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-mono">Order {detailId}</DialogTitle>
        </DialogHeader>
        {detailQuery.isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading order…</p>}
        {detailQuery.isError && (
          <p className="text-sm text-destructive py-4">
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load order'}
          </p>
        )}
        {detailQuery.data ? (
          <OrderDetailBody detail={detailQuery.data} shipDraft={shipDraft} setShipDraft={setShipDraft} />
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onDetailOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => shipMut.mutate()} disabled={shipMut.isPending || !detailQuery.data}>
            Save shipping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isReturns) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <AdminTable
          title="Return / refund requests"
          subtitle="Orders with refunds"
          data={orders}
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'customer', label: 'Customer' },
            { key: 'total', label: 'Total', render: (o) => `Rs. ${Number(o.total).toLocaleString()}` },
            {
              key: 'status',
              label: 'Status',
              render: (o) => <Badge className="text-xs capitalize">{String(o.status)}</Badge>,
            },
            {
              key: 'actions',
              label: '',
              render: (o) => (
                <Button size="sm" variant="outline" onClick={() => openDetail(String(o.id))}>
                  View details
                </Button>
              ),
            },
          ]}
        />
        <AdminTable
          title="Refunds"
          subtitle="All refund rows for your store"
          data={refunds}
          columns={[
            { key: 'id', label: 'Refund' },
            { key: 'order', label: 'Order' },
            { key: 'amount', label: 'Amount', render: (r) => `Rs. ${Number(r.amount).toLocaleString()}` },
            { key: 'status', label: 'Status' },
            { key: 'reason', label: 'Reason', className: 'max-w-xs truncate' },
            {
              key: 'view',
              label: '',
              render: (r) => (
                <Button size="sm" variant="outline" onClick={() => openDetail(String(r.order))}>
                  View order
                </Button>
              ),
            },
          ]}
        />
        {detailDialog}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title={activeSection === 'pending' ? 'Pending orders' : 'All orders'}
        data={orders}
        columns={[
          { key: 'id', label: 'Order', render: (o) => <span className="font-mono font-medium">{String(o.id)}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'items', label: 'Items' },
          {
            key: 'total',
            label: 'Total',
            render: (o) => <span className="font-medium">Rs. {Number(o.total).toLocaleString()}</span>,
          },
          {
            key: 'payment',
            label: 'Payment',
            render: (o) => (
              <Badge variant="outline" className="text-xs">
                {String(o.payment)}
              </Badge>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (o) => (
              <Select
                value={String(o.status)}
                onValueChange={(st) => statusMut.mutate({ id: String(o.id), status: st })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (o) => (
              <Button size="sm" variant="ghost" onClick={() => openDetail(String(o.id))}>
                View details
              </Button>
            ),
          },
        ]}
      />
      {detailDialog}
    </div>
  );
}
