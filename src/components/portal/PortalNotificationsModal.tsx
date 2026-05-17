import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PortalNotificationsList, { PortalNotificationsMarkAllButton } from '@/components/portal/PortalNotificationsList';

type PortalNotificationsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown below the list; omit on surfaces that do not host `/portal/orders`. */
  ordersDeepLink?: { to: string; label: string } | null;
  /**
   * When `child`, after mark-read/delete also refresh child dashboard data
   * (pending approvals, merged rules / approved product IDs).
   */
  surface?: 'child' | 'default';
};

const DEFAULT_ORDERS_LINK = { to: '/portal/orders', label: 'View order history' } as const;

export default function PortalNotificationsModal({
  open,
  onOpenChange,
  ordersDeepLink = DEFAULT_ORDERS_LINK,
  surface = 'default',
}: PortalNotificationsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </DialogTitle>
            <PortalNotificationsMarkAllButton surface={surface} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
          <PortalNotificationsList
            enabled={open}
            refetchInterval={open ? 12_000 : false}
            surface={surface}
            onAfterNavigate={() => onOpenChange(false)}
          />
        </div>

        {ordersDeepLink ? (
          <div className="px-4 py-3 border-t border-border bg-muted/30 text-center shrink-0">
            <Button variant="link" className="text-xs h-auto p-0" asChild>
              <Link to={ordersDeepLink.to} onClick={() => onOpenChange(false)}>
                {ordersDeepLink.label}
              </Link>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
