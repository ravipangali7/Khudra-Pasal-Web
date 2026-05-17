import type { InvoiceDocProps } from "@/components/admin/InvoiceDocument";
import { resolveBrandingLogoUrl } from "@/components/admin/InvoiceDocument";
import { resolveMediaUrl } from "@/pages/admin/hooks/adminFormUtils";

export type PortalOrderInvoicePayload = InvoiceDocProps & {
  has_bill_image?: boolean;
  bill_image_url?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildInvoiceDownloadHtml(doc: InvoiceDocProps): string {
  const cur = doc.branding.currency || "NPR";
  const siteLogo = resolveBrandingLogoUrl(doc.branding.site_logo_url);
  const priceColumns = doc.hidePrices
    ? ""
    : `
      <th style="text-align:right; padding: 8px 0;">Price</th>
      <th style="text-align:right; padding: 8px 0;">Total</th>
  `;
  const lineRows = doc.lines
    .map(
      (line) => `
      <tr>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; width: 48px;">
          ${
            line.image_url
              ? `<img src="${escapeHtml(resolveMediaUrl(line.image_url))}" alt="" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />`
              : `<div style="width: 40px; height: 40px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0;"></div>`
          }
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">${escapeHtml(line.name)}</td>
        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${line.qty}</td>
        ${
          doc.hidePrices
            ? ""
            : `<td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${cur} ${line.unit_price.toLocaleString()}</td>`
        }
        ${
          doc.hidePrices
            ? ""
            : `<td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align:right;">${cur} ${line.total.toLocaleString()}</td>`
        }
      </tr>
  `,
    )
    .join("");
  const totalsBlock = doc.hidePrices
    ? ""
    : `
      <div style="margin-top: 16px; margin-left:auto; width: 320px;">
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Subtotal</span><span>${cur} ${doc.subtotal.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Discount</span><span>${cur} ${doc.discount.toLocaleString()}</span></div>
        <div style="display:flex; justify-content:space-between; padding: 4px 0;"><span>Delivery</span><span>${cur} ${doc.delivery.toLocaleString()}</span></div>
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
          <img src="${escapeHtml(siteLogo)}" alt="" style="width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;" />
          <div>
            <h1 style="margin:0; font-size: 22px;">${escapeHtml(doc.branding.site_name)}</h1>
            ${doc.branding.phone ? `<div style="color:#475569; font-size: 13px; margin-top: 4px;">${escapeHtml(doc.branding.phone)}</div>` : ""}
            ${doc.branding.address ? `<div style="color:#475569; font-size: 13px; margin-top: 2px;">${escapeHtml(doc.branding.address)}</div>` : ""}
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
        ${doc.billTo.phone ? `<div style="font-size: 13px; color:#475569;">${escapeHtml(doc.billTo.phone)}</div>` : ""}
        ${doc.billTo.address ? `<div style="font-size: 13px; color:#475569;">${escapeHtml(doc.billTo.address)}</div>` : ""}
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

export function downloadInvoiceFile(doc: InvoiceDocProps): void {
  const blob = new Blob([buildInvoiceDownloadHtml(doc)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = doc.hidePrices ? "packing-slip" : "invoice";
  a.href = url;
  a.download = `${doc.docId}-${suffix}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function portalInvoiceToDocProps(payload: PortalOrderInvoicePayload): InvoiceDocProps {
  return {
    title: payload.title,
    docId: payload.docId,
    date: payload.date,
    branding: payload.branding,
    billTo: payload.billTo,
    lines: payload.lines,
    subtotal: payload.subtotal,
    discount: payload.discount,
    delivery: payload.delivery,
    total: payload.total,
    notes: payload.notes,
    hidePrices: payload.hidePrices,
  };
}
