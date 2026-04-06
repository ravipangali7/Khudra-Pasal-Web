export interface ReelProduct {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  /** Leaf category slug for storefront / child rules (from API when present). */
  categorySlug?: string;
  parentCategorySlug?: string | null;
  description?: string;
  variants?: { type: string; options: string[] }[];
}

export interface ReelVendor {
  id: string;
  name: string;
  verified: boolean;
  avatar?: string;
  coverImage?: string;
  description?: string;
  location?: string;
  followers?: number;
  totalReels?: number;
}

export interface Reel {
  id: number;
  videoUrl: string;
  platform: "mp4" | "youtube" | "tiktok" | "instagram";
  caption: string;
  product: ReelProduct;
  vendor: ReelVendor;
  views: number;
  likes: number;
  shares?: number;
  commentsCount?: number;
  liked: boolean;
  bookmarked?: boolean;
  hasAddedToCart?: boolean;
  status?: "active" | "paused" | "deleted" | "flagged";
  createdAt?: string;
  thumbnail?: string;
  tags?: string[];
  category?: string;
  /** Raw API platform value for admin round-trip (e.g. direct_mp4). */
  platformApi?: string;
  isSponsored?: boolean;
  boostExpiresAt?: string | null;
  boostExpectedViews?: number | null;
  boostTier?: string;
  boostDailyBudgetNpr?: number | null;
}
