import { describe, it, expect } from 'vitest';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import type {
  PortalChildRulesResponse,
  PortalFamilyAutoApprovalRuleRow,
} from '@/lib/api';

const baseRules = (overrides: Partial<PortalChildRulesResponse> = {}): PortalChildRulesResponse => ({
  group_permissions: {
    allow_online_purchases: true,
    allow_peer_transfers: false,
    allow_cash_withdrawal: true,
    category_restrictions: false,
    time_based_restrictions: false,
    daily_spending_limit: 0,
  },
  member_limits: {
    spending_limit_daily: 0,
    spending_limit_weekly: 0,
    spending_limit_monthly: 0,
  },
  member_spent: null,
  product_restrictions: [],
  auto_approval_rules: [] as PortalFamilyAutoApprovalRuleRow[],
  approved_purchase_product_ids: [],
  ...overrides,
});

describe('evaluateChildProductCommerce', () => {
  it('matches requires_approval on a grandparent slug via categoryAncestorSlugs', () => {
    const rules = baseRules({
      product_restrictions: [
        {
          id: 1,
          category_id: 10,
          category_name: 'Groceries',
          category_slug: 'groceries-slug',
          is_blocked: false,
          requires_approval: true,
          max_price: '',
        },
      ],
    });
    const ev = evaluateChildProductCommerce(
      {
        id: '99',
        category: 'chips-slug',
        price: 50,
        parentCategorySlug: 'snacks-slug',
        categoryAncestorSlugs: ['chips-slug', 'snacks-slug', 'groceries-slug'],
      },
      rules,
    );
    expect(ev.needsApproval).toBe(true);
    expect(ev.commerceDisabled).toBe(true);
  });

  it('falls back to leaf + parent when categoryAncestorSlugs is absent', () => {
    const rules = baseRules({
      product_restrictions: [
        {
          id: 1,
          category_id: 10,
          category_name: 'Snacks',
          category_slug: 'snacks-slug',
          is_blocked: false,
          requires_approval: true,
          max_price: '',
        },
      ],
    });
    const ev = evaluateChildProductCommerce(
      {
        id: '1',
        category: 'chips-slug',
        price: 50,
        parentCategorySlug: 'snacks-slug',
      },
      rules,
    );
    expect(ev.needsApproval).toBe(true);
  });
});
