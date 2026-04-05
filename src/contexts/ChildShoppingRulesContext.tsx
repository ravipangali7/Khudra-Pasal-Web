import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, isStorefrontCustomerSession, portalApi, type PortalChildRulesResponse, type PortalSelfProfile } from '@/lib/api';

type ChildShoppingRulesContextValue = {
  /** Logged-in storefront user is a child account (portal_role). */
  isChildShopper: boolean;
  /** Child rules from API; null if not loaded, not a child, or request failed. */
  rules: PortalChildRulesResponse | null;
  profile: PortalSelfProfile | undefined;
  isLoadingProfile: boolean;
  isLoadingRules: boolean;
  /** Child rules request failed (retry disabled); fail closed for cart/catalog until refetch succeeds. */
  rulesFetchError: boolean;
};

const ChildShoppingRulesContext = createContext<ChildShoppingRulesContextValue | undefined>(undefined);

export function ChildShoppingRulesProvider({ children }: { children: ReactNode }) {
  const hasSession = isStorefrontCustomerSession() && Boolean(getAuthToken());

  const profileQuery = useQuery({
    queryKey: ['portal', 'self-profile', hasSession],
    queryFn: () => portalApi.selfProfile(),
    enabled: hasSession,
    staleTime: 60_000,
  });

  const isChildShopper = profileQuery.data?.portal_role === 'child';

  const rulesQuery = useQuery({
    queryKey: ['portal', 'child-rules'],
    queryFn: () => portalApi.childRules(),
    enabled: hasSession && isChildShopper,
    staleTime: 30_000,
    retry: false,
  });

  const value = useMemo((): ChildShoppingRulesContextValue => {
    if (!hasSession) {
      return {
        isChildShopper: false,
        rules: null,
        profile: undefined,
        isLoadingProfile: false,
        isLoadingRules: false,
        rulesFetchError: false,
      };
    }
    const rules: PortalChildRulesResponse | null =
      isChildShopper && rulesQuery.data ? rulesQuery.data : null;
    const isLoadingRules = isChildShopper && rulesQuery.isLoading;
    const rulesFetchError =
      isChildShopper && !rulesQuery.isLoading && rulesQuery.isError;
    return {
      isChildShopper,
      rules,
      profile: profileQuery.data,
      isLoadingProfile: profileQuery.isLoading,
      isLoadingRules,
      rulesFetchError,
    };
  }, [
    hasSession,
    isChildShopper,
    rulesQuery.data,
    rulesQuery.isLoading,
    rulesQuery.isError,
    profileQuery.data,
    profileQuery.isLoading,
  ]);

  return (
    <ChildShoppingRulesContext.Provider value={value}>{children}</ChildShoppingRulesContext.Provider>
  );
}

export function useChildShoppingRules(): ChildShoppingRulesContextValue {
  const ctx = useContext(ChildShoppingRulesContext);
  if (!ctx) {
    throw new Error('useChildShoppingRules must be used within ChildShoppingRulesProvider');
  }
  return ctx;
}
