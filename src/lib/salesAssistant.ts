import type { WebsiteProduct } from '@/lib/api';
import type { Product } from '@/types';

/** Serializable product snapshot for the sales assistant (built from page state, not DOM). */
export type ProductAiContext = {
  productId: string;
  /** Full first user message sent to Gemini for the pitch. */
  firstUserMessage: string;
};

/**
 * Builds the initial user message and IDs the product for session reset logic.
 * Returns null while the product detail payload is not ready.
 */
export function buildProductAiContext(
  product: Product,
  detail: WebsiteProduct | null | undefined,
): ProductAiContext | null {
  if (!detail || product.id === '0') return null;

  const short = (detail.short_description ?? '').trim();
  const long = (detail.description ?? '').trim();
  const description = [short, long].filter(Boolean).join('\n\n') || short || long || 'See product page for details.';
  const features = short || (long ? long.slice(0, 500) : 'Listed on the product page.');
  const priceLabel = `Rs. ${product.price.toLocaleString()}`;
  const ratingLabel = product.rating ? String(product.rating) : 'N/A';
  const reviewCount =
    product.reviewCount != null && product.reviewCount > 0
      ? String(product.reviewCount)
      : '0';

  const firstUserMessage =
    `Product: ${product.name}\n` +
    `Price: ${priceLabel}\n` +
    `Description: ${description}\n` +
    `Features: ${features}\n` +
    `Rating: ${ratingLabel} (${reviewCount} reviews)\n` +
    `Please give me your sales pitch for this product.`;

  return {
    productId: product.id,
    firstUserMessage,
  };
}
