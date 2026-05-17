import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileImage, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InvoiceDocument, { invoicePrintStyles } from "@/components/admin/InvoiceDocument";
import type { PortalOrdersSurface } from "@/components/portal/PortalMyOrdersSection";
import { portalApi } from "@/lib/api";
import {
  downloadInvoiceFile,
  portalInvoiceToDocProps,
  type PortalOrderInvoicePayload,
} from "@/lib/invoiceUtils";
import { resolveMediaUrl } from "@/pages/admin/hooks/adminFormUtils";

type Props = {
  surface: PortalOrdersSurface;
  orderPk: number;
  orderNumber: string;
  sessionTick: number;
  authed: boolean;
  /** Open bill preview when URL has ?bill=1 (delivery notification deep link). */
  openBillOnMount?: boolean;
};

export default function PortalOrderBillActions({
  surface,
  orderPk,
  orderNumber,
  sessionTick,
  authed,
  openBillOnMount = false,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ["portal", "order-invoice", surface, orderPk, sessionTick],
    queryFn: () => portalApi.orderInvoiceForSurface(surface, orderPk),
    enabled: authed,
    retry: false,
  });

  useEffect(() => {
    if (openBillOnMount && invoiceQuery.data) {
      setPreviewOpen(true);
    }
  }, [openBillOnMount, invoiceQuery.data]);

  const payload = invoiceQuery.data as PortalOrderInvoicePayload | undefined;
  const doc = payload ? portalInvoiceToDocProps(payload) : null;
  const billPngUrl = payload?.bill_image_url
    ? resolveMediaUrl(payload.bill_image_url)
    : portalApi.orderBillImageUrl(surface, orderPk);

  const runPrint = () => {
    const el = document.createElement("style");
    el.setAttribute("data-invoice-print", "1");
    el.textContent = invoicePrintStyles();
    document.head.appendChild(el);
    window.print();
    setTimeout(() => {
      document.querySelectorAll("style[data-invoice-print]").forEach((n) => n.remove());
    }, 2000);
  };

  const downloadPng = async () => {
    try {
      const blob = await portalApi.fetchOrderBillBlob(surface, orderPk);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${orderNumber}-bill.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Could not download bill image.");
    }
  };

  if (invoiceQuery.isLoading) {
    return (
      <p className="text-xs text-muted-foreground">Loading bill…</p>
    );
  }

  if (invoiceQuery.isError || !doc) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="w-4 h-4 mr-1.5" />
          Preview bill
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => downloadInvoiceFile(doc)}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Download HTML
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void downloadPng()}>
          <FileImage className="w-4 h-4 mr-1.5" />
          Download PNG
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order bill — {orderNumber}</DialogTitle>
          </DialogHeader>
          {billPngUrl ? (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30 p-2 mb-4">
              <img
                src={billPngUrl}
                alt={`Bill for ${orderNumber}`}
                className="w-full max-h-[280px] object-contain mx-auto"
              />
            </div>
          ) : null}
          <InvoiceDocument {...doc} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={runPrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
            <Button type="button" variant="outline" onClick={() => downloadInvoiceFile(doc)}>
              <Download className="w-4 h-4 mr-1.5" />
              Download HTML
            </Button>
            <Button type="button" onClick={() => void downloadPng()}>
              <FileImage className="w-4 h-4 mr-1.5" />
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
