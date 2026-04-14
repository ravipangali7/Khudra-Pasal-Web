/** Client-side decode of Google Sign-In JWT payload (no signature verification — display / prefill only). */

export type GoogleIdTokenPayload = {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  /** Present only with extra scopes; often absent on web Sign-In. */
  phone_number?: string;
};

export function decodeGoogleIdTokenPayload(credential: string): GoogleIdTokenPayload | null {
  const parts = credential.split(".");
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}

/** Matches server-side naming: prefer "Given Family" when both exist, else Google's `name`. */
export function gmailDisplayNameFromPayload(payload: GoogleIdTokenPayload | null): string {
  if (!payload) return "";
  const given = (payload.given_name || "").trim();
  const family = (payload.family_name || "").trim();
  if (given && family) return `${given} ${family}`.trim();
  if (given) return given;
  if (family) return family;
  const n = (payload.name || "").trim();
  if (n) return n;
  const em = (payload.email || "").split("@")[0]?.trim();
  return em || "";
}

/** Normalize E.164 or digit string to Nepal 10-digit mobile (no country prefix in form). */
export function googlePhoneToNepal10Digits(phone: string | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("977") && d.length >= 12) return d.slice(-10);
  if (d.length === 10 && d.startsWith("9")) return d;
  return "";
}

export const GOOGLE_OAUTH_PREFILL_STORAGE_KEY = "khudra_google_oauth_prefill_v1";

export type GoogleOauthPrefillStored = {
  displayName: string;
  phoneDigits: string;
};
