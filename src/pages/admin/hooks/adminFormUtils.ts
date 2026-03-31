export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 280);
}

export function normalizeHexColor(value: string): string {
  const v = value.trim();
  if (!v) return "";
  const withHash = v.startsWith("#") ? v : `#${v}`;
  const shortHex = /^#[0-9a-fA-F]{3}$/;
  const longHex = /^#[0-9a-fA-F]{6}$/;
  if (shortHex.test(withHash) || longHex.test(withHash)) {
    return withHash.toLowerCase();
  }
  return value;
}

export function appendIfDefined(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  fd.append(key, String(value));
}

/** Turn API media paths (e.g. /media/...) into a full URL for <img src>. */
/** Compact NPR display: Rs. 500, Rs. 1.2K, Rs. 10K, Rs. 1.5M */
export function formatCompactRs(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  if (!Number.isFinite(n)) return "Rs. —";
  if (n < 1000) return `${sign}Rs. ${Math.round(n).toLocaleString()}`;
  if (n < 1_000_000) {
    const k = n / 1000;
    const r = Math.round(k * 10) / 10;
    const s = Number.isInteger(r) ? String(r) : r.toFixed(1).replace(/\.0$/, "");
    return `${sign}Rs. ${s}K`;
  }
  const m = n / 1_000_000;
  const r = Math.round(m * 100) / 100;
  let s = r.toFixed(2).replace(/\.00$/, "");
  s = s.replace(/(\.\d)0$/, "$1");
  return `${sign}Rs. ${s}M`;
}

/** Human-readable message from fetch/API errors (Error or thrown JSON). */
export function formatApiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

export function resolveMediaUrl(path: string | undefined | null): string {
  const p = (path ?? "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  let origin = "";
  const base = import.meta.env.VITE_API_BASE ?? "/api";
  if (typeof base === "string" && base.startsWith("http")) {
    try {
      const u = new URL(base);
      origin = `${u.protocol}//${u.host}`;
    } catch {
      origin = "";
    }
  } else if (typeof window !== "undefined") {
    origin = window.location.origin;
  }
  return p.startsWith("/") ? `${origin}${p}` : `${origin}/${p}`;
}

/**
 * Prefer same-origin `/media/...` when the SPA runs on a different host/port than Django
 * (typical Vite + API). That way `/media` is proxied and PDF/img requests are same-origin,
 * so iframes are not blocked by X-Frame-Options on the API host.
 *
 * Only rewrites in “dev-like” hosts (localhost / 127.0.0.1 / ::1) so split production
 * domains are unchanged.
 */
export function resolveMediaUrlForDisplay(path: string | undefined | null): string {
  const resolved = resolveMediaUrl(path);
  if (!resolved) return "";

  let u: URL;
  try {
    u = new URL(resolved);
  } catch {
    return resolved;
  }

  if (!u.pathname.startsWith("/media/")) return resolved;
  if (typeof window === "undefined") return resolved;
  if (u.origin === window.location.origin) return resolved;

  const base = import.meta.env.VITE_API_BASE ?? "/api";
  let apiOrigin: string | null = null;
  if (typeof base === "string" && base.startsWith("http")) {
    try {
      apiOrigin = new URL(base).origin;
    } catch {
      apiOrigin = null;
    }
  }

  const localHost = (h: string) =>
    h === "localhost" || h === "127.0.0.1" || h === "[::1]";

  const devLike = localHost(u.hostname) || localHost(window.location.hostname);

  const backendMedia =
    (apiOrigin != null && u.origin === apiOrigin) ||
    (!base.startsWith("http") && localHost(u.hostname));

  if (backendMedia && devLike) {
    return `${u.pathname}${u.search}`;
  }

  return resolved;
}

/** PDF URL or KYC `document_file` storage path (often no `.pdf` in the stored name). */
export function isLikelyPdfMediaUrl(url: string): boolean {
  if (!url) return false;
  const pathOnly = url.split("?")[0].toLowerCase();
  if (pathOnly.endsWith(".pdf")) return true;
  if (/\/kyc\/files\//.test(pathOnly)) {
    return !/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(pathOnly);
  }
  return false;
}

