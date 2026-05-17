import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PortalNotificationBellProps = {
  unreadCount: number;
  onClick: () => void;
  className?: string;
};

/** Header bell control with unread badge — used across shopper portals. */
export default function PortalNotificationBell({
  unreadCount,
  onClick,
  className,
}: PortalNotificationBellProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn('relative h-9 w-9 shrink-0', className)}
      aria-label="Open notifications"
      onClick={onClick}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
