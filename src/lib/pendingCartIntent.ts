import type { Product } from "@/types";

const PENDING_CART_INTENT_KEY = "khudrapasal_pending_cart_intent";
const PENDING_CART_INTENT_TTL_MS = 15 * 60 * 1000;

type PendingCartIntent = {
  productId: string;
  quantity: number;
  listingScope?: string;
  nextPath: string;
  productSnapshot?: Product;
  createdAt: number;
};

function isSafeNextPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

function normalizeIntent(raw: unknown): PendingCartIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const createdAt = Number(row.createdAt);
  const quantity = Number(row.quantity);
  const productId = typeof row.productId === "string" ? row.productId : "";
  const nextPath = row.nextPath;
  if (!Number.isFinite(createdAt)) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!productId) return null;
  if (!isSafeNextPath(nextPath)) return null;
  if (Date.now() - createdAt > PENDING_CART_INTENT_TTL_MS) return null;

  const productSnapshot = row.productSnapshot as Product | undefined;
  return {
    productId,
    quantity,
    listingScope: typeof row.listingScope === "string" ? row.listingScope : undefined,
    nextPath,
    productSnapshot,
    createdAt,
  };
}

export function savePendingCartIntent(payload: {
  product: Product;
  quantity?: number;
  listingScope?: string;
  nextPath: string;
}) {
  if (!isSafeNextPath(payload.nextPath)) return;
  const value: PendingCartIntent = {
    productId: payload.product.id,
    quantity: payload.quantity ?? 1,
    listingScope: payload.listingScope,
    nextPath: payload.nextPath,
    productSnapshot: payload.product,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(PENDING_CART_INTENT_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function consumePendingCartIntent(): PendingCartIntent | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CART_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_CART_INTENT_KEY);
    return normalizeIntent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPendingCartIntent() {
  try {
    sessionStorage.removeItem(PENDING_CART_INTENT_KEY);
  } catch {
    /* ignore */
  }
}
