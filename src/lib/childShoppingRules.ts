import type { PortalChildRulesResponse, PortalFamilyProductRestrictionRow } from '@/lib/api';
import type { Product } from '@/types';

export type ChildProductCommerceEval = {
  purchasesOff: boolean;
  blocked: boolean;
  needsApproval: boolean;
  overMaxPrice: boolean;
  commerceDisabled: boolean;
  message: string;
  /** Parent approved this product; approval gate is waived (blocked / max price still apply). */
  hasPurchaseApproval: boolean;
};

const allowed = (): ChildProductCommerceEval => ({
  purchasesOff: false,
  blocked: false,
  needsApproval: false,
  overMaxPrice: false,
  commerceDisabled: false,
  message: '',
  hasPurchaseApproval: false,
});

function categorySlugsForRuleMatch(
  leafSlug: string,
  parentSlug: string | null | undefined,
  categoryAncestorSlugs?: string[] | null,
): Set<string> {
  if (categoryAncestorSlugs?.length) {
    return new Set(categoryAncestorSlugs.filter(Boolean));
  }
  const slugs = new Set<string>();
  if (leafSlug && leafSlug !== 'all') slugs.add(leafSlug);
  if (parentSlug) slugs.add(parentSlug);
  return slugs;
}

function restrictionRowsForCategorySlugs(
  restrictions: PortalFamilyProductRestrictionRow[] | undefined,
  leafSlug: string,
  parentSlug?: string | null,
  categoryAncestorSlugs?: string[] | null,
): PortalFamilyProductRestrictionRow[] {
  if (!restrictions?.length) return [];
  const slugs = categorySlugsForRuleMatch(leafSlug, parentSlug, categoryAncestorSlugs);
  return restrictions.filter((x) => Boolean(x.category_slug) && slugs.has(x.category_slug));
}

function mergeRestrictionRows(rows: PortalFamilyProductRestrictionRow[]): {
  blocked: boolean;
  requiresApproval: boolean;
  maxPrice: number | null;
} | null {
  if (!rows.length) return null;
  const caps = rows
    .map((r) => (r.max_price != null && r.max_price !== '' ? Number(r.max_price) : NaN))
    .filter((n) => Number.isFinite(n));
  return {
    blocked: rows.some((r) => r.is_blocked),
    requiresApproval: rows.some((r) => r.requires_approval),
    maxPrice: caps.length ? Math.min(...caps) : null,
  };
}

function productHasApprovedPurchase(
  rules: PortalChildRulesResponse | null | undefined,
  productId: string | undefined,
): boolean {
  if (!rules?.approved_purchase_product_ids?.length || !productId) return false;
  const pid = Number(productId);
  if (!Number.isFinite(pid)) return false;
  return rules.approved_purchase_product_ids.includes(pid);
}

export type ChildProductCommerceProductArg = Pick<
  Product,
  'category' | 'price' | 'parentCategorySlug' | 'categoryAncestorSlugs'
> & {
  id?: string;
};

/**
 * Apply the same family rules as the child portal catalog / backend guard
 * (group_permissions + product_restrictions merged along full category ancestor slugs when provided).
 */
export function evaluateChildProductCommerce(
  product:
    | ChildProductCommerceProductArg
    | {
        category: string;
        price: number;
        parentCategorySlug?: string | null;
        categoryAncestorSlugs?: string[] | null;
        id?: string;
      },
  rules: PortalChildRulesResponse | null | undefined,
): ChildProductCommerceEval {
  if (!rules?.group_permissions) return allowed();

  const gp = rules.group_permissions;
  if (!gp.allow_online_purchases) {
    return {
      purchasesOff: true,
      blocked: false,
      needsApproval: false,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'Online purchases are turned off for your account.',
      hasPurchaseApproval: false,
    };
  }

  const leaf = product.category;
  const parentSlug =
    'parentCategorySlug' in product ? (product.parentCategorySlug ?? null) : null;
  const categoryAncestorSlugs =
    'categoryAncestorSlugs' in product ? (product.categoryAncestorSlugs ?? undefined) : undefined;
  const rows = restrictionRowsForCategorySlugs(
    rules.product_restrictions,
    leaf,
    parentSlug,
    categoryAncestorSlugs,
  );
  const merged = mergeRestrictionRows(rows);
  if (!merged) {
    return allowed();
  }

  const hasPurchaseApproval = productHasApprovedPurchase(rules, product.id);

  if (merged.blocked) {
    return {
      purchasesOff: false,
      blocked: true,
      needsApproval: false,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'This category is blocked for your account.',
      hasPurchaseApproval: false,
    };
  }
  if (merged.requiresApproval && !hasPurchaseApproval) {
    return {
      purchasesOff: false,
      blocked: false,
      needsApproval: true,
      overMaxPrice: false,
      commerceDisabled: true,
      message: 'This category requires parent approval before you can purchase.',
      hasPurchaseApproval: false,
    };
  }
  if (merged.maxPrice != null && product.price > merged.maxPrice) {
    return {
      purchasesOff: false,
      blocked: false,
      needsApproval: false,
      overMaxPrice: true,
      commerceDisabled: true,
      message: `This product exceeds the maximum price (Rs. ${merged.maxPrice.toLocaleString('en-NP')}) allowed for this category.`,
      hasPurchaseApproval: false,
    };
  }
  const out = allowed();
  out.hasPurchaseApproval = hasPurchaseApproval;
  return out;
}

/** True if the product should be hidden from the child portal catalog (blocked on leaf or parent category). */
export function isChildCatalogProductBlocked(
  leafSlug: string | undefined,
  parentSlug: string | null | undefined,
  rules: PortalChildRulesResponse | null | undefined,
  categoryAncestorSlugs?: string[] | null,
): boolean {
  if (!rules?.product_restrictions?.length) return false;
  const rows = restrictionRowsForCategorySlugs(
    rules.product_restrictions,
    leafSlug || 'all',
    parentSlug,
    categoryAncestorSlugs,
  );
  return rows.some((r) => r.is_blocked);
}
