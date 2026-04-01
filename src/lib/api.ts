import { CartItem, Product } from "@/types";
import type { ApiReelPublicRow } from "@/modules/reels/api/apiTypes";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/** Sent as `placed_portal` on checkout; portal shells set this in sessionStorage before /checkout. */
export type CheckoutPlacedPortal = "portal_main" | "portal_family" | "portal_child";
export const CHECKOUT_PLACED_PORTAL_KEY = "khudrapasal_checkout_placed_portal";

export function setCheckoutPlacedPortal(surface: CheckoutPlacedPortal): void {
  try {
    sessionStorage.setItem(CHECKOUT_PLACED_PORTAL_KEY, surface);
  } catch {
    /* private mode / quota */
  }
}

export function getCheckoutPlacedPortal(): CheckoutPlacedPortal {
  try {
    const v = sessionStorage.getItem(CHECKOUT_PLACED_PORTAL_KEY);
    if (v === "portal_family" || v === "portal_child") return v;
  } catch {
    /* ignore */
  }
  return "portal_main";
}

/** Browser hits this origin for OAuth starts (must reach Django; use VITE_API_ORIGIN if API is on another host). */
export function getApiOrigin(): string {
  const explicit = import.meta.env.VITE_API_ORIGIN as string | undefined;
  if (explicit?.trim()) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
const AUTH_TOKEN_KEY = "khudrapasal_auth_token";
const ADMIN_TOKEN_KEY = "khudrapasal_admin_token";
export const VENDOR_TOKEN_KEY = "khudrapasal_vendor_token";
export const PORTAL_TOKEN_KEY = "khudrapasal_portal_token";
const LOGIN_SURFACE_KEY = "khudrapasal_login_surface";
const looksLikeJwt = (token: string) => token.split(".").length === 3;

function buildAuthHeaderValue(token: string): string {
  return looksLikeJwt(token) ? `Bearer ${token}` : `Token ${token}`;
}

/** From unified login API, or `not_vendor` after a failed vendor access probe (legacy sessions). */
export type LoginSurface = "admin" | "vendor" | "portal" | "not_vendor";

export function getLoginSurface(): LoginSurface | null {
  const v = localStorage.getItem(LOGIN_SURFACE_KEY);
  if (v === "admin" || v === "vendor" || v === "portal" || v === "not_vendor") return v;
  return null;
}

export function setLoginSurface(surface: LoginSurface) {
  localStorage.setItem(LOGIN_SURFACE_KEY, surface);
}

function clearLoginSurface() {
  localStorage.removeItem(LOGIN_SURFACE_KEY);
}

export function getAuthToken(): string | null {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    localStorage.getItem(VENDOR_TOKEN_KEY) ||
    localStorage.getItem(PORTAL_TOKEN_KEY)
  );
}

export function isStorefrontCustomerSession(): boolean {
  if (!getAuthToken()) return false;
  const surface = getLoginSurface();
  return surface === null || surface === "portal";
}

/** Pass `surface` from unified login so portals can avoid calling vendor APIs with a customer/admin token. */
export function setAuthToken(token: string, surface?: "admin" | "vendor" | "portal") {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(VENDOR_TOKEN_KEY);
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  if (surface !== undefined) {
    setLoginSurface(surface);
  } else {
    clearLoginSurface();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("khudra-auth-changed"));
  }
}

export function clearAllAuthTokens() {
  [AUTH_TOKEN_KEY, ADMIN_TOKEN_KEY, VENDOR_TOKEN_KEY, PORTAL_TOKEN_KEY].forEach((k) =>
    localStorage.removeItem(k),
  );
  clearLoginSurface();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("khudra-auth-changed"));
  }
}

/** Unified session: all portals share one token after login. */
export const setAdminToken = setAuthToken;
export const clearAdminToken = clearAllAuthTokens;
export const setVendorToken = setAuthToken;
export const clearVendorToken = clearAllAuthTokens;
export const setPortalToken = setAuthToken;
export const clearPortalToken = clearAllAuthTokens;

export type WebsiteCategory = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  image_url?: string;
  sort_order?: number;
  children: WebsiteCategory[];
};

export type WebsiteBrand = {
  id: number;
  name: string;
  logo_url: string;
};

export type WebsiteStoreInfo = {
  site_name: string;
  site_description: string;
  site_email: string;
  phone: string;
  address: string;
  currency: string;
  footer_text: string;
  site_logo_url: string;
};

/** Root category + nested children + capped products (GET /website/catalog/). */
export type WebsiteCatalogCategory = WebsiteCategory & {
  products: WebsiteProduct[];
};

/** Matches VendorMiniSerializer from GET /api/website/products/ and /api/products/all-vendors/ */
export type WebsiteVendorMini = {
  id: number;
  store_name: string;
  store_slug: string;
  rating: string;
  is_verified: boolean;
  logo_url?: string;
};

export type WebsiteProductImage = {
  id: number;
  image_url: string;
  sort_order: number;
};

export type WebsiteProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  /** Effective unit price (matches cart; sale price when discounted). */
  price: string;
  list_price?: string;
  original_price: string;
  discount_price?: string | null;
  category_id?: number;
  category_slug: string;
  category_name: string;
  parent_category_slug?: string | null;
  parent_category_name?: string | null;
  unit_short_name?: string;
  stock: number;
  rating: string;
  review_count: number;
  status: string;
  is_featured: boolean;
  is_bestseller: boolean;
  image_url: string;
  images?: WebsiteProductImage[];
  created_at: string;
  seller?: WebsiteVendorMini | null;
  /** Present on GET /website/products/:id/ when the user is authenticated. */
  can_submit_review?: boolean;
};

export type PagedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Nested row from GET /api/website/deals/ (FlashDealSerializer). */
export type WebsiteFlashDealProductRow = {
  product: WebsiteProduct;
  override_price: string | null;
};

export type WebsiteFlashDealRow = {
  id: number;
  name: string;
  discount_percent: string;
  start_at: string;
  end_at: string;
  status: string;
  priority: number;
  products: WebsiteFlashDealProductRow[];
};

export type QueryParams = Record<string, string | number | boolean | undefined>;
export type ReelInteractionType = "like" | "bookmark" | "share" | "cart_add";

/** Row from GET /api/reels/vendors/ */
export type VendorWithPublicReelsRow = {
  id: number;
  store_name: string;
  store_slug: string;
  is_verified: boolean;
  logo_url: string;
  public_reel_count: number;
};

export function extractResults<T>(data: unknown): T[] {
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as PagedResponse<T>).results)
  ) {
    return (data as PagedResponse<T>).results;
  }
  if (Array.isArray(data)) return data as T[];
  return [];
}

export type AdminOrderListRow = {
  id: string;
  pk: number;
  customer: string;
  phone: string;
  total: number;
  items: number;
  status: string;
  date: string;
  payment: string;
  seller: string;
  address: string;
};

export type AdminOrderDetail = AdminOrderListRow & {
  item_lines: {
    name: string;
    sku?: string;
    qty: number;
    unit_price: number;
    total: number;
    image_url?: string;
  }[];
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  payment_status: string;
  full_address?: string;
  tracking_number?: string;
  carrier?: string;
  refunded_total?: number;
};

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  price: number;
  discount_price: number | null;
  stock: number;
  tax_percent: number;
  type: string;
  status: string;
  category_id: string;
  category_name: string;
  brand_id: string;
  brand_name: string;
  unit_id: string;
  unit_name: string;
  seller_id: string;
  seller_name: string;
  is_featured: boolean;
  has_variations: boolean;
  enable_reels: boolean;
  enable_pos: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  image_url: string;
  /** Gallery images (ProductImage), excluding primary `image_url`. */
  images?: { id: string; image_url: string; sort_order: number }[];
};

export type AdminPurchaseOrderLine = {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  image_url: string;
};

export type AdminPurchaseOrderDetail = {
  id: string;
  pk: number;
  customer: string;
  customer_id: string;
  seller: string;
  subtotal: number;
  tax: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
  date: string;
  lines: AdminPurchaseOrderLine[];
};

export type AdminSiteBranding = {
  site_name: string;
  site_logo_url: string;
  phone: string;
  address: string;
  currency: string;
};

export type AdminSummary = {
  today_sales: number;
  today_orders: number;
  total_users: number;
  total_vendors: number;
  wallet_balance_total: number;
  /** Sum of balances for `Wallet.type === platform` (commission wallet). */
  platform_wallet_balance?: number;
  delivery_men_count?: number;
};

/** GET /admin/wallets/summary/ */
export type AdminWalletsSummary = {
  total_wallets: number;
  total_balance: number;
  frozen_wallets: number;
  flagged_transactions: number;
  active_loyalty_rules: number;
  /** Sum of completed BONUS txn amounts (legacy name). */
  points_issued_sum: number;
  total_credit: number;
  total_debit: number;
  total_bonus_transactions: number;
  wallet_bonuses_active_count: number;
  wallet_bonuses_used_total: number;
  referral_count: number;
};

export type AdminLoyaltySummary = {
  referral_count: number;
  active_loyalty_rules: number;
  rules_by_event: Record<string, number>;
  total_loyalty_rules: number;
};

export type AdminSecuritySummary = {
  flagged_open: number;
  flagged_reviewed: number;
  flagged_resolved: number;
  blocked_users: number;
  flagged_wallet_txns: number;
  security_audit_logs_24h: number;
};

export type AdminRecentOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  seller_name: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  total: string;
  created_at: string;
};

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  if (!params) return "";
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export function getOAuthStartUrl(provider: "google" | "facebook", next: string): string {
  const segment = `/auth/social/${provider}/start${buildQuery({ next })}`;
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    return `${API_BASE.replace(/\/$/, "")}${segment}`;
  }
  const prefix = API_BASE.startsWith("/") ? API_BASE : `/${API_BASE}`;
  return `${getApiOrigin()}${prefix}${segment}`;
}

async function apiFetch<T>(path: string, init?: RequestInit, authenticated = false): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", buildAuthHeaderValue(token));
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const parts: string[] = [];
    const detail = payload.detail;
    if (typeof detail === "string") parts.push(detail);
    else if (Array.isArray(detail)) parts.push(detail.map(String).join(", "));
    for (const [k, v] of Object.entries(payload)) {
      if (k === "detail") continue;
      if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`);
      else if (v != null && typeof v === "object") parts.push(`${k}: ${JSON.stringify(v)}`);
      else if (v != null && v !== "") parts.push(`${k}: ${String(v)}`);
    }
    const detailMsg = parts.length ? parts.join(" ") : "";
    throw new Error(
      detailMsg ? `${detailMsg} Request failed: ${response.status}` : `Request failed: ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

/** DRF/portal JSON body on failed portal requests (withdraw KYC codes, validation, etc.). */
export type PortalErrorBody = Record<string, unknown> & {
  detail?: unknown;
  code?: string;
  rejection_reason?: string;
};

export class PortalApiError extends Error {
  readonly status: number;
  readonly body: PortalErrorBody;

  constructor(message: string, status: number, body: PortalErrorBody) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
    this.body = body;
  }
}

export function isPortalKycBlockedError(error: unknown): error is PortalApiError {
  return (
    error instanceof PortalApiError &&
    typeof error.body?.code === "string" &&
    error.body.code.startsWith("kyc_")
  );
}

/** HTTP status from `apiFetch` / `vendorFetch` / `portalFetch` thrown `Error` messages (`Request failed: 401`). */
export function getApiErrorHttpStatus(error: unknown): number | undefined {
  if (error instanceof PortalApiError) return error.status;
  if (!(error instanceof Error)) return undefined;
  const m = error.message.match(/Request failed:\s*(\d{3})/);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

/** True when DRF returned 403 with admin portal role denial (see `user_allowed_for_admin_portal`). */
export function isAdminPortalAccessDenied(error: unknown): boolean {
  if (getApiErrorHttpStatus(error) !== 403) return false;
  if (!(error instanceof Error)) return false;
  return error.message.includes("Admin access required.");
}

async function vendorFetch<T>(path: string, init?: RequestInit, authenticated = false): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", buildAuthHeaderValue(token));
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = (payload as { detail?: unknown }).detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map(String).join(", ")
          : `Request failed: ${response.status}`;
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

async function vendorFetchBlob(path: string, authenticated = true): Promise<Blob> {
  const headers = new Headers();
  if (authenticated) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", buildAuthHeaderValue(token));
  }
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = (payload as { detail?: unknown }).detail;
    const msg = typeof detail === "string" ? detail : `Request failed: ${response.status}`;
    throw new Error(msg);
  }
  return response.blob();
}

function vendorWrite<T>(segment: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const s = segment.replace(/^\//, "").replace(/\/$/, "");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return vendorFetch<T>(
    `/vendor/${s}/`,
    {
      method,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    },
    true,
  );
}

async function portalFetch<T>(path: string, init?: RequestInit, authenticated = false): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", buildAuthHeaderValue(token));
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as PortalErrorBody;
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map(String).join(", ")
          : `Request failed: ${response.status}`;
    throw new PortalApiError(msg, response.status, payload);
  }
  return response.json() as Promise<T>;
}

/** Portal request with multipart body (do not set Content-Type). */
async function portalFetchMultipart<T>(path: string, init: RequestInit, authenticated = true): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (authenticated) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", buildAuthHeaderValue(token));
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as PortalErrorBody;
    const detail = payload.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map(String).join(", ")
          : `Request failed: ${response.status}`;
    throw new PortalApiError(msg, response.status, payload);
  }
  return response.json() as Promise<T>;
}

/** Matches GET/POST `/website/cart/` CartSerializer + CartItemSerializer. */
export type WebsiteCartItemApi = {
  id: number;
  product: WebsiteProduct;
  quantity: number;
  subtotal?: number;
  created_at?: string;
  updated_at?: string;
};

export type WebsiteCartApi = {
  id: number;
  items: WebsiteCartItemApi[];
  total_items: number;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
};

export type WebsiteWishlistItemApi = {
  id: number;
  product: WebsiteProduct;
  created_at?: string;
};

export const mapWebsiteProductToUi = (item: WebsiteProduct): Product => {
  const price = Number(item.price || 0);
  const originalPrice = Number(item.original_price || item.price || 0);
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discount = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;
  const galleryFirst = item.images?.find((im) => im.image_url)?.image_url;
  const image = (item.image_url && item.image_url.trim()) || galleryFirst || "";
  const stockPart = item.stock > 0 ? `${item.stock} in stock` : "Out of stock";
  const u = (item.unit_short_name || "").trim();
  const unitLine = u ? `${u} · ${stockPart}` : stockPart;
  return {
    id: String(item.id),
    slug: item.slug,
    name: item.name,
    description: item.short_description || item.description,
    price,
    originalPrice: hasDiscount ? originalPrice : undefined,
    image,
    category: item.category_slug || "all",
    parentCategorySlug: item.parent_category_slug ?? undefined,
    parentCategoryName: item.parent_category_name ?? undefined,
    categoryName: item.category_name,
    rating: Number(item.rating || 0),
    reviewCount: item.review_count,
    discount,
    unit: unitLine,
    inStock: item.stock > 0,
    isBestseller: item.is_bestseller,
    vendor: item.seller
      ? {
          id: String(item.seller.id),
          name: item.seller.store_name,
          logo: item.seller.logo_url,
          isVerified: item.seller.is_verified,
        }
      : undefined,
  };
};

/** Map a flash-deal line item to storefront Product (honors override_price when set). */
export function mapFlashDealProductToUi(row: WebsiteFlashDealProductRow): Product {
  const raw = row.override_price;
  const trimmed = raw != null ? String(raw).trim() : "";
  const hasOverride = trimmed !== "" && Number.isFinite(Number(trimmed));
  const base = mapWebsiteProductToUi(row.product);
  if (!hasOverride) return base;
  const effective = Number(trimmed);
  const listOrOrig = Number(row.product.original_price || row.product.price || 0);
  const originalPrice = listOrOrig > effective ? listOrOrig : base.originalPrice ?? listOrOrig;
  const discount =
    originalPrice > effective && originalPrice > 0
      ? Math.round(((originalPrice - effective) / originalPrice) * 100)
      : undefined;
  return {
    ...base,
    price: effective,
    originalPrice: originalPrice > effective ? originalPrice : undefined,
    discount,
  };
}

export function mapWebsiteCartToCartItems(cart: WebsiteCartApi): CartItem[] {
  return cart.items.map((row) => ({
    cartItemId: row.id,
    product: mapWebsiteProductToUi(row.product),
    quantity: row.quantity,
  }));
}

export const websiteApi = {
  storeInfo: () => apiFetch<WebsiteStoreInfo>("/website/store-info/"),
  brands: () => apiFetch<WebsiteBrand[]>("/website/brands/"),
  categories: () => apiFetch<WebsiteCategory[]>("/website/categories/"),
  /** Root categories with nested children and `per_category` products per root (default 12). */
  catalog: (params?: { per_category?: number }) =>
    apiFetch<WebsiteCatalogCategory[]>(`/website/catalog/${buildQuery(params)}`),
  products: (params?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<PagedResponse<WebsiteProduct>>(`/website/products/${buildQuery(params)}`),
  /** Active products from approved vendors only; ordering favors featured then newest. */
  productsAllVendors: (params?: QueryParams) =>
    apiFetch<PagedResponse<WebsiteProduct>>(`/products/all-vendors/${buildQuery(params)}`),
  productDetail: (identifier: string) => apiFetch<WebsiteProduct>(`/website/products/${encodeURIComponent(identifier)}/`),
  productReviews: (identifier: string) =>
    apiFetch<Array<{ id: number; name: string; rating: number; comment: string; date: string }>>(
      `/website/products/${encodeURIComponent(identifier)}/reviews/`,
    ),
  cmsPagePublic: (slug: string) =>
    apiFetch<{
      title: string;
      slug: string;
      content: string;
      seo_title: string;
      seo_description: string;
      last_updated: string;
    }>(`/website/cms-pages/${encodeURIComponent(slug)}/`),
  blogPosts: (params?: { search?: string }) =>
    apiFetch<
      Array<{
        id: number;
        title: string;
        slug: string;
        excerpt: string;
        cover_image_url: string;
        author_name: string;
        published_at: string | null;
      }>
    >(`/website/blog-posts/${buildQuery(params)}`),
  blogPost: (slug: string) =>
    apiFetch<{
      id: number;
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      cover_image_url: string;
      author_name: string;
      published_at: string | null;
    }>(`/website/blog-posts/${encodeURIComponent(slug)}/`),
  submitProductReview: (identifier: string, payload: { rating: number; comment?: string }) =>
    apiFetch<{ id: number; status: string }>(
      `/website/products/${encodeURIComponent(identifier)}/reviews/`,
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  banners: (placement = "homepage") =>
    apiFetch<Array<{ id: number; title: string; subtitle: string; image_url: string; click_url: string; gradient: string }>>(
      `/website/banners/${buildQuery({ placement })}`,
    ),
  deals: () => apiFetch<WebsiteFlashDealRow[]>("/website/deals/"),
  /** Optional vendor_ids: comma-separated vendor PKs (narrows feed). */
  reels: (params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(`/website/reels/${buildQuery(params)}`),
  /** All vendors (or narrowed by vendor_id / vendor_slug / vendor_ids), engagement-sorted. */
  reelsTrending: (params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(`/reels/trending/${buildQuery(params)}`),
  /** Same as reelsTrending; explicit path for portal / marketplace dashboards. */
  reelsTrendingAllVendors: (params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(`/reels/trending/all-vendors/${buildQuery(params)}`),
  /** Vendors that have at least one public reel (paginated). */
  reelsVendorsDirectory: (params?: QueryParams) =>
    apiFetch<PagedResponse<VendorWithPublicReelsRow>>(`/reels/vendors/${buildQuery(params)}`),
  /** Public reels for one vendor (paginated). */
  reelsByVendor: (vendorId: number | string, params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(
      `/reels/vendor/${encodeURIComponent(String(vendorId))}/${buildQuery(params)}`,
    ),
  reelInteraction: (reelId: number | string, type: ReelInteractionType) =>
    apiFetch<{ id: number; created: boolean; type: ReelInteractionType }>(
      `/website/reels/${encodeURIComponent(String(reelId))}/interactions/`,
      { method: "POST", body: JSON.stringify({ type }) },
      true,
    ),
  removeReelInteraction: (reelId: number | string, type: ReelInteractionType) =>
    apiFetch<{ ok: boolean; deleted: boolean }>(
      `/website/reels/${encodeURIComponent(String(reelId))}/interactions/${encodeURIComponent(type)}/`,
      { method: "DELETE" },
      true,
    ),
  reelComments: (reelId: number | string) =>
    apiFetch<{ results: Array<{ id: number; body: string; user_name: string; created_at: string; parent: number | null }> }>(
      `/website/reels/${encodeURIComponent(String(reelId))}/comments/`,
      undefined,
      false,
    ),
  addReelComment: (reelId: number | string, body: string, parent_id?: number) =>
    apiFetch<{ id: number; body: string; user_name: string; created_at: string; parent: number | null }>(
      `/website/reels/${encodeURIComponent(String(reelId))}/comments/`,
      { method: "POST", body: JSON.stringify({ body, ...(parent_id ? { parent_id } : {}) }) },
      true,
    ),
  recordReelView: (reelId: number | string) =>
    apiFetch<{ created: boolean; views: number }>(
      `/website/reels/${encodeURIComponent(String(reelId))}/views/`,
      { method: "POST" },
      true,
    ),
  cart: () => apiFetch<WebsiteCartApi>("/website/cart/", undefined, true),
  addToCart: (product_id: number | string, quantity = 1) =>
    apiFetch<WebsiteCartApi>(
      "/website/cart/items/",
      { method: "POST", body: JSON.stringify({ product_id, quantity }) },
      true,
    ),
  updateCartItem: (itemId: number | string, quantity: number) =>
    apiFetch<{ id: number; quantity: number }>(
      `/website/cart/items/${encodeURIComponent(String(itemId))}/`,
      { method: "PATCH", body: JSON.stringify({ quantity }) },
      true,
    ),
  removeCartItem: (itemId: number | string) =>
    apiFetch<{ ok: boolean }>(
      `/website/cart/items/${encodeURIComponent(String(itemId))}/`,
      { method: "DELETE" },
      true,
    ),
  wishlist: () => apiFetch<WebsiteWishlistItemApi[]>("/website/wishlist/", undefined, true),
  addWishlistItem: (product_id: number | string) =>
    apiFetch<WebsiteWishlistItemApi>(
      "/website/wishlist/items/",
      { method: "POST", body: JSON.stringify({ product_id }) },
      true,
    ),
  removeWishlistItem: (productId: number | string) =>
    apiFetch<{ ok: boolean }>(
      `/website/wishlist/items/${encodeURIComponent(String(productId))}/`,
      { method: "DELETE" },
      true,
    ),
  searchPlaceholders: () => apiFetch<string[]>("/website/search-placeholders/"),
  familyInviteMeta: (token: string) =>
    apiFetch<{
      group_name: string;
      role: string;
      expires_at: string;
      status: string;
    }>(`/website/family-invite/${encodeURIComponent(token)}/`),
};

export type ApiNavNode = {
  id: string;
  /** Stable identifier for resolving the frontend screen renderer. */
  viewKey?: string;
  label: string;
  icon: string;
  badge?: number;
  children?: ApiNavNode[];
};

export type AuthPortalKey = "portal" | "family-portal" | "child-portal" | "vendor" | "admin";

export type UnifiedAuthSuccess = {
  token: string;
  surface: "admin" | "vendor" | "portal";
  redirect: string;
  portal?: string;
  user: Record<string, unknown>;
};

export type GoogleJwtAuthSuccess = {
  access: string;
  refresh: string;
  user: {
    pk: number;
    email: string;
    name: string;
  };
};

export const authApi = {
  login: (phone: string, password: string, portal: AuthPortalKey = "portal") =>
    apiFetch<UnifiedAuthSuccess>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ phone, password, portal }),
    }),
  sendOtp: (
    payload:
      | { phone: string; purpose: "login" | "signup"; name?: string; portal?: AuthPortalKey }
      | { phone: string; purpose: "family_invite"; invite_token: string },
  ) =>
    apiFetch<{ detail: string; debug_otp?: string }>("/auth/otp/send/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyOtp: (payload: {
    phone: string;
    otp: string;
    purpose: "login" | "signup";
    name?: string;
    portal?: AuthPortalKey;
    family_name?: string;
  }) =>
    apiFetch<UnifiedAuthSuccess>("/auth/otp/verify/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  loginWithGoogleCredential: (access_token: string) =>
    apiFetch<GoogleJwtAuthSuccess>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ access_token }),
    }),
};

function adminPaged<T>(segment: string, params?: QueryParams) {
  const s = segment.replace(/^\//, "").replace(/\/$/, "");
  const q = buildQuery(params);
  return apiFetch<PagedResponse<T>>(`/admin/${s}/${q}`, undefined, true);
}

function adminWrite<T>(segment: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const s = segment.replace(/^\//, "").replace(/\/$/, "");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return apiFetch<T>(
    `/admin/${s}/`,
    {
      method,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    },
    true,
  );
}

function vendorPaged<T>(segment: string, params?: QueryParams) {
  const s = segment.replace(/^\//, "").replace(/\/$/, "");
  const q = buildQuery(params);
  return vendorFetch<PagedResponse<T>>(`/vendor/${s}/${q}`, undefined, true);
}

function portalPaged<T>(segment: string, params?: QueryParams) {
  const s = segment.replace(/^\//, "").replace(/\/$/, "");
  const q = buildQuery(params);
  return portalFetch<PagedResponse<T>>(`/portal/${s}/${q}`, undefined, true);
}

export type SupportTicketAttachmentRow = {
  id: string;
  filename: string;
  kind: 'image' | 'video' | 'document';
  mime_type: string;
  /** Path under API_BASE, e.g. /portal/support/attachments/1/ — use with fetchAuthenticatedBlob. */
  url: string;
};

export type SupportTicketMessageRow = {
  id: string;
  sender_id: number;
  sender_name: string;
  sender_role_kind: 'user' | 'staff';
  /** Absolute URL when sender has an avatar; may be empty. */
  sender_avatar_url?: string;
  body: string;
  created_at: string;
  /** Present on API responses; older cached payloads may omit. */
  attachments?: SupportTicketAttachmentRow[];
};

/** Authenticated binary fetch (support attachments, etc.). */
export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Token ${token}`);
  const p = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE}${p}`, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.blob();
}

export type SupportTicketUserDetail = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source_panel: string;
  created: string;
  last_activity_at: string;
  messages: SupportTicketMessageRow[];
};

export type SupportTicketAdminDetail = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source_panel: string;
  created: string;
  last_activity_at: string;
  submitter: { id: number; name: string; phone: string; role: string; avatar_url?: string };
  assigned_to: { id: number; name: string; phone: string } | null;
  messages: SupportTicketMessageRow[];
};

export type AdminSelfProfile = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  role: string;
  avatar_url: string;
  is_superuser: boolean;
  employee: {
    status: string;
    role_name: string;
    modules_access: string[];
  } | null;
};

/** Row from GET /api/admin/commission-settlements/ */
export type AdminCommissionSettlementRow = {
  id: string;
  order_id: number;
  order_number: string;
  vendor_id: number;
  vendor_name: string;
  total_amount: number;
  commission_percent: number;
  commission_amount: number;
  vendor_amount: number;
  payment_status: string;
  created_at: string;
};

/** Row from GET /api/admin/audit-logs/ */
export type AdminAuditLogRow = {
  id: string;
  action: string;
  description: string;
  user: string;
  user_id: number | null;
  action_kind: string;
  module: string;
  type: string;
  time: string;
  created_at: string;
  ip_address: string | null;
  object_type: string;
  object_id: string;
  metadata_preview: string;
};

/** Full row from GET /api/admin/audit-logs/:id/ */
export type AdminAuditLogDetail = {
  id: string;
  description: string;
  action: string;
  action_kind: string;
  module: string;
  type: string;
  user: string;
  user_id: number | null;
  time: string;
  created_at: string;
  ip_address: string | null;
  object_type: string;
  object_id: string;
  metadata: Record<string, unknown>;
};

/** Row from GET /api/admin/me/notifications/ (inbox for signed-in admin). */
export type AdminMeNotificationRow = {
  id: string;
  type: string;
  message: string;
  time: string;
  urgent: boolean;
  title?: string;
  created_at?: string;
  is_read?: boolean;
  action_url?: string;
  preview?: string;
};

export const adminApi = {
  login: (phone: string, password: string) =>
    apiFetch<{ token: string; user: { id: number; name: string } }>("/admin/auth/login/", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  profile: () => apiFetch<AdminSelfProfile>("/admin/profile/", undefined, true),
  meNotifications: () =>
    apiFetch<AdminMeNotificationRow[]>("/admin/me/notifications/", undefined, true),
  meNotificationsMarkRead: (body: { all?: boolean; ids?: string[] }) =>
    adminWrite<{ ok: true; updated: number }>("me/notifications/mark-read", "POST", body),
  updateProfile: (fd: FormData) => adminWrite<AdminSelfProfile>("profile", "PATCH", fd),
  changePassword: (old_password: string, new_password: string) =>
    apiFetch<{ ok: true }>(
      "/admin/auth/change-password/",
      { method: "POST", body: JSON.stringify({ old_password, new_password }) },
      true,
    ),
  navigation: () => apiFetch<{ items: ApiNavNode[] }>("/admin/navigation/", undefined, true),
  summary: () => apiFetch<AdminSummary>("/admin/dashboard/summary/", undefined, true),
  recentOrders: () => apiFetch<AdminRecentOrder[]>("/admin/dashboard/recent-orders/", undefined, true),
  salesSeries: (days = 7) =>
    apiFetch<Array<{ day: string; sales: number; orders: number }>>(
      `/admin/dashboard/sales-series/${buildQuery({ days })}`,
      undefined,
      true,
    ),
  users: (params?: QueryParams) =>
    apiFetch<PagedResponse<{ id: number; name: string; phone: string; email: string; role: string; kyc_status: string }>>(
      `/admin/users/${buildQuery(params)}`,
      undefined,
      true,
    ),
  userDetail: (id: string) =>
    apiFetch<Record<string, unknown>>(`/admin/users/${encodeURIComponent(id)}/`, undefined, true),
  orders: (params?: QueryParams) => adminPaged<AdminOrderListRow>("orders", params),
  orderDetail: (pk: number) => apiFetch<AdminOrderDetail>(`/admin/orders/${pk}/`, undefined, true),
  updateOrder: (pk: number, payload: Record<string, unknown>) =>
    apiFetch<AdminOrderDetail>(`/admin/orders/${pk}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true),
  refundOrder: (pk: number, payload: { amount: number; reason: string }) =>
    apiFetch<{ ok: boolean; refund_number: string; amount: number }>(`/admin/orders/${pk}/refund/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, true),
  productDetail: (id: string) => apiFetch<AdminProductDetail>(`/admin/products/${id}/`, undefined, true),
  purchaseOrderDetail: (pk: number) =>
    apiFetch<AdminPurchaseOrderDetail>(`/admin/purchase-orders/${pk}/`, undefined, true),
  orderSettings: () =>
    apiFetch<{
      refund_validity_days: number;
      auto_cancel_hours: number;
      guest_checkout: boolean;
      order_verification_required: boolean;
      auto_assign_delivery: boolean;
    }>("/admin/order-settings/", undefined, true),
  updateOrderSettings: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("order-settings", "PATCH", payload),
  products: (params?: QueryParams) => adminPaged<Record<string, unknown>>("products", params),
  vendors: (params?: QueryParams) => adminPaged<Record<string, unknown>>("vendors", params),
  reels: (params?: QueryParams) => adminPaged<ApiReelPublicRow>("reels", params),
  categories: (params?: QueryParams) => adminPaged<Record<string, unknown>>("categories", params),
  brands: (params?: QueryParams) => adminPaged<Record<string, unknown>>("brands", params),
  attributes: (params?: QueryParams) => adminPaged<Record<string, unknown>>("attributes", params),
  attributeValues: (params?: QueryParams) => adminPaged<Record<string, unknown>>("attribute-values", params),
  units: (params?: QueryParams) => adminPaged<Record<string, unknown>>("units", params),
  reviews: (params?: QueryParams) => adminPaged<Record<string, unknown>>("reviews", params),
  updateReview: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`reviews/${id}`, "PATCH", payload),
  deleteReview: (id: string) => adminWrite<{ ok: boolean }>(`reviews/${id}`, "DELETE"),
  productApprovals: (params?: QueryParams) => adminPaged<Record<string, unknown>>("product-approvals", params),
  coupons: (params?: QueryParams) => adminPaged<Record<string, unknown>>("coupons", params),
  flashDeals: (params?: QueryParams) => adminPaged<Record<string, unknown>>("flash-deals", params),
  banners: (params?: QueryParams) => adminPaged<Record<string, unknown>>("banners", params),
  cmsPages: (params?: QueryParams) => adminPaged<Record<string, unknown>>("cms-pages", params),
  cmsPageDetail: (id: string) =>
    apiFetch<{
      id: string;
      title: string;
      slug: string;
      content: string;
      status: string;
      seoTitle: string;
      seoDesc: string;
      lastUpdated: string;
    }>(`/admin/cms-pages/${encodeURIComponent(id)}/`, undefined, true),
  notifications: (params?: QueryParams) => adminPaged<Record<string, unknown>>("notifications", params),
  refunds: (params?: QueryParams) => adminPaged<Record<string, unknown>>("refunds", params),
  updateRefund: (refundNumber: string, payload: { status: "approved" | "rejected"; admin_note?: string }) =>
    apiFetch<{ ok: boolean; status?: string; processed_at?: string }>(
      `/admin/refunds/${encodeURIComponent(refundNumber)}/`,
      { method: "PATCH", body: JSON.stringify(payload) },
      true,
    ),
  payments: (params?: QueryParams) => adminPaged<Record<string, unknown>>("payments", params),
  ledgerTransactions: (params?: QueryParams) =>
    adminPaged<Record<string, unknown>>("ledger-transactions", params),
  commissionSettlements: (params?: QueryParams) =>
    adminPaged<AdminCommissionSettlementRow>("commission-settlements", params),
  withdrawals: (params?: QueryParams) => adminPaged<Record<string, unknown>>("withdrawals", params),
  updateWithdrawal: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`withdrawals/${id}`, "PATCH", payload),
  wallets: (params?: QueryParams) => adminPaged<Record<string, unknown>>("wallets", params),
  walletTransactions: (params?: QueryParams) => adminPaged<Record<string, unknown>>("wallet-transactions", params),
  walletBonuses: (params?: QueryParams) => adminPaged<Record<string, unknown>>("wallet-bonuses", params),
  loyaltyRules: (params?: QueryParams) => adminPaged<Record<string, unknown>>("loyalty-rules", params),
  families: (params?: QueryParams) => adminPaged<Record<string, unknown>>("families", params),
  purchaseOrders: (params?: QueryParams) => adminPaged<Record<string, unknown>>("purchase-orders", params),
  deliveryMen: (params?: QueryParams) => adminPaged<Record<string, unknown>>("delivery-men", params),
  auditLogs: (params?: QueryParams) => adminPaged<AdminAuditLogRow>("audit-logs", params),
  auditLogFilterOptions: () =>
    apiFetch<{ modules: string[]; actors: { id: string; name: string; phone: string }[] }>(
      "/admin/audit-logs/filter-options/",
      undefined,
      true,
    ),
  auditLogDetail: (id: string | number) =>
    apiFetch<AdminAuditLogDetail>(`/admin/audit-logs/${encodeURIComponent(String(id))}/`, undefined, true),
  tickets: (params?: QueryParams) => adminPaged<Record<string, unknown>>("tickets", params),
  ticketDetail: (ticketNumber: string) =>
    apiFetch<SupportTicketAdminDetail>(`/admin/tickets/${encodeURIComponent(ticketNumber)}/`, undefined, true),
  postTicketMessage: (ticketNumber: string, payload: { body: string; files?: File[] }) => {
    const tn = encodeURIComponent(ticketNumber);
    if (payload.files?.length) {
      const fd = new FormData();
      fd.append('body', payload.body);
      payload.files.forEach((f) => fd.append('files', f));
      return adminWrite<{ ok: true; message: SupportTicketMessageRow }>(
        `tickets/${tn}/messages`,
        'POST',
        fd,
      );
    }
    return adminWrite<{ ok: true; message: SupportTicketMessageRow }>(
      `tickets/${tn}/messages`,
      'POST',
      { body: payload.body },
    );
  },
  supportTicketMessagesOlder: (ticketNumber: string, params: { before: string; limit?: number }) =>
    apiFetch<{ results: SupportTicketMessageRow[]; has_more: boolean }>(
      `/admin/tickets/${encodeURIComponent(ticketNumber)}/messages/${buildQuery({
        before: params.before,
        limit: params.limit ?? 50,
      })}`,
      undefined,
      true,
    ),
  patchTicket: (ticketNumber: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(
      `tickets/${encodeURIComponent(ticketNumber)}`,
      "PATCH",
      payload,
    ),
  flagged: (params?: QueryParams) => adminPaged<Record<string, unknown>>("flagged", params),
  shippingMethods: (params?: QueryParams) => adminPaged<Record<string, unknown>>("shipping-methods", params),
  shippingZones: (params?: QueryParams) => adminPaged<Record<string, unknown>>("shipping-zones", params),
  weightRules: (params?: QueryParams) => adminPaged<Record<string, unknown>>("weight-rules", params),
  roles: (params?: QueryParams) => adminPaged<Record<string, unknown>>("roles", params),
  employees: (params?: QueryParams) => adminPaged<Record<string, unknown>>("employees", params),
  staffUsers: (params?: QueryParams) => adminPaged<Record<string, unknown>>("users/staff", params),
  createCategory: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("categories/create", "POST", payload),
  updateCategory: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`categories/${id}`, "PATCH", payload),
  deleteCategory: (id: string) => adminWrite<{ ok: true }>(`categories/${id}`, "DELETE"),
  createBrand: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("brands/create", "POST", payload),
  updateBrand: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`brands/${id}`, "PATCH", payload),
  deleteBrand: (id: string) => adminWrite<{ ok: true }>(`brands/${id}`, "DELETE"),
  createAttribute: (payload: Record<string, unknown>) => adminWrite<Record<string, unknown>>("attributes/create", "POST", payload),
  updateAttribute: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`attributes/${id}`, "PATCH", payload),
  deleteAttribute: (id: string) => adminWrite<{ ok: true }>(`attributes/${id}`, "DELETE"),
  createAttributeValue: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("attribute-values/create", "POST", payload),
  updateAttributeValue: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`attribute-values/${id}`, "PATCH", payload),
  deleteAttributeValue: (id: string) => adminWrite<{ ok: true }>(`attribute-values/${id}`, "DELETE"),
  createUnit: (payload: Record<string, unknown>) => adminWrite<Record<string, unknown>>("units/create", "POST", payload),
  updateUnit: (id: string, payload: Record<string, unknown>) => adminWrite<Record<string, unknown>>(`units/${id}`, "PATCH", payload),
  deleteUnit: (id: string) => adminWrite<{ ok: true }>(`units/${id}`, "DELETE"),
  createProduct: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("products/create", "POST", payload),
  updateProduct: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`products/${id}`, "PATCH", payload),
  deleteProduct: (id: string) => adminWrite<{ ok: true }>(`products/${id}`, "DELETE"),
  createBanner: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("banners/create", "POST", payload),
  updateBanner: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`banners/${id}`, "PATCH", payload),
  deleteBanner: (id: string) => adminWrite<{ ok: true }>(`banners/${id}`, "DELETE"),
  createCmsPage: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("cms-pages/create", "POST", payload),
  updateCmsPage: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`cms-pages/${id}`, "PATCH", payload),
  deleteCmsPage: (id: string) => adminWrite<{ ok: true }>(`cms-pages/${id}`, "DELETE"),
  createPurchaseOrder: (payload: {
    customer_id?: string | null;
    seller_id?: string | null;
    items: { product_id: string | number; quantity: number; unit_price?: number }[];
    discount?: number;
    delivery_fee?: number;
    payment_method: string;
  }) => adminWrite<{ id: string; pk: number }>("purchase-orders/create", "POST", payload),
  createUser: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("users/create", "POST", payload),
  updateUser: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`users/${id}`, "PATCH", payload),
  deleteUser: (id: string) => adminWrite<{ ok: true }>(`users/${id}`, "DELETE"),
  createFlashDeal: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("flash-deals/create", "POST", payload),
  updateFlashDeal: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`flash-deals/${id}`, "PATCH", payload),
  deleteFlashDeal: (id: string) => adminWrite<{ ok: true }>(`flash-deals/${id}`, "DELETE"),
  createCoupon: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("coupons/create", "POST", payload),
  updateCoupon: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`coupons/${id}`, "PATCH", payload),
  deleteCoupon: (id: string) => adminWrite<{ ok: true }>(`coupons/${id}`, "DELETE"),
  broadcastNotification: (payload: Record<string, unknown>) =>
    adminWrite<{ created: number; capped: boolean }>("notifications/broadcast", "POST", payload),
  updateNotification: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`notifications/${id}`, "PATCH", payload),
  deleteNotification: (id: string) => adminWrite<{ ok: true }>(`notifications/${id}`, "DELETE"),
  updateProductApproval: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`product-approvals/${id}`, "PATCH", payload),
  createVendor: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("vendors/create", "POST", payload),
  updateVendor: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`vendors/${id}`, "PATCH", payload),
  createRole: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("roles/create", "POST", payload),
  updateRole: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`roles/${id}`, "PATCH", payload),
  deleteRole: (id: string) => adminWrite<{ ok: true }>(`roles/${id}`, "DELETE"),
  accountPortalCatalog: () =>
    apiFetch<{
      portal_surfaces: { id: string; label: string }[];
      user_account_roles: { value: string; label: string }[];
    }>("/admin/account-portal-catalog/", undefined, true),
  createEmployee: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("employees/create", "POST", payload),
  updateEmployee: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`employees/${id}`, "PATCH", payload),
  deleteEmployee: (id: string) => adminWrite<{ ok: true }>(`employees/${id}`, "DELETE"),
  createDeliveryMan: (payload: FormData) =>
    adminWrite<Record<string, unknown>>("delivery-men/create", "POST", payload),
  updateDeliveryMan: (id: string, payload: FormData) =>
    adminWrite<Record<string, unknown>>(`delivery-men/${id}`, "PATCH", payload),
  deleteDeliveryMan: (id: string) => adminWrite<{ ok: true }>(`delivery-men/${id}`, "DELETE"),
  createShippingMethod: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("shipping-methods/create", "POST", payload),
  updateShippingMethod: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`shipping-methods/${id}`, "PATCH", payload),
  deleteShippingMethod: (id: string) => adminWrite<{ ok: true }>(`shipping-methods/${id}`, "DELETE"),
  createShippingZone: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("shipping-zones/create", "POST", payload),
  updateShippingZone: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`shipping-zones/${id}`, "PATCH", payload),
  deleteShippingZone: (id: string) => adminWrite<{ ok: true }>(`shipping-zones/${id}`, "DELETE"),
  createWeightRule: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("weight-rules/create", "POST", payload),
  updateWeightRule: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`weight-rules/${id}`, "PATCH", payload),
  deleteWeightRule: (id: string) => adminWrite<{ ok: true }>(`weight-rules/${id}`, "DELETE"),
  walletsSummary: () =>
    apiFetch<AdminWalletsSummary>("/admin/wallets/summary/", undefined, true),
  walletAdjust: (payload: { wallet_id: string; amount: number; direction: string; reason?: string }) =>
    adminWrite<{ ok: boolean; balance: number }>("wallets/adjust", "POST", payload),
  updateWallet: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`wallets/${id}`, "PATCH", payload),
  walletSettings: () => apiFetch<Record<string, unknown>>("/admin/wallet-settings/", undefined, true),
  updateWalletSettings: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("wallet-settings", "PATCH", payload),
  createWalletBonus: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("wallet-bonuses/create", "POST", payload),
  updateWalletBonus: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`wallet-bonuses/${id}`, "PATCH", payload),
  deleteWalletBonus: (id: string) => adminWrite<{ ok: true }>(`wallet-bonuses/${id}`, "DELETE"),
  createLoyaltyRule: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("loyalty-rules/create", "POST", payload),
  updateLoyaltyRule: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`loyalty-rules/${id}`, "PATCH", payload),
  deleteLoyaltyRule: (id: string) => adminWrite<{ ok: true }>(`loyalty-rules/${id}`, "DELETE"),
  createFamily: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("families/create", "POST", payload),
  updateFamily: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`families/${id}`, "PATCH", payload),
  deleteFamily: (id: string) => adminWrite<{ ok: true }>(`families/${id}`, "DELETE"),
  familyMembers: (familyId: string) =>
    apiFetch<{
      members: Record<string, unknown>[];
      group_wallets?: Record<string, unknown>[];
    }>(`/admin/families/${familyId}/members/`, undefined, true),
  createFamilyMember: (familyId: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`families/${familyId}/members/add`, "POST", payload),
  updateFamilyMember: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`family-members/${id}`, "PATCH", payload),
  deleteFamilyMember: (id: string) => adminWrite<{ ok: true }>(`family-members/${id}`, "DELETE"),
  familyPermissions: (familyId: string) =>
    apiFetch<Record<string, unknown>>(`/admin/families/${familyId}/permissions/`, undefined, true),
  updateFamilyPermissions: (familyId: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`families/${familyId}/permissions`, "PATCH", payload),
  loyaltySettings: () => apiFetch<Record<string, unknown>>("/admin/loyalty-settings/", undefined, true),
  updateLoyaltySettings: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("loyalty-settings", "PATCH", payload),
  loyaltySummary: () => apiFetch<AdminLoyaltySummary>("/admin/loyalty/summary/", undefined, true),
  securitySettings: () => apiFetch<Record<string, unknown>>("/admin/security-settings/", undefined, true),
  updateSecuritySettings: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("security-settings", "PATCH", payload),
  siteSettings: () => apiFetch<Record<string, unknown>>("/admin/site-settings/", undefined, true),
  updateSiteSettings: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("site-settings", "PATCH", payload),
  paymentGateways: () =>
    apiFetch<{ results: Record<string, unknown>[] }>("/admin/payment-gateways/", undefined, true),
  updatePaymentGateway: (gateway: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`payment-gateways/${gateway}`, "PATCH", payload),
  dbTableStats: () =>
    apiFetch<{ tables: { name: string; table: string; count: number | null }[] }>(
      "/admin/system/db-stats/",
      undefined,
      true,
    ),
  securitySummary: () => apiFetch<AdminSecuritySummary>("/admin/security/summary/", undefined, true),
  updateFlaggedActivity: (id: string, payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>(`flagged/${id}`, "PATCH", payload),
  shippingSettings: () => apiFetch<Record<string, unknown>>("/admin/shipping-settings/", undefined, true),
  updateShippingSettings: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("shipping-settings", "PATCH", payload),
  shippingCalculate: (payload: Record<string, unknown>) =>
    adminWrite<Record<string, unknown>>("shipping/calculate", "POST", payload),
  createReel: (payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>("reels/create", "POST", payload),
  updateReel: (id: string, payload: Record<string, unknown> | FormData) =>
    adminWrite<Record<string, unknown>>(`reels/${id}`, "PATCH", payload),
  deleteReel: (id: string) => adminWrite<{ ok: true }>(`reels/${id}`, "DELETE"),
  userKycDocuments: (userId: string) =>
    apiFetch<{ documents: Record<string, unknown>[] }>(`/admin/users/${userId}/kyc-documents/`, undefined, true),
  uploadUserKycDocument: (userId: string, formData: FormData) =>
    adminWrite<{ id: string }>(`users/${userId}/kyc-documents`, "POST", formData),
  kycSubmissions: (params?: QueryParams) =>
    apiFetch<PagedResponse<AdminKycSubmissionRow>>(
      `/admin/kyc-submissions/${buildQuery(params)}`,
      undefined,
      true,
    ),
  updateKycSubmission: (
    id: string | number,
    payload: { status: "approved" | "rejected"; rejection_reason?: string },
  ) =>
    apiFetch<AdminKycSubmissionRow>(`/admin/kyc-submissions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true),
};

export type VendorSummary = {
  today_sales: number;
  today_orders: number;
  pending_orders: number;
  product_count: number;
  pending_product_approval: number;
  wallet_balance: number;
  pending_payout: number;
};

export const vendorApi = {
  login: (phone: string, password: string) =>
    vendorFetch<{ token: string; user: { id: number; name: string; store_name: string; store_slug: string; status: string } }>(
      "/vendor/auth/login/",
      { method: "POST", body: JSON.stringify({ phone, password }) },
    ),
  logout: () => vendorWrite<{ detail: string }>("auth/logout", "POST"),
  changePassword: (old_password: string, new_password: string) =>
    vendorWrite<{ ok: true }>("auth/change-password", "POST", { old_password, new_password }),
  navigation: () => vendorFetch<{ items: ApiNavNode[] }>("/vendor/navigation/", undefined, true),
  me: () => vendorFetch<Record<string, unknown>>("/vendor/me/", undefined, true),
  summary: () => vendorFetch<VendorSummary>("/vendor/summary/", undefined, true),
  notifications: () =>
    vendorFetch<{
      results: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        time: string;
        is_read: boolean;
        action_url: string;
      }>;
    }>("/vendor/notifications/", undefined, true),
  profile: () => vendorFetch<Record<string, unknown>>("/vendor/profile/", undefined, true),
  updateProfile: (payload: Record<string, unknown> | FormData) =>
    vendorWrite<Record<string, unknown>>("profile", "PATCH", payload),
  settings: () => vendorFetch<Record<string, unknown>>("/vendor/settings/", undefined, true),
  updateSettings: (payload: Record<string, unknown>) => vendorWrite<Record<string, unknown>>("settings", "PATCH", payload),
  bankDetail: () => vendorFetch<Record<string, unknown>>("/vendor/bank-detail/", undefined, true),
  updateBankDetail: (payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>("bank-detail", "PATCH", payload),
  catalogCategories: () => vendorFetch<{ results: Record<string, unknown>[] }>("/vendor/catalog/categories/", undefined, true),
  catalogBrands: () => vendorFetch<{ results: Record<string, unknown>[] }>("/vendor/catalog/brands/", undefined, true),
  catalogUnits: () => vendorFetch<{ results: Record<string, unknown>[] }>("/vendor/catalog/units/", undefined, true),
  catalogAttributes: () =>
    vendorFetch<{ results: Record<string, unknown>[] }>("/vendor/catalog/attributes/", undefined, true),
  productSlugPreview: (name: string) =>
    vendorFetch<{ slug: string }>(`/vendor/products/slug-preview/${buildQuery({ name })}`, undefined, true),
  orders: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("orders", params),
  orderDetail: (orderNumber: string) =>
    vendorFetch<Record<string, unknown>>(`/vendor/orders/${encodeURIComponent(orderNumber)}/`, undefined, true),
  updateOrder: (orderNumber: string, payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>(`orders/${encodeURIComponent(orderNumber)}`, "PATCH", payload),
  refunds: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("refunds", params),
  posCheckout: (payload: Record<string, unknown>) =>
    vendorWrite<{ order_number: string; total: number }>("pos/checkout", "POST", payload),
  products: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("products", params),
  productDetail: (id: string) => vendorFetch<Record<string, unknown>>(`/vendor/products/${id}/`, undefined, true),
  createProduct: (payload: Record<string, unknown> | FormData) =>
    vendorWrite<Record<string, unknown>>("products/create", "POST", payload),
  updateProduct: (id: string, payload: Record<string, unknown> | FormData) =>
    vendorWrite<Record<string, unknown>>(`products/${id}`, "PATCH", payload),
  deleteProduct: (id: string) => vendorWrite<{ ok: true }>(`products/${id}`, "DELETE"),
  reviews: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("reviews", params),
  updateReview: (id: string, payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>(`reviews/${id}`, "PATCH", payload),
  walletTransactions: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("wallet-transactions", params),
  commissionSettlements: (params?: QueryParams) =>
    vendorPaged<Record<string, unknown>>("commission-settlements", params),
  withdrawals: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("withdrawals", params),
  createWithdrawal: (payload: Record<string, unknown>) =>
    vendorWrite<{ id: string }>("withdrawals", "POST", payload),
  coupons: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("coupons", params),
  createCoupon: (payload: Record<string, unknown>) =>
    vendorWrite<{ id: string }>("coupons", "POST", payload),
  updateCoupon: (id: string, payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>(`coupons/${id}`, "PATCH", payload),
  deleteCoupon: (id: string) => vendorWrite<{ ok: true }>(`coupons/${id}`, "DELETE"),
  flashDeals: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("flash-deals", params),
  createFlashDeal: (payload: Record<string, unknown>) =>
    vendorWrite<{ id: string }>("flash-deals", "POST", payload),
  updateFlashDeal: (id: string, payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>(`flash-deals/${id}`, "PATCH", payload),
  deleteFlashDeal: (id: string) => vendorWrite<{ ok: true }>(`flash-deals/${id}`, "DELETE"),
  flashDealAddProducts: (dealId: string, product_ids: (string | number)[]) =>
    vendorWrite<{ added: number }>(`flash-deals/${dealId}/products`, "POST", { product_ids }),
  flashDealRemoveProduct: (dealId: string, productId: string) =>
    vendorWrite<{ ok: true }>(`flash-deals/${dealId}/products/${productId}`, "DELETE"),
  customers: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("customers", params),
  reportsSummary: (params?: { from?: string; to?: string }) =>
    vendorFetch<Record<string, unknown>>(`/vendor/reports/summary/${buildQuery(params)}`, undefined, true),
  reportsExportCsv: (params?: { from?: string; to?: string }) =>
    vendorFetchBlob(`/vendor/reports/export.csv${buildQuery(params)}`),
  supportTickets: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("support/tickets", params),
  createSupportTicket: (payload: Record<string, unknown>) =>
    vendorWrite<{ id: string }>("support/tickets", "POST", payload),
  supportTicketDetail: (ticketNumber: string) =>
    vendorFetch<SupportTicketUserDetail>(
      `/vendor/support/tickets/${encodeURIComponent(ticketNumber)}/`,
      undefined,
      true,
    ),
  updateSupportTicket: (ticketNumber: string, payload: Record<string, unknown>) =>
    vendorWrite<Record<string, unknown>>(
      `support/tickets/${encodeURIComponent(ticketNumber)}`,
      "PATCH",
      payload,
    ),
  deleteSupportTicket: (ticketNumber: string) =>
    vendorWrite<{ ok: true }>(`support/tickets/${encodeURIComponent(ticketNumber)}`, "DELETE"),
  postSupportTicketMessage: (ticketNumber: string, payload: { body: string; files?: File[] }) => {
    const tn = encodeURIComponent(ticketNumber);
    if (payload.files?.length) {
      const fd = new FormData();
      fd.append('body', payload.body);
      payload.files.forEach((f) => fd.append('files', f));
      return vendorWrite<{ ok: true; message: SupportTicketMessageRow }>(
        `support/tickets/${tn}/messages`,
        'POST',
        fd,
      );
    }
    return vendorWrite<{ ok: true; message: SupportTicketMessageRow }>(
      `support/tickets/${tn}/messages`,
      'POST',
      { body: payload.body },
    );
  },
  supportTicketMessagesOlder: (ticketNumber: string, params: { before: string; limit?: number }) =>
    vendorFetch<{ results: SupportTicketMessageRow[]; has_more: boolean }>(
      `/vendor/support/tickets/${encodeURIComponent(ticketNumber)}/messages/${buildQuery({
        before: params.before,
        limit: params.limit ?? 50,
      })}`,
      undefined,
      true,
    ),
  faqs: () => vendorFetch<{ results: Record<string, unknown>[] }>("/vendor/faqs/", undefined, true),
  reels: (params?: QueryParams) => vendorPaged<Record<string, unknown>>("reels", params),
  favouriteReels: (params?: QueryParams) => vendorPaged<ApiReelPublicRow>("reels/favourites", params),
  createReel: (payload: Record<string, unknown> | FormData) =>
    vendorWrite<Record<string, unknown>>("reels", "POST", payload),
  updateReel: (id: string, payload: Record<string, unknown> | FormData) =>
    vendorWrite<Record<string, unknown>>(`reels/${id}`, "PATCH", payload),
  deleteReel: (id: string) => vendorWrite<{ ok: true }>(`reels/${id}`, "DELETE"),
  /** Authenticated vendor: own reels sorted by engagement (dashboard strip). */
  reelsDashboard: (params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(`/reels/dashboard/${buildQuery(params)}`, undefined, true),
  /**
   * Authenticated vendor: paginated own reels at /reels/vendor/{id}/ (all statuses when id matches token vendor).
   * Sends auth token — required for owner list; public callers use websiteApi.reelsByVendor without vendor token.
   */
  reelsByVendor: (vendorId: number | string, params?: QueryParams) =>
    apiFetch<PagedResponse<ApiReelPublicRow>>(
      `/reels/vendor/${encodeURIComponent(String(vendorId))}/${buildQuery(params)}`,
      undefined,
      true,
    ),
};

export type PortalMe = {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  kyc_status: string;
  kyc_required?: boolean;
  kyc_rejection_reason?: string;
  wallet_id: string | null;
  wallet_balance: number;
};

export type PortalKycSchemaField =
  | {
      name: string;
      type: "choice";
      required: boolean;
      choices_key: string;
    }
  | {
      name: string;
      type: "text";
      required: boolean;
      max_length: number;
      label: string;
    }
  | {
      name: string;
      type: "image" | "file";
      required: boolean;
      label: string;
    };

export type PortalKycSchemaResponse = {
  document_type_choices: Array<{ value: string; label: string }>;
  fields: PortalKycSchemaField[];
  allowed_extensions: string[];
  max_upload_bytes: number;
};

export type PortalKycStatusDoc = {
  id: string;
  document_type: string;
  status: string;
  submitted_at: string;
  rejection_reason: string;
};

export type PortalKycStatusResponse = {
  kyc_status: string;
  kyc_required: boolean;
  can_submit?: boolean;
  message_key: string;
  rejection_reason: string;
  documents: PortalKycStatusDoc[];
};

export type AdminKycSubmissionRow = {
  id: string;
  document_type: string;
  document_id_number: string;
  status: string;
  rejection_reason: string;
  submitted_at: string;
  reviewed_at: string;
  document_image: string;
  document_back: string;
  document_file: string;
  reviewer: { id: number; name: string; phone: string } | null;
  user: {
    id: number;
    name: string;
    phone: string;
    email: string;
    username: string;
    kid: string;
    kyc_status: string;
  };
};

/** GET /portal/profile/ — store-style profile for customer portal UI. */
export type PortalCustomerProfile = {
  id: string;
  store_name: string;
  description: string;
  contact_email: string;
  phone: string;
  address: string;
  logo_url: string;
  banner_url: string;
  username: string;
  kid: string;
  kyc_status: string;
  rating: number;
  is_verified: boolean;
  product_count: number;
  review_count: number;
  favourite_reels_count: number;
};

/** GET/PATCH /portal/self-profile/ — normal, parent, and child roles */
export type PortalSelfProfile = Partial<PortalCustomerProfile> & {
  portal_role: string;
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  avatar_url?: string;
  username?: string;
  kid?: string;
  kyc_status?: string;
  family_group_id?: string;
  family_group_name?: string;
  family_member_role?: string;
  spending_limit_monthly?: number;
};

export type PortalSummary = {
  wallet_balance: number;
  total_orders: number;
  pending_deliveries: number;
  total_spent: number;
  notifications_count: number;
};

export type PortalOrderLineRow = {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PortalOrderRefundRow = {
  refund_number: string;
  status: string;
  amount: number;
  reason: string;
  created_at: string;
};

export type PortalOrderRow = {
  id: string;
  pk: number;
  date: string;
  status: string;
  total: number;
  items: number;
  payment: string;
  seller: string;
  seller_id: number | null;
  lines: PortalOrderLineRow[];
  refunds?: PortalOrderRefundRow[];
};

export type PortalWalletTxnRow = {
  id: string;
  date: string;
  type: "credit" | "debit" | "transfer";
  description: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  to: string;
  fund_source?: string;
};

/** GET /portal/orders/checkout-wallet/ — aligns with default wallet + pay_wallet_id rules */
export type PortalCheckoutWalletOption = {
  id: number;
  fund_source: string;
  balance: number;
  is_default: boolean;
};

export type PortalCheckoutWalletContext = {
  default: { id: number; fund_source: string; balance: number } | null;
  payable_wallets: PortalCheckoutWalletOption[];
};

export type PortalNotificationRow = {
  id: string;
  type: string;
  message: string;
  time: string;
  urgent: boolean;
  title?: string;
  created_at?: string;
  is_read?: boolean;
  action_url?: string;
  preview?: string;
};

export type PortalChildAccountRow = {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  spendingLimit: number;
  spent: number;
  lastActivity: string;
};

export type PortalFamilyMemberRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  balance: number;
  status: string;
  avatar: string;
  spending: number;
  limit: number;
  spending_limit_daily?: number;
  spending_limit_weekly?: number;
  spending_limit_monthly?: number;
  is_leader?: boolean;
  is_online?: boolean;
  group?: { id: string; name: string };
  /** Canonical family-scoped wallet for transfers (member wallet, not shared bucket). */
  wallet_id?: string | null;
};

export type PortalFamilyJoinRequestRow = {
  id: number;
  invite_id: number | null;
  join_link_id: number | null;
  source?: string;
  requested_by_name?: string;
  applicant_note?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  age: number | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

export type PublicFamilyJoinLinkMeta = {
  ok: boolean;
  title: string;
  welcome_message: string;
  group_name: string;
  expires_at: string | null;
  fields: {
    name: { required: boolean };
    email: { required: boolean };
    phone: { required: boolean };
    applicant_note: { required: boolean };
  };
};

export type PortalFamilyJoinShareLinkState = {
  active: boolean;
  token: string | null;
  join_url: string | null;
  expires_at: string | null;
  title: string;
  welcome_message: string;
  default_role: string;
  created_at?: string;
};

export const publicFamilyJoinApi = {
  getMeta: (token: string) =>
    apiFetch<PublicFamilyJoinLinkMeta>(
      `/website/family-portal-join/${encodeURIComponent(token)}/`,
      undefined,
      false,
    ),
  submit: (
    token: string,
    body: { name: string; email?: string; phone: string; applicant_note?: string },
  ) =>
    apiFetch<{ ok: boolean; message: string; join_request: PortalFamilyJoinRequestRow }>(
      `/website/family-portal-join/${encodeURIComponent(token)}/`,
      { method: "POST", body: JSON.stringify(body) },
      true,
    ),
};

export type PortalFamilyInviteAcceptResponse = {
  ok: boolean;
  pending_approval?: boolean;
  group_id?: string;
  join_request?: PortalFamilyJoinRequestRow;
};

export type PortalFamilyWalletCategoryRow = {
  id: number;
  name: string;
  sort_order: number;
  allowed_member_roles?: string[];
  created_at: string;
  image_url?: string;
};

/** Writable fields for POST /portal/family/wallet/categories/ (from server meta). */
export type PortalFamilyWalletCategoryFieldMeta = {
  name: string;
  type: string;
  required?: boolean;
  max_length?: number;
  default?: number | string[];
  choices?: Array<{ value: string; label: string }>;
};

export type FamilyWalletTransferPayload =
  | {
      from_wallet_id: string | number;
      to_wallet_id: string | number;
      amount: number;
      category_id?: number | string | null;
    }
  | {
      from_member_id: number | string;
      to_member_id: number | string;
      amount: number;
      category_id?: number | string | null;
    };

export type PortalFamilyProductRestrictionRow = {
  id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  is_blocked: boolean;
  requires_approval: boolean;
  max_price: string | null;
};

export type PortalFamilyOverviewViewer = {
  user_id: string;
  family_member_id: string;
  role: string;
  is_leader: boolean;
};

export type PortalFamilyOverview = {
  group: { id: string; name: string; leader_id?: string } | null;
  members: PortalFamilyMemberRow[];
  pending: Array<{
    id: string;
    join_request_id: string | null;
    member: string;
    type: string;
    item: string;
    amount: number;
    time: string;
  }>;
  join_requests: PortalFamilyJoinRequestRow[];
  master_wallet_balance: number;
  add_member_roles?: Array<{ value: string; label: string }>;
  wallet_categories: Array<{
    id: string;
    category_id: string | null;
    name: string;
    balance: number;
    members: number;
    allowed_member_roles?: string[];
    icon: string;
    color: string;
    image_url?: string;
  }>;
  viewer?: PortalFamilyOverviewViewer | null;
  batch_invite_defaults?: { spending_limit: number | null };
};

export type PortalFamilyWalletTxnRow = {
  id: string;
  member: string;
  type: string;
  item: string;
  amount: number;
  /** Positive = money in, negative = money out (family wallet perspective). */
  signed_amount?: number;
  flow?: "in" | "out";
  date: string;
  time: string;
  status: string;
  wallet: string;
  reference_type?: string;
  category_id?: string | null;
  category_name?: string | null;
};

export type PortalFamilyAutoApprovalRuleRow = {
  id: number;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  max_amount: string | null;
  is_enabled: boolean;
};

export type PortalChildSummary = {
  parentLoaded: number;
  selfLoaded: number;
  totalBalance: number;
  spendingLimit: number;
  spentThisMonth: number;
  group_name: string;
};

export type PortalChildWalletTxnRow = {
  id: string;
  item: string;
  amount: number;
  status: string;
  time: string;
  created_at: string;
  date: string;
  type: string;
  wallet: string;
  reference_type?: string;
};

export type PortalChildGroupPermissions = {
  allow_online_purchases: boolean;
  allow_peer_transfers: boolean;
  allow_cash_withdrawal: boolean;
  category_restrictions: boolean;
  time_based_restrictions: boolean;
  daily_spending_limit: number;
};

export type PortalChildMemberLimits = {
  spending_limit_daily: number;
  spending_limit_weekly: number;
  spending_limit_monthly: number;
};

export type PortalChildRulesResponse = {
  group_permissions: PortalChildGroupPermissions | null;
  member_limits: PortalChildMemberLimits | null;
  product_restrictions: PortalFamilyProductRestrictionRow[];
  auto_approval_rules: PortalFamilyAutoApprovalRuleRow[];
};

export type PortalSwitchPortalContext = {
  has_family_portal_access: boolean;
  has_child_portal_access: boolean;
  can_create_family_group: boolean;
  family_group_types: Array<{ value: string; label: string }>;
  create_family_defaults: { status: string };
};

/** GET/POST /portal/delivery-default/ — saved default delivery address from reverse geocoding */
export type PortalDefaultDelivery = {
  area_location: string;
  landmark: string;
  google_map_link: string;
  latitude: number | null;
  longitude: number | null;
};

export const portalApi = {
  login: (phone: string, password: string) =>
    portalFetch<{ token: string; user: { id: number; name: string; phone: string; role: string; kyc_status: string } }>(
      "/portal/auth/login/",
      { method: "POST", body: JSON.stringify({ phone, password }) },
    ),
  selfProfile: () => portalFetch<PortalSelfProfile>("/portal/self-profile/", undefined, true),
  updateSelfProfile: (fd: FormData) =>
    portalFetchMultipart<PortalSelfProfile>("/portal/self-profile/", { method: "PATCH", body: fd }, true),
  changePassword: (old_password: string, new_password: string) =>
    portalFetch<{ ok: true }>(
      "/portal/auth/change-password/",
      { method: "POST", body: JSON.stringify({ old_password, new_password }) },
      true,
    ),
  navigation: (surface: "main" | "family" | "child" = "main") =>
    portalFetch<{ items: ApiNavNode[] }>(`/portal/navigation/${buildQuery({ surface })}`, undefined, true),
  switchPortalContext: () =>
    portalFetch<PortalSwitchPortalContext>("/portal/switch-portal/context/", undefined, true),
  me: () => portalFetch<PortalMe>("/portal/me/", undefined, true),
  summary: () => portalFetch<PortalSummary>("/portal/summary/", undefined, true),
  orders: (params?: QueryParams) => portalPaged<PortalOrderRow>("orders", params),
  /** Customer orders across sellers; main portal only (legacy NULL + portal_main). */
  ordersAllVendors: (params?: QueryParams) =>
    portalFetch<PagedResponse<PortalOrderRow>>(`/orders/all-vendors/${buildQuery(params)}`, undefined, true),
  /** Orders placed from main / family / child portal (surface-specific list). */
  ordersForSurface: (surface: "main" | "family" | "child", params?: QueryParams) => {
    const q = buildQuery(params);
    const path =
      surface === "main"
        ? `/portal/orders/${q}`
        : surface === "family"
          ? `/family-portal/orders/${q}`
          : `/child-portal/orders/${q}`;
    return portalFetch<PagedResponse<PortalOrderRow>>(path, undefined, true);
  },
  requestOrderRefund: (
    surface: "main" | "family" | "child",
    orderPk: number,
    body: { amount?: number; reason: string; notes?: string },
  ) => {
    const prefix =
      surface === "main" ? "/portal" : surface === "family" ? "/family-portal" : "/child-portal";
    return portalFetch<{ ok: boolean; refund_number: string; amount: number; status: string }>(
      `${prefix}/orders/${orderPk}/refund-request/`,
      { method: "POST", body: JSON.stringify(body) },
      true,
    );
  },
  walletTransactions: (params?: QueryParams) => portalPaged<PortalWalletTxnRow>("wallet-transactions", params),
  /** Alias for /portal/wallet-transactions/ */
  transactions: (params?: QueryParams) =>
    portalFetch<PagedResponse<PortalWalletTxnRow>>(`/transactions/${buildQuery(params)}`, undefined, true),
  notifications: () => portalFetch<PortalNotificationRow[]>("/portal/notifications/", undefined, true),
  notificationsMarkRead: (body: { all?: boolean; ids?: string[] }) =>
    portalFetch<{ ok: boolean; updated: number }>(
      "/portal/notifications/mark-read/",
      { method: "POST", body: JSON.stringify(body) },
      true,
    ),
  familyChildren: () => portalFetch<PortalChildAccountRow[]>("/portal/family/children/", undefined, true),
  familyOverview: () => portalFetch<PortalFamilyOverview>("/portal/family/members/", undefined, true),
  createFamilyGroup: (payload: { name: string; type?: string }) =>
    portalFetch<{ id: string; name: string; type: string }>(
      "/portal/family/group/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyInvitesList: () =>
    portalFetch<{
      results: Array<{
        id: string;
        phone: string;
        role: string;
        token: string;
        invite_method: string;
        spending_limit: number;
        initial_balance: number;
        expires_at: string;
        created_at: string;
      }>;
    }>("/portal/family/invites/", undefined, true),
  familyInviteCreate: (payload: {
    phone: string;
    role: string;
    spending_limit?: string | number;
    initial_balance?: string | number;
    invite_method?: "link" | "phone";
  }) =>
    portalFetch<{ id: string; token: string; expires_at: string; phone: string; role: string }>(
      "/portal/family/invites/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyAddMember: (payload: {
    name: string;
    email?: string;
    phone: string;
    role: string;
    age?: number | null;
    invite_method?: "link" | "phone";
    spending_limit?: string | number;
    initial_balance?: string | number;
  }) =>
    portalFetch<{ ok: true; member: PortalFamilyMemberRow }>(
      "/portal/family/members/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyAddMembersBatch: (payload: {
    members: Array<{
      name: string;
      email?: string;
      phone: string;
      role: string;
      age?: number | null;
    }>;
    invite_method?: "link" | "phone";
    spending_limit?: string | number;
    initial_balance?: string | number;
  }) =>
    portalFetch<{
      results: Array<{ ok: true; member: PortalFamilyMemberRow }>;
    }>("/portal/family/members/batch/", { method: "POST", body: JSON.stringify(payload) }, true),
  familyMemberUpdateRole: (memberPk: string | number, role: string) =>
    portalFetch<PortalFamilyMemberRow>(`/portal/family/members/${memberPk}/`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }, true),
  familyMemberPatch: (
    memberPk: string | number,
    body: {
      role?: string;
      spending_limit_daily?: string | number;
      spending_limit_weekly?: string | number;
      spending_limit_monthly?: string | number;
      status?: "active" | "frozen";
    },
  ) =>
    portalFetch<PortalFamilyMemberRow>(`/portal/family/members/${memberPk}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, true),
  familyMemberDelete: (memberPk: string | number) =>
    portalFetch<{ ok: true }>(`/portal/family/members/${memberPk}/`, { method: "DELETE" }, true),
  familyAutoApprovalRules: () =>
    portalFetch<{ results: PortalFamilyAutoApprovalRuleRow[] }>(
      "/portal/family/auto-approval-rules/",
      undefined,
      true,
    ),
  familyAutoApprovalRuleCreate: (payload: {
    name: string;
    description?: string;
    /** Product category PK; omit or null for any category. */
    category?: number | null;
    max_amount?: string | number | null;
    is_enabled?: boolean;
  }) =>
    portalFetch<PortalFamilyAutoApprovalRuleRow>(
      "/portal/family/auto-approval-rules/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyAutoApprovalRulePatch: (
    id: number | string,
    payload: {
      name?: string;
      description?: string;
      category_id?: number | null;
      max_amount?: string | number | null;
      is_enabled?: boolean;
    },
  ) =>
    portalFetch<PortalFamilyAutoApprovalRuleRow>(`/portal/family/auto-approval-rules/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true),
  familyAutoApprovalRuleDelete: (id: number | string) =>
    portalFetch<{ ok: true }>(`/portal/family/auto-approval-rules/${id}/`, { method: "DELETE" }, true),
  familyProductRestrictions: () =>
    portalFetch<{ results: PortalFamilyProductRestrictionRow[] }>(
      "/portal/family/product-restrictions/",
      undefined,
      true,
    ),
  familyProductRestrictionsPut: (
    rules: Array<{
      category_id: number;
      is_blocked?: boolean;
      requires_approval?: boolean;
      max_price?: string | number | null;
    }>,
  ) =>
    portalFetch<{ results: PortalFamilyProductRestrictionRow[] }>(
      "/portal/family/product-restrictions/",
      { method: "PUT", body: JSON.stringify({ rules }) },
      true,
    ),
  familyProductRestrictionsPatch: (payload: {
    category_id: number;
    is_blocked?: boolean;
    requires_approval?: boolean;
    max_price?: string | number | null;
  }) =>
    portalFetch<PortalFamilyProductRestrictionRow | { ok: true; removed: boolean }>(
      "/portal/family/product-restrictions/",
      { method: "PATCH", body: JSON.stringify(payload) },
      true,
    ),
  familyJoinRequestsList: () =>
    portalFetch<{ results: PortalFamilyJoinRequestRow[] }>("/portal/family/join-request/", undefined, true),
  familyJoinRequestPatch: (id: number, action: "approve" | "reject") =>
    portalFetch<{
      ok: boolean;
      status: string;
      join_request: PortalFamilyJoinRequestRow;
    }>(`/portal/family/join-request/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }, true),
  familyJoinShareLinkGet: () =>
    portalFetch<PortalFamilyJoinShareLinkState>("/portal/family/join-share-link/", undefined, true),
  familyJoinShareLinkCreate: (payload?: {
    title?: string;
    welcome_message?: string;
    default_role?: string;
    expires_in_days?: number | null;
  }) =>
    portalFetch<
      PortalFamilyJoinShareLinkState & {
        ok: true;
      }
    >("/portal/family/join-share-link/", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }, true),
  familyWalletLoad: (payload: { amount: number; method?: string }) =>
    portalFetch<{ ok: boolean; balance: number; wallet_id: string }>(
      "/portal/family/wallet/load/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyWalletDistribute: (payload: {
    member_id?: number | string;
    amount?: number;
    category_id?: number | string | null;
    allocations?: Array<{ member_id: number | string; amount: number }>;
  }) =>
    portalFetch<
      | { ok: true; shared_balance: number; member_balance?: number }
      | { ok: true; shared_balance: number }
    >("/portal/family/wallet/distribute/", { method: "POST", body: JSON.stringify(payload) }, true),
  familyWalletTransfer: (payload: FamilyWalletTransferPayload) =>
    portalFetch<{ ok: true; from_balance: number; to_balance: number }>(
      "/portal/family/wallet/transfer/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyWalletCategoryMeta: () =>
    portalFetch<{ fields: PortalFamilyWalletCategoryFieldMeta[] }>(
      "/portal/family/wallet/categories/meta/",
      undefined,
      true,
    ),
  familyWalletCategories: () =>
    portalFetch<{
      results: Array<
        PortalFamilyWalletCategoryRow & { balance: number; wallet_id: string | null }
      >;
    }>("/portal/family/wallet/categories/", undefined, true),
  familyWalletCategoryCreate: (
    payload:
      | FormData
      | {
          name: string;
          sort_order?: number;
          allowed_member_roles?: string[];
        },
  ) => {
    const path = "/portal/family/wallet/categories/";
    type CatCreateRes = PortalFamilyWalletCategoryRow & {
      balance: number;
      wallet_id: string | null;
      image_url?: string;
    };
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      return portalFetchMultipart<CatCreateRes>(path, { method: "POST", body: payload }, true);
    }
    return portalFetch<CatCreateRes>(path, { method: "POST", body: JSON.stringify(payload) }, true);
  },
  familyInviteAccept: (payload: { token: string; phone: string; otp: string }) =>
    portalFetch<PortalFamilyInviteAcceptResponse>(
      "/portal/family/invites/accept/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  familyWalletTransactions: (params?: QueryParams) =>
    portalPaged<PortalFamilyWalletTxnRow>("family/wallet-transactions", params),
  childSummary: () => portalFetch<PortalChildSummary>("/portal/child/summary/", undefined, true),
  childPeerMembers: () =>
    portalFetch<Array<{ id: string; name: string; phone: string }>>(
      "/portal/child/peer-members/",
      undefined,
      true,
    ),
  childWalletPeerTransfer: (payload: {
    to_member_id: number | string;
    amount: number;
    category_id?: number | string | null;
  }) =>
    portalFetch<{ ok: true; from_balance: number; to_balance: number }>(
      "/portal/child/wallet/peer-transfer/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  childWalletTopup: (payload: { amount: number; method?: string }) =>
    portalFetch<{ ok: boolean; balance: number }>(
      "/portal/child/wallet/topup/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  childWalletWithdraw: (payload: {
    amount: number;
    bank_name?: string;
    method_account?: string;
    account_number?: string;
    account_holder?: string;
  }) =>
    portalFetch<{ ok: boolean; balance: number }>(
      "/portal/child/wallet/withdraw/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  childRules: () => portalFetch<PortalChildRulesResponse>("/portal/child/rules/", undefined, true),
  childWalletTransactions: (params?: QueryParams) =>
    portalPaged<PortalChildWalletTxnRow>("child/wallet-transactions", params),
  customerProfile: () => portalFetch<PortalCustomerProfile>("/portal/profile/", undefined, true),
  updateCustomerProfile: (fd: FormData) =>
    portalFetchMultipart<Record<string, unknown>>("/portal/profile/", { method: "PATCH", body: fd }, true),
  favouriteReels: (params?: QueryParams) =>
    portalFetch<PagedResponse<ApiReelPublicRow>>(
      `/portal/reels/favourites/${buildQuery(params)}`,
      undefined,
      true,
    ),
  walletTopup: (payload: { amount: number; method?: string }) =>
    portalFetch<{ ok: boolean; balance: number }>(
      "/portal/wallet/topup/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  walletTransferRecipients: (params?: { q?: string }) =>
    portalFetch<{
      results: Array<{
        user_id: number;
        name: string;
        phone: string;
        username: string;
        kid: string;
      }>;
    }>(`/portal/wallet/transfer-recipients/${buildQuery(params)}`, undefined, true),
  walletTransfer: (payload: { recipient: string; amount: number }) =>
    portalFetch<{ ok: boolean; balance: number }>(
      "/portal/wallet/transfer/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  walletWithdraw: (payload: {
    amount: number;
    bank_name?: string;
    method_account?: string;
    account_number?: string;
    account_holder?: string;
  }) =>
    portalFetch<{ ok: boolean; balance: number }>(
      "/portal/wallet/withdraw/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
  kycSchema: () => portalFetch<PortalKycSchemaResponse>("/portal/kyc/schema/", undefined, true),
  kycStatus: () => portalFetch<PortalKycStatusResponse>("/portal/kyc/status/", undefined, true),
  kycSubmit: (fd: FormData) =>
    portalFetchMultipart<{ id: string; kyc_status: string; document: Record<string, unknown> }>(
      "/portal/kyc/submit/",
      { method: "POST", body: fd },
      true,
    ),
  supportFaqs: () =>
    portalFetch<{
      results: Array<{ id: string; question: string; answer: string; surface?: string }>;
    }>("/portal/support/faqs/", undefined, true),
  supportTickets: (params?: QueryParams) =>
    portalFetch<
      PagedResponse<{
        id: string;
        subject: string;
        status: string;
        priority: string;
        category: string;
        source_panel: string;
        created: string;
        last_activity: string;
      }>
    >(`/portal/support/tickets/${buildQuery(params)}`, undefined, true),
  createSupportTicket: (payload: {
    subject: string;
    description: string;
    priority?: string;
    category?: string;
  }) =>
    portalFetch<{ id: string }>("/portal/support/tickets/", { method: "POST", body: JSON.stringify(payload) }, true),
  supportTicketDetail: (ticketNumber: string) =>
    portalFetch<SupportTicketUserDetail>(
      `/portal/support/tickets/${encodeURIComponent(ticketNumber)}/`,
      undefined,
      true,
    ),
  postPortalSupportTicketMessage: (ticketNumber: string, payload: { body: string; files?: File[] }) => {
    const tn = encodeURIComponent(ticketNumber);
    if (payload.files?.length) {
      const fd = new FormData();
      fd.append('body', payload.body);
      payload.files.forEach((f) => fd.append('files', f));
      return portalFetchMultipart<{ ok: true; message: SupportTicketMessageRow }>(
        `/portal/support/tickets/${tn}/messages/`,
        { method: 'POST', body: fd },
        true,
      );
    }
    return portalFetch<{ ok: true; message: SupportTicketMessageRow }>(
      `/portal/support/tickets/${tn}/messages/`,
      { method: 'POST', body: JSON.stringify({ body: payload.body }) },
      true,
    );
  },
  supportTicketMessagesOlder: (ticketNumber: string, params: { before: string; limit?: number }) =>
    portalFetch<{ results: SupportTicketMessageRow[]; has_more: boolean }>(
      `/portal/support/tickets/${encodeURIComponent(ticketNumber)}/messages/${buildQuery({
        before: params.before,
        limit: params.limit ?? 50,
      })}`,
      undefined,
      true,
    ),
  checkoutWalletContext: () =>
    portalFetch<PortalCheckoutWalletContext>("/portal/orders/checkout-wallet/", undefined, true),
  checkout: (payload: Record<string, unknown>) =>
    portalFetch<{
      order_number: string;
      total: number;
      payment_status: string;
      orders: Array<{ order_number: string; total: number; payment_status: string }>;
      requires_payment_confirmation?: boolean;
    }>("/portal/orders/checkout/", { method: "POST", body: JSON.stringify(payload) }, true),
  ordersPaymentComplete: (orderNumbers: string[], gatewayPayload?: Record<string, unknown>) =>
    portalFetch<{
      orders: Array<{ order_number: string; payment_status: string; total: number }>;
      completed: string[];
      already_paid: string[];
    }>(
      "/portal/orders/payment/complete/",
      {
        method: "POST",
        body: JSON.stringify({
          order_numbers: orderNumbers,
          ...(gatewayPayload ? { gateway_payload: gatewayPayload } : {}),
        }),
      },
      true,
    ),
  /** GET saved default delivery fields; POST { latitude, longitude } to reverse-geocode, save, and return autofill payload */
  deliveryDefault: () =>
    portalFetch<PortalDefaultDelivery>("/portal/delivery-default/", undefined, true),
  saveDeliveryDefaultFromCoords: (payload: { latitude: number; longitude: number }) =>
    portalFetch<PortalDefaultDelivery>(
      "/portal/delivery-default/",
      { method: "POST", body: JSON.stringify(payload) },
      true,
    ),
};

