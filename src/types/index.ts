/** Nav / filter slug: `all` or a `Category.slug` from the API. */
export type StorefrontCategorySlug = 'all' | (string & {});

/** @deprecated Use `StorefrontCategorySlug` or `string`; kept for gradual migration. */
export type CategoryId = StorefrontCategorySlug;

export interface Category {
  id: string;
  name: string;
  icon: string;
  children?: Category[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Leaf category slug (product’s assigned category). */
  category: string;
  /** Parent category slug when product is under a child category. */
  parentCategorySlug?: string | null;
  /** Leaf first, then ancestors to root; used for family product rules. */
  categoryAncestorSlugs?: string[];
  /** Display name of the parent category when present. */
  parentCategoryName?: string | null;
  /** Display name of the leaf category. */
  categoryName?: string;
  rating?: number;
  reviewCount?: number;
  discount?: number;
  /** When set, how `discount` is interpreted for display (flat = Rs off; percentage = % off list). */
  discountType?: 'flat' | 'percentage';
  vendor?: Vendor;
  inStock?: boolean;
  /** Unit short name and/or stock hint for cards. */
  unit?: string;
  isBestseller?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  /** Public storefront path: `/store/:storeSlug` */
  storeSlug?: string;
  logo?: string;
  rating?: number;
  isVerified?: boolean;
}

export interface CartItem {
  /** Server CartItem PK when synced with `/website/cart/`. */
  cartItemId?: number;
  product: Product;
  quantity: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  category?: string;
  link?: string;
  gradient?: string;
}
