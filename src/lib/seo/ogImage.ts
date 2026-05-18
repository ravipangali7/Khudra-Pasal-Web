/** Pick the first real image URL for og:image (never placeholders). */
export function pickOgImage(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const c of candidates) {
    const t = (c || '').trim();
    if (!t) continue;
    if (/placeholder/i.test(t)) continue;
    return t;
  }
  return undefined;
}
