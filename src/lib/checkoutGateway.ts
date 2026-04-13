/** sessionStorage key: JSON string array of order numbers pending eSewa verification */
export const CHECKOUT_ESEWA_ORDER_NUMBERS_KEY = 'khudrapasal_esewa_checkout_orders';

export function submitEsewaFormPost(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
