import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { authApi, getAuthToken } from '@/lib/api';

export type PortalShellId = 'admin' | 'vendor' | 'family-portal' | 'child-portal' | 'portal';

/** Map pathname to logical portal shell (first segment group). */
export function portalShellPrefix(pathname: string): PortalShellId | null {
  const p = pathname.toLowerCase();
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/vendor')) return 'vendor';
  if (p.startsWith('/family-portal')) return 'family-portal';
  if (p.startsWith('/child-portal')) return 'child-portal';
  if (p.startsWith('/portal')) return 'portal';
  return null;
}

/**
 * When the session's primary shell (from GET /api/auth/session-home/) differs from the
 * current route, returns redirect path. Used to send vendors/admins away from customer/family URLs.
 */
export function useSessionHomeRedirect(authed: boolean): {
  redirectTarget: string | null;
  isPending: boolean;
} {
  const location = useLocation();
  const q = useQuery({
    queryKey: ['auth', 'session-home'],
    queryFn: () => authApi.sessionHome(),
    enabled: authed && Boolean(getAuthToken()),
    staleTime: 60_000,
    retry: false,
  });

  const redirectTarget = useMemo(() => {
    if (!q.isSuccess || !q.data?.redirect) return null;
    const cur = portalShellPrefix(location.pathname);
    const home = portalShellPrefix(q.data.redirect);
    if (!cur || !home) return null;
    if (cur === home) return null;
    return q.data.redirect;
  }, [q.isSuccess, q.data, location.pathname]);

  return {
    redirectTarget,
    isPending: authed && Boolean(getAuthToken()) && q.isPending,
  };
}
