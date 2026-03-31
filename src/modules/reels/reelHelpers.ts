import type { Reel, ReelVendor } from "./types";

/** Dedupe vendors from the current reel list and set totalReels per vendor. */
export function getUniqueVendorsFromReels(reels: Reel[]): ReelVendor[] {
  const counts = new Map<string, number>();
  const byId = new Map<string, ReelVendor>();
  reels.forEach((r) => {
    const id = r.vendor.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (!byId.has(id)) byId.set(id, r.vendor);
  });
  return Array.from(byId.values()).map((v) => ({
    ...v,
    totalReels: counts.get(v.id) ?? 0,
  }));
}

export function filterReelsByVendorId(reels: Reel[], vendorId: string): Reel[] {
  return reels.filter((r) => r.vendor.id === vendorId);
}
