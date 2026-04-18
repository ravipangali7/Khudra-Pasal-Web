/** Client handling for PSP wallet top-up API responses (eSewa form POST + Khalti redirect). */

export type WalletTopupRedirectResponse =
  | {
      ok: true;
      flow: 'esewa_redirect';
      action_url: string;
      fields: Record<string, string>;
    }
  | {
      ok: true;
      flow: 'khalti_redirect';
      payment_url: string;
      pidx: string;
      purchase_order_id: string;
      expires_at?: string;
      expires_in?: number;
    };

function pickEsewaRedirectPayload(
  r: Record<string, unknown>,
): { actionUrl: string; fields: Record<string, string> } | null {
  if (typeof r.flow !== 'string' || r.flow !== 'esewa_redirect') return null;
  /** Gateway bodies use ok: true; tolerate omitted ok when flow + payload match. */
  if (r.ok !== undefined && r.ok !== true) return null;
  const actionUrl =
    (typeof r.action_url === 'string' && r.action_url.trim()) ||
    (typeof r.actionUrl === 'string' && r.actionUrl.trim()) ||
    '';
  const raw = r.fields;
  if (!actionUrl || raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    fields[k] = v == null ? '' : String(v);
  }
  return { actionUrl, fields };
}

export function isWalletTopupRedirect(resp: unknown): resp is WalletTopupRedirectResponse {
  if (!resp || typeof resp !== 'object') return false;
  const r = resp as Record<string, unknown>;
  if (pickEsewaRedirectPayload(r)) return true;
  if (typeof r.flow !== 'string' || r.flow !== 'khalti_redirect') return false;
  if (r.ok !== undefined && r.ok !== true) return false;
  const paymentUrl =
    (typeof r.payment_url === 'string' && r.payment_url) ||
    (typeof r.paymentUrl === 'string' && r.paymentUrl) ||
    '';
  return paymentUrl.trim().length > 0;
}

export function submitEsewaWalletTopupForm(actionUrl: string, fields: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.target = '_self';
  for (const [name, value] of Object.entries(fields)) {
    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = name;
    inp.value = value == null ? '' : String(value);
    form.appendChild(inp);
  }
  document.body.appendChild(form);
  form.submit();
}

/**
 * @returns true if a redirect was started (caller should skip balance toast / modal close until return).
 */
export function handleWalletTopupClientResponse(resp: unknown): boolean {
  if (!resp || typeof resp !== 'object') return false;
  const r = resp as Record<string, unknown>;
  const esewa = pickEsewaRedirectPayload(r);
  if (esewa) {
    submitEsewaWalletTopupForm(esewa.actionUrl, esewa.fields);
    return true;
  }
  if (typeof r.flow !== 'string' || r.flow !== 'khalti_redirect') return false;
  if (r.ok !== undefined && r.ok !== true) return false;
  const paymentUrl =
    (typeof r.payment_url === 'string' && r.payment_url) ||
    (typeof r.paymentUrl === 'string' && r.paymentUrl) ||
    '';
  if (!paymentUrl.trim()) return false;
  window.location.href = paymentUrl;
  return true;
}
