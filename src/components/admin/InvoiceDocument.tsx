import { resolveMediaUrl } from "@/pages/admin/hooks/adminFormUtils";

export type InvoiceLine = {
  name: string;
  sku?: string;
  qty: number;
  unit_price: number;
  total: number;
  image_url?: string;
};

export type InvoiceDocProps = {
  title: string;
  docId: string;
  date: string;
  branding: {
    site_name: string;
    site_logo_url?: string;
    phone?: string;
    address?: string;
    currency?: string;
  };
  billTo: { name: string; phone?: string; address?: string };
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  notes?: string;
  hidePrices?: boolean;
};

export function invoicePrintStyles() {
  return `
    @media print {
      @page { size: auto; margin: 10mm; }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: #fff !important;
      }
      body * { visibility: hidden !important; }
      #invoice-print-root, #invoice-print-root * { visibility: visible !important; }
      #invoice-print-root {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #fff !important;
      }
      #invoice-print-root table,
      #invoice-print-root tr,
      #invoice-print-root td,
      #invoice-print-root th {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      #invoice-print-root img {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

export default function InvoiceDocument({
  title,
  docId,
  date,
  branding,
  billTo,
  lines,
  subtotal,
  discount,
  delivery,
  total,
  notes,
  hidePrices,
}: InvoiceDocProps) {
  const cur = branding.currency || "NPR";
  const logo = branding.site_logo_url ? resolveMediaUrl(branding.site_logo_url) : "";

  return (
    <div id="invoice-print-root" className="invoice-doc bg-white text-slate-900 text-sm max-w-3xl mx-auto p-6 border rounded-lg shadow-sm">
      <div className="flex justify-between items-start gap-6 border-b pb-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {logo ? (
            <img src={logo} alt="" className="h-14 w-auto max-w-[140px] object-contain" />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500">
              {branding.site_name?.[0] ?? "K"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">{branding.site_name}</h1>
            {branding.phone ? <p className="text-xs text-slate-600">{branding.phone}</p> : null}
            {branding.address ? <p className="text-xs text-slate-600 whitespace-pre-wrap">{branding.address}</p> : null}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="font-mono font-semibold">{docId}</p>
          <p className="text-xs text-slate-600 mt-1">{date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase">Bill to</p>
          <p className="font-medium">{billTo.name}</p>
          {billTo.phone ? <p className="text-xs text-slate-600">{billTo.phone}</p> : null}
          {billTo.address ? <p className="text-xs text-slate-600 mt-1">{billTo.address}</p> : null}
        </div>
      </div>

      <table className="w-full text-left border-collapse mb-4">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <th className="py-2 pr-2 w-10" />
            <th className="py-2 pr-2">Item</th>
            {!hidePrices ? <th className="py-2 pr-2 text-right">Price</th> : null}
            <th className="py-2 pr-2 text-right">Qty</th>
            {!hidePrices ? <th className="py-2 text-right">Total</th> : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const img = line.image_url ? resolveMediaUrl(line.image_url) : "";
            return (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-2 align-middle">
                  {img ? (
                    <img src={img} alt="" className="h-10 w-10 rounded object-cover border" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-100" />
                  )}
                </td>
                <td className="py-2 pr-2 align-middle">
                  <span className="font-medium">{line.name}</span>
                  {line.sku ? <span className="block text-xs text-slate-500">SKU: {line.sku}</span> : null}
                </td>
                {!hidePrices ? (
                  <td className="py-2 pr-2 text-right align-middle whitespace-nowrap">
                    {cur} {line.unit_price.toLocaleString()}
                  </td>
                ) : null}
                <td className="py-2 pr-2 text-right align-middle">{line.qty}</td>
                {!hidePrices ? (
                  <td className="py-2 text-right align-middle whitespace-nowrap font-medium">
                    {cur} {line.total.toLocaleString()}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {!hidePrices ? (
        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span>
                {cur} {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Discount</span>
              <span>
                {cur} {discount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery</span>
              <span>
                {cur} {delivery.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-base">
              <span>Total</span>
              <span className="text-emerald-700">
                {cur} {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {notes ? <p className="text-xs text-slate-500 mt-6">{notes}</p> : null}

      <p className="text-center text-xs text-slate-400 mt-8">Thank you for your business.</p>
    </div>
  );
}
