import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, portalApi } from '@/lib/api';
import PortalNotificationBell from '@/components/portal/PortalNotificationBell';
import PortalNotificationsModal from '@/components/portal/PortalNotificationsModal';

export type PortalHeaderNotificationsProps = {
  surface?: 'child' | 'default';
  /** Shown below the list; pass `null` to hide footer link. */
  ordersDeepLink?: { to: string; label: string } | null;
  className?: string;
};

/**
 * Top-bar notification bell + inbox modal for portals using {@link PortalLayout}.
 */
export default function PortalHeaderNotifications({
  surface = 'default',
  ordersDeepLink,
  className,
}: PortalHeaderNotificationsProps) {
  const [open, setOpen] = useState(false);
  const authed = Boolean(getAuthToken());

  const { data: summary } = useQuery({
    queryKey: ['portal', 'summary', 'notifications-badge'],
    queryFn: () => portalApi.summary(),
    enabled: authed,
    retry: false,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const unread = summary?.notifications_count ?? 0;

  return (
    <>
      <PortalNotificationBell
        unreadCount={unread}
        onClick={() => setOpen(true)}
        className={className}
      />
      <PortalNotificationsModal
        open={open}
        onOpenChange={setOpen}
        surface={surface}
        ordersDeepLink={ordersDeepLink}
      />
    </>
  );
}
