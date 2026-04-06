import type { Reel } from "../types";
import type { PagedResponse } from "@/lib/api";
import type { ApiReelPublicRow } from "./apiTypes";

export type { ApiReelPublicRow } from "./apiTypes";

function mapPlatform(p: string): "mp4" | "youtube" | "tiktok" | "instagram" {
  if (p === "direct_mp4") return "mp4";
  if (p === "youtube_shorts") return "youtube";
  if (p === "tiktok") return "tiktok";
  if (p === "instagram") return "instagram";
  return "mp4";
}

/** Maps UI platform to Django `Reel.platform` enum values. */
export function mapUiPlatformToApi(
  p: Reel["platform"] | string | undefined,
): string {
  const v = String(p || "mp4");
  if (v === "mp4" || v === "direct_mp4") return "direct_mp4";
  if (v === "youtube" || v === "youtube_shorts") return "youtube_shorts";
  if (v === "tiktok") return "tiktok";
  if (v === "instagram") return "instagram";
  return "direct_mp4";
}

export type AdminBoostStatus = "none" | "standard" | "premium" | "mega";

export function boostStatusFromReel(
  reel: Pick<Reel, "isSponsored" | "boostExpiresAt" | "boostTier">,
): AdminBoostStatus {
  if (!reel.isSponsored || !reel.boostExpiresAt) return "none";
  const exp = new Date(reel.boostExpiresAt).getTime();
  if (Number.isNaN(exp) || exp <= Date.now()) return "none";
  const t = reel.boostTier;
  if (t === "premium" || t === "mega" || t === "standard") return t;
  return "standard";
}

export function boostStatusFromApiRow(row: ApiReelPublicRow): AdminBoostStatus {
  return boostStatusFromReel({
    isSponsored: Boolean(row.is_sponsored),
    boostExpiresAt: row.boost_expires_at ?? null,
    boostTier: row.boost_tier,
  });
}

function mapApiStatusToUi(status: string): NonNullable<Reel["status"]> {
  if (status === "active" || status === "approved") return "active";
  if (status === "rejected") return "flagged";
  if (status === "pending" || status === "draft") return "paused";
  return "active";
}

/** Maps admin UI reel status to API `Reel.status` values (draft/pending/approved/rejected/active). */
export function mapUiReelStatusToApi(status: string | undefined): string {
  if (status === "paused") return "pending";
  if (status === "flagged") return "rejected";
  return "active";
}

export function mapApiReelToUi(row: ApiReelPublicRow): Reel {
  const thumb = row.thumbnail_url || "";
  const p = row.product;
  const placeholder = "https://placehold.co/56x56/1E1E1E/fff?text=R";
  return {
    id: row.id,
    videoUrl: row.video_url,
    platform: mapPlatform(row.platform),
    platformApi: row.platform,
    caption: row.caption || "",
    product: p
      ? {
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.original_price,
          discount: p.discount,
          image: p.image_url || thumb || placeholder,
          inStock: p.in_stock,
          rating: p.rating,
          reviews: p.reviews,
          categorySlug: p.category_slug || undefined,
          parentCategorySlug: p.parent_category_slug ?? undefined,
        }
      : {
          id: 0,
          name: "No product linked",
          price: 0,
          originalPrice: 0,
          discount: 0,
          image: thumb || placeholder,
          inStock: false,
          rating: 0,
          reviews: 0,
        },
    vendor: {
      id: String(row.vendor.id),
      name: row.vendor.store_name,
      verified: row.vendor.is_verified,
      avatar: row.vendor.logo_url || undefined,
    },
    views: row.views,
    likes: row.likes,
    shares: row.shares,
    commentsCount: row.comments_count ?? 0,
    liked: Boolean(row.is_liked),
    bookmarked: Boolean(row.is_bookmarked),
    hasAddedToCart: Boolean(row.has_added_to_cart),
    tags: Array.isArray(row.tags) ? row.tags : [],
    thumbnail: thumb || undefined,
    status: mapApiStatusToUi(row.status),
    createdAt: row.created_at,
    isSponsored: Boolean(row.is_sponsored),
    boostExpiresAt: row.boost_expires_at ?? null,
    boostExpectedViews:
      row.boost_expected_views != null ? row.boost_expected_views : null,
    boostTier: row.boost_tier || undefined,
    boostDailyBudgetNpr:
      row.boost_daily_budget_npr != null ? row.boost_daily_budget_npr : null,
  };
}

export function extractReelResults(data: unknown): ApiReelPublicRow[] {
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as PagedResponse<ApiReelPublicRow>).results)
  ) {
    return (data as PagedResponse<ApiReelPublicRow>).results;
  }
  if (Array.isArray(data)) return data as ApiReelPublicRow[];
  return [];
}
