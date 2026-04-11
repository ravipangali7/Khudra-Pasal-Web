/** Safe in-app paths after login (open redirect prevention). */
const ALLOWED_PREFIXES = [
  "/product",
  "/category",
  "/search",
  "/deals",
  "/brands",
  "/shop",
  "/portal",
  "/dashboard",
  "/family-portal",
  "/child-portal",
  "/vendor",
  "/admin",
  "/reels",
  "/vendor/reels",
  "/join-family",
];

export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  const pathOnly = t.split("?")[0]?.split("#")[0] ?? t;
  if (pathOnly === "/") return "/";
  return ALLOWED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`)) ? t : null;
}
