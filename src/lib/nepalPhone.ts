/**
 * Canonical 10-digit Nepal mobile (e.g. 98xxxxxxxx) for display and forms.
 * Mirrors server `core.phone_auth.normalize_nepal_phone` behavior.
 */
function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function nepalMobileCore(digits: string): string | null {
  if (!digits) return null;
  if (digits.startsWith("977") && digits.length > 3) {
    const rest = digits.slice(3);
    if (rest.length >= 10) return rest.slice(0, 10);
    return rest;
  }
  if (digits.length === 10 && digits.startsWith("9")) return digits;
  if (digits.length === 11 && digits.startsWith("09")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

export function normalizeNepalPhoneDigits(phoneInput: string): string | null {
  const core = nepalMobileCore(digitsOnly(phoneInput));
  if (!core || core.length !== 10 || !core.startsWith("9")) return null;
  return core;
}
