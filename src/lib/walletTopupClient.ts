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

export function isWalletTopupRedirect(resp: unknown): resp is WalletTopupRedirectResponse {
  if (!resp || typeof resp !== 'object') return false;
  const r = resp as Record<string, unknown>;
  if (typeof r.flow !== 'string') return false;
  /** Gateway bodies use ok: true; tolerate omitted ok when flow + payload match. */
  if (r.ok !== undefined && r.ok !== true) return false;
  if (r.flow === 'esewa_redirect') {
    return (
      typeof r.action_url === 'string' &&
      r.fields != null &&
      typeof r.fields === 'object' &&
      !Array.isArray(r.fields)
    );
  }
  if (r.flow === 'khalti_redirect') {
    return typeof r.payment_url === 'string';
  }
  return false;
}

export function submitEsewaWalletTopupForm(actionUrl: string, fields: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  for (const [name, value] of Object.entries(fields)) {
    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = name;
    inp.value = value;
    form.appendChild(inp);
  }
  document.body.appendChild(form);
  form.submit();
}

/**
 * @returns true if a redirect was started (caller should skip balance toast / modal close until return).
 */
export function handleWalletTopupClientResponse(resp: unknown): boolean {
  if (!isWalletTopupRedirect(resp)) return false;
  if (resp.flow === 'esewa_redirect') {
    submitEsewaWalletTopupForm(resp.action_url, resp.fields);
    return true;
  }
  window.location.href = resp.payment_url;
  return true;
}
