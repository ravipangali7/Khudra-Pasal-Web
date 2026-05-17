import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, portalApi } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import PortalNotificationBell from '@/components/portal/PortalNotificationBell';
import PortalNotificationsModal from '@/components/portal/PortalNotificationsModal';

export type PortalHeaderNotificationsProps = {
  surface?: 'child' | 'default';
  /** Shown below the list; pass `null` to hide footer link. */
  ordersDeepLink?: { to: string; label: string } | null;
  className?: string;
  /** Full-page notifications list URL; on mobile the bell navigates here instead of opening the modal. */
  notificationsPageHref?: string;
};

/**
 * Top-bar notification bell + inbox modal for portals using {@link PortalLayout}.
 */
export default function PortalHeaderNotifications({
  surface = 'default',
  ordersDeepLink,
  className,
  notificationsPageHref,
}: PortalHeaderNotificationsProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const handleBellClick = () => {
    if (isMobile && notificationsPageHref) {
      navigate(notificationsPageHref);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <PortalNotificationBell unreadCount={unread} onClick={handleBellClick} className={className} />
      <PortalNotificationsModal
        open={open}
        onOpenChange={setOpen}
        surface={surface}
        ordersDeepLink={ordersDeepLink}
      />
    </>
  );
}
