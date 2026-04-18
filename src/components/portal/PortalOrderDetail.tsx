import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
import {
  isPortalKycBlockedError,
  portalApi,
  PortalApiError,
  type PortalOrderRow,
} from "@/lib/api";
import type { PortalOrdersSurface } from "@/components/portal/PortalMyOrdersSection";

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString("en-NP")}`;
}

function remainingRefundGross(o: PortalOrderRow): number {
  const refunded =
    o.refunds
      ?.filter((r) => (r.status || "").toLowerCase() === "approved")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0) ?? 0;
  return Math.max(0, o.total - refunded);
}

function canRequestRefund(o: PortalOrderRow): boolean {
  if (typeof o.refund_allowed === "boolean") return o.refund_allowed;
  const pay = (o.payment || "").toLowerCase();
  if (!pay.includes("wallet")) return false;
  const st = (o.status || "").toLowerCase();
  if (st === "cancelled" || st === "refunded") return false;
  if (o.refunds?.some((r) => r.status === "pending")) return false;
  return true;
}

type Props = {
  surface: PortalOrdersSurface;
  orderPk: number;
  listHref: string;
  sessionTick: number;
  authed: boolean;
};

export default function PortalOrderDetail({
  surface,
  orderPk,
  listHref,
  sessionTick,
  authed,
}: Props) {
  const queryClient = useQueryClient();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const orderQuery = useQuery({
    queryKey: ["portal", "order", surface, orderPk, sessionTick],
    queryFn: () => portalApi.orderDetailForSurface(surface, orderPk),
    enabled: authed,
    retry: false,
  });

  const o = orderQuery.data;

  const refundMut = useMutation({
    mutationFn: async () => {
      if (!o) throw new Error("No order");
      return portalApi.requestOrderRefund(surface, o.pk, {
        reason: refundReason.trim(),
        notes: refundNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Refund request submitted. A super admin will review it.");
      setRefundOpen(false);
      setRefundReason("");
      setRefundNotes("");
      void queryClient.invalidateQueries({ queryKey: ["portal", "order", surface, orderPk] });
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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="h-8 -ml-2" asChild>
          <Link to={listHref}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to orders
          </Link>
        </Button>
      </div>

      {orderQuery.isError && (
        <p className="text-sm text-destructive px-1">
          Could not load this order. It may have been removed or you may not have access.
        </p>
      )}
      {orderQuery.isLoading && !orderQuery.isError && (
        <p className="text-sm text-muted-foreground px-1">Loading order…</p>
      )}

      {o ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 md:p-6 space-y-6 border-b border-border">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Order
                </p>
                <h3 className="text-lg font-semibold">{o.id}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {o.date} · {o.payment} ·{" "}
                  <span className="capitalize">{o.status}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">Vendor: {o.seller}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="text-xl font-semibold tabular-nums">{formatPrice(o.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{o.items} item(s)</p>
              </div>
            </div>
            {canRequestRefund(o) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setRefundOpen(true);
                  setRefundReason("");
                  setRefundNotes("");
                }}
              >
                Request refund
              </Button>
            ) : null}
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {o.refunds && o.refunds.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Refunds</p>
                <ul className="space-y-2 text-sm">
                  {o.refunds.map((r) => (
                    <li
                      key={r.refund_number}
                      className="rounded-md border border-amber-500/25 bg-amber-500/5 p-3"
                    >
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-mono text-xs">{r.refund_number}</span>
                        <span className="capitalize text-muted-foreground text-xs">
                          {r.status}
                        </span>
                        <span className="font-medium">
                          {formatPrice(r.net_credit ?? r.amount)}
                          {r.platform_fee != null ? (
                            <span className="text-muted-foreground font-normal text-xs">
                              {" "}
                              (gross {formatPrice(r.gross_amount ?? r.amount)}, retention{" "}
                              {formatPrice(r.platform_fee)})
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {r.reason ? (
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Reason: </span>
                          {r.reason}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground text-xs mt-1">{r.created_at}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {o.lines.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Line items</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-xs text-muted-foreground text-left">
                        <th className="p-3 font-medium">Product</th>
                        <th className="p-3 font-medium">Qty</th>
                        <th className="p-3 font-medium">Unit</th>
                        <th className="p-3 font-medium text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.lines.map((line) => (
                        <tr key={`${o.pk}-${line.product_id}`} className="border-t border-border">
                          <td className="p-3">{line.name}</td>
                          <td className="p-3 tabular-nums">{line.quantity}</td>
                          <td className="p-3 tabular-nums">{formatPrice(line.unit_price)}</td>
                          <td className="p-3 text-right tabular-nums font-medium">
                            {formatPrice(line.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No line items on this order.</p>
            )}
          </div>
        </div>
      ) : null}

      <Dialog
        open={refundOpen && o != null}
        onOpenChange={(open) => {
          if (!open) setRefundOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request refund</DialogTitle>
            {o ? (
              <p className="text-sm text-muted-foreground">
                Order {o.id} · {formatPrice(o.total)}
              </p>
            ) : null}
          </DialogHeader>
          {o ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Refund breakdown (full remaining order)
                </p>
                {(() => {
                  const g = remainingRefundGross(o);
                  const est = o.refund_estimate;
                  const gross = est?.gross ?? g;
                  const fee = est?.platform_fee ?? 0;
                  const net = est?.net_credit ?? g;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross (remaining)</span>
                        <span className="font-mono font-medium">{formatPrice(gross)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Platform retention (
                          {est?.platform_retention_label ?? "wallet rules on commission slice"})
                        </span>
                        <span className="font-mono">−{formatPrice(fee)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border font-medium">
                        <span>Credit to your wallet</span>
                        <span className="font-mono text-primary">{formatPrice(net)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div>
                <Label htmlFor="detail-refund-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="detail-refund-reason"
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Why are you requesting a refund?"
                />
              </div>
              <div>
                <Label htmlFor="detail-refund-notes">Notes (optional)</Label>
                <Textarea
                  id="detail-refund-notes"
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!refundReason.trim() || refundMut.isPending || !o}
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
