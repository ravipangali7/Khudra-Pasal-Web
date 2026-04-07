import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  extractResults,
  isPortalKycBlockedError,
  portalApi,
  PortalApiError,
  type PortalOrderRow,
} from "@/lib/api";

export type PortalOrdersSurface = "main" | "family" | "child";

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString("en-NP")}`;
}

/** Match server Decimal 2dp: 3% fee on gross, net = gross − fee */
function refundBreakdownDisplay(gross: number) {
  const g = Math.round(gross * 100) / 100;
  const fee = Math.round(g * 0.03 * 100) / 100;
  const net = Math.round((g - fee) * 100) / 100;
  return { gross: g, fee, net };
}

function remainingRefundGross(o: PortalOrderRow): number {
  const refunded =
    o.refunds
      ?.filter((r) => (r.status || "").toLowerCase() === "approved")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0;
  return Math.max(0, o.total - refunded);
}

function canRequestRefund(o: PortalOrderRow): boolean {
  const pay = (o.payment || "").toLowerCase();
  if (!pay.includes("wallet")) return false;
  const st = (o.status || "").toLowerCase();
  if (st === "cancelled" || st === "refunded") return false;
  if (o.refunds?.some((r) => r.status === "pending")) return false;
  return true;
}

type Props = {
  surface: PortalOrdersSurface;
  sessionTick: number;
  authed: boolean;
};

export default function PortalMyOrdersSection({ surface, sessionTick, authed }: Props) {
  const queryClient = useQueryClient();
  const [expandedOrderPk, setExpandedOrderPk] = useState<number | null>(null);
  const [refundOrder, setRefundOrder] = useState<PortalOrderRow | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const { data: ordersResp, isError: ordersError, isLoading: ordersLoading } = useQuery({
    queryKey: ["portal", "orders", surface, sessionTick],
    queryFn: () => portalApi.ordersForSurface(surface, { page_size: 100 }),
    enabled: authed,
    retry: false,
  });

  const orders = useMemo(() => extractResults<PortalOrderRow>(ordersResp), [ordersResp]);

  const refundMut = useMutation({
    mutationFn: async () => {
      if (!refundOrder) throw new Error("No order");
      return portalApi.requestOrderRefund(surface, refundOrder.pk, {
        reason: refundReason.trim(),
        notes: refundNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Refund request submitted. A super admin will review it.");
      setRefundOrder(null);
      setRefundReason("");
      setRefundNotes("");
      void queryClient.invalidateQueries({ queryKey: ["portal", "orders", surface] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "summary"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "notifications"] });
    },
    onError: (e: unknown) => {
      if (isPortalKycBlockedError(e)) {
        toast.error(typeof e.body.detail === "string" ? e.body.detail : "Action blocked.");
        return;
      }
      const msg =
        e instanceof PortalApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not submit refund request.";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-4">
      {ordersError && (
        <p className="text-sm text-destructive px-1">
          Could not load orders. Please refresh or try again later.
        </p>
      )}
      {ordersLoading && !ordersError && (
        <p className="text-sm text-muted-foreground px-1">Loading orders…</p>
      )}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground">
                <th className="w-10 p-2" aria-label="Expand" />
                <th className="text-left p-4 font-medium">Order</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Items</th>
                <th className="text-left p-4 font-medium">Payment</th>
                <th className="text-left p-4 font-medium">Vendor</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Total</th>
                <th className="text-right p-4 font-medium w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!ordersError && orders.length === 0 && !ordersLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No orders yet
                  </td>
                </tr>
              ) : null}
              {!ordersError && orders.length > 0
                ? orders.map((o) => (
                    <Fragment key={o.pk}>
                      <tr className="border-t border-border hover:bg-muted/20">
                        <td className="p-2 align-middle">
                          {o.lines.length > 0 || (o.refunds?.length ?? 0) > 0 ? (
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-muted"
                              aria-expanded={expandedOrderPk === o.pk}
                              onClick={() =>
                                setExpandedOrderPk((prev) => (prev === o.pk ? null : o.pk))
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 text-muted-foreground transition-transform",
                                  expandedOrderPk === o.pk && "rotate-180",
                                )}
                              />
                            </button>
                          ) : (
                            <span className="inline-block w-7" aria-hidden />
                          )}
                        </td>
                        <td className="p-4 font-medium">{o.id}</td>
                        <td className="p-4 text-muted-foreground">{o.date}</td>
                        <td className="p-4">{o.items}</td>
                        <td className="p-4">{o.payment}</td>
                        <td className="p-4">{o.seller}</td>
                        <td className="p-4 capitalize">{o.status}</td>
                        <td className="p-4 text-right font-medium">{formatPrice(o.total)}</td>
                        <td className="p-4 text-right">
                          {canRequestRefund(o) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setRefundOrder(o);
                                setRefundReason("");
                                setRefundNotes("");
                                setRefundAmount("");
                              }}
                            >
                              Request refund
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {expandedOrderPk === o.pk &&
                      (o.lines.length > 0 || (o.refunds?.length ?? 0) > 0) ? (
                        <tr key={`${o.pk}-lines`} className="border-t border-border bg-muted/30">
                          <td colSpan={9} className="p-0">
                            <div className="px-4 py-3 space-y-4">
                              {o.refunds && o.refunds.length > 0 ? (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Refunds
                                  </p>
                                  <ul className="space-y-2 text-xs">
                                    {o.refunds.map((r) => (
                                      <li
                                        key={r.refund_number}
                                        className="rounded-md border border-amber-500/25 bg-amber-500/5 p-2"
                                      >
                                        <div className="flex flex-wrap gap-2 items-center">
                                          <span className="font-mono">{r.refund_number}</span>
                                          <span className="capitalize text-muted-foreground">
                                            {r.status}
                                          </span>
                                          <span className="font-medium">
                                            {formatPrice(r.net_credit ?? r.amount)}
                                            {r.platform_fee != null ? (
                                              <span className="text-muted-foreground font-normal">
                                                {" "}
                                                (gross {formatPrice(r.gross_amount ?? r.amount)}, fee{" "}
                                                {formatPrice(r.platform_fee)})
                                              </span>
                                            ) : null}
                                          </span>
                                        </div>
                                        {r.reason ? (
                                          <p className="mt-1.5 text-foreground">
                                            <span className="font-medium">Reason: </span>
                                            {r.reason}
                                          </p>
                                        ) : null}
                                        <p className="text-muted-foreground mt-0.5">
                                          {r.created_at}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {o.lines.length > 0 ? (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Line items
                                  </p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground text-left">
                                        <th className="py-1 pr-2 font-medium">Product</th>
                                        <th className="py-1 pr-2 font-medium">Qty</th>
                                        <th className="py-1 pr-2 font-medium">Unit</th>
                                        <th className="py-1 font-medium text-right">Line total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {o.lines.map((line) => (
                                        <tr key={`${o.pk}-${line.product_id}`}>
                                          <td className="py-1.5 pr-2">{line.name}</td>
                                          <td className="py-1.5 pr-2 tabular-nums">
                                            {line.quantity}
                                          </td>
                                          <td className="py-1.5 pr-2 tabular-nums">
                                            {formatPrice(line.unit_price)}
                                          </td>
                                          <td className="py-1.5 text-right tabular-nums font-medium">
                                            {formatPrice(line.line_total)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={refundOrder != null}
        onOpenChange={(open) => {
          if (!open) setRefundOrder(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request refund</DialogTitle>
            {refundOrder ? (
              <p className="text-sm text-muted-foreground">
                Order {refundOrder.id} · {formatPrice(refundOrder.total)}
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-3">
            {refundOrder ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Refund breakdown (full remaining order)
                </p>
                {(() => {
                  const g = remainingRefundGross(refundOrder);
                  const { fee, net } = refundBreakdownDisplay(g);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original amount (gross)</span>
                        <span className="font-mono font-medium">{formatPrice(g)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">3% platform fee</span>
                        <span className="font-mono">−{formatPrice(fee)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border font-medium">
                        <span>Final refund to wallet</span>
                        <span className="font-mono text-primary">{formatPrice(net)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
            <div>
              <Label htmlFor="refund-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="refund-reason"
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Why are you requesting a refund?"
              />
            </div>
            <div>
              <Label htmlFor="refund-notes">Notes (optional)</Label>
              <Textarea
                id="refund-notes"
                rows={2}
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundOrder(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!refundReason.trim() || refundMut.isPending}
              onClick={() => refundMut.mutate()}
            >
              {refundMut.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
