import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PortalNotificationDetail from '@/components/portal/PortalNotificationDetail';
import PortalNotificationsList, { PortalNotificationsMarkAllButton } from '@/components/portal/PortalNotificationsList';

export type PortalNotificationsSectionProps = {
  /** When set (deep link), renders full notification view instead of the list. */
  notificationId?: string | null;
  /** List URL without trailing slash; used for row links and detail back navigation. */
  notificationsListHref?: string;
  surface?: 'child' | 'default';
  ordersDeepLink?: { to: string; label: string } | null;
};

const DEFAULT_ORDERS_LINK = { to: '/portal/orders', label: 'View order history' } as const;

export default function PortalNotificationsSection({
  notificationId = null,
  notificationsListHref = '/portal/notifications',
  surface = 'default',
  ordersDeepLink = DEFAULT_ORDERS_LINK,
}: PortalNotificationsSectionProps) {
  if (notificationId) {
    return (
      <PortalNotificationDetail
        notificationId={notificationId}
        listHref={notificationsListHref}
        surface={surface}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary shrink-0" />
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Orders, wallet activity, KYC updates, and other alerts for your account.
          </p>
        </div>
        <PortalNotificationsMarkAllButton className="self-start" surface={surface} />
      </div>
      <PortalNotificationsList
        refetchInterval={12_000}
        surface={surface}
        openDetailInPage
        notificationsListHref={notificationsListHref}
      />
      {ordersDeepLink ? (
        <div className="pt-2 border-t border-border text-center">
          <Button variant="link" className="text-xs h-auto p-0" asChild>
            <Link to={ordersDeepLink.to}>{ordersDeepLink.label}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

