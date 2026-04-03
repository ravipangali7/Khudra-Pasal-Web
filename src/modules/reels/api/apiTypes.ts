/** Shape of public reel JSON from Django `ReelPublicSerializer`. */
export interface ApiReelPublicRow {
  id: number;
  video_url: string;
  platform: string;
  caption: string;
  tags: string[];
  status: string;
  views: number;
  likes: number;
  shares: number;
  cart_adds: number;
  comments_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  has_added_to_cart?: boolean;
  created_at: string;
  thumbnail_url?: string | null;
  vendor: {
    id: number;
    store_name: string;
    store_slug: string;
    is_verified: boolean;
    logo_url: string;
  };
  product: {
    id: number;
    name: string;
    price: number;
    original_price: number;
    discount: number;
    image_url: string;
    in_stock: boolean;
    rating: number;
    reviews: number;
    category_slug?: string;
  } | null;
  is_sponsored?: boolean;
  boost_expires_at?: string | null;
  boost_expected_views?: number | null;
  boost_tier?: string;
  boost_daily_budget_npr?: number | null;
}
