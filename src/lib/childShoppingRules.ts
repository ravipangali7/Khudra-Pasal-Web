import type { PortalChildRulesResponse } from '@/lib/api';
import type { Product } from '@/types';

export type ChildProductCommerceEval = {
  purchasesOff: boolean;
  blocked: boolean;
  needsApproval: boolean;
  overMaxPrice: boolean;
  commerceDisabled: boolean;
  message: string;
};

const allowed: ChildProductCommerceEval = {
  purchasesOff: false,
  blocked: false,
  needsApproval: false,
  overMaxPrice: false,
  commerceDisabled: false,
  message: '',
};

/**
 * Apply the same family rules as the child portal catalog / backend guard
 * (group_permissions + product_restrictions by category slug).
 */
export function evaluateChildProductCommerce(
  product: Pick<Product, 'category' | 'price'>,
  rules: PortalChildRulesResponse | null | undefined,
): ChildProductCommerceEval {
  if (!rules?.group_permissions) return allowed;

  const gp = rules.group_permissions;
  if (!gp.allow_online_purchases) {
    return {
      purchasesOff: true,
      blocked: false,
      needsApproval: false,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'Online purchases are turned off for your account.',
    };
  }

  const slug = product.category;
  const r = rules.product_restrictions?.find((x) => x.category_slug === slug);
  if (!r) return allowed;

  if (r.is_blocked) {
    return {
      purchasesOff: false,
      blocked: true,
      needsApproval: false,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'This category is blocked for your account.',
    };
  }
  if (r.requires_approval) {
    return {
      purchasesOff: false,
      blocked: false,
      needsApproval: true,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'This category requires parent approval before you can purchase.',
    };
  }
  const maxP = r.max_price != null && r.max_price !== '' ? Number(r.max_price) : NaN;
  if (Number.isFinite(maxP) && product.price > maxP) {
    return {
      purchasesOff: false,
      blocked: false,
      needsApproval: false,
      overMaxPrice: true,
      commerceDisabled: true,
      message: `This product exceeds the maximum price (Rs. ${maxP.toLocaleString('en-NP')}) allowed for this category.`,
    };
  }
  return allowed;
}
