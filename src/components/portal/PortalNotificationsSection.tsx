import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PortalNotificationsList, { PortalNotificationsMarkAllButton } from '@/components/portal/PortalNotificationsList';

export default function PortalNotificationsSection() {
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
        <PortalNotificationsMarkAllButton className="self-start" />
      </div>
      <PortalNotificationsList refetchInterval={12_000} />
      <div className="pt-2 border-t border-border text-center">
        <Button variant="link" className="text-xs h-auto p-0" asChild>
          <Link to="/portal/orders">View order history</Link>
        </Button>
      </div>
    </div>
  );
}
