import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ExternalLink,
  Loader2,
  Package,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getAuthToken, portalApi, type PortalNotificationRow } from '@/lib/api';
import { mapPortalNotificationUiType } from '@/lib/portalNotifications';

type PortalNotificationsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown below the list; omit on surfaces that do not host `/portal/orders`. */
  ordersDeepLink?: { to: string; label: string } | null;
};

function formatNotifTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

const DEFAULT_ORDERS_LINK = { to: '/portal/orders', label: 'View order history' } as const;

export default function PortalNotificationsModal({
  open,
  onOpenChange,
  ordersDeepLink = DEFAULT_ORDERS_LINK,
}: PortalNotificationsModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authed = Boolean(getAuthToken());

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => portalApi.notifications(),
    enabled: open && authed,
    refetchInterval: open ? 12_000 : false,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (body: { all?: boolean; ids?: string[] }) => portalApi.notificationsMarkRead(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update notifications.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => portalApi.deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete notification.'),
  });

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ all: true });
  };

  const handleRowActivate = (n: PortalNotificationRow) => {
    if (!n.is_read) {
      markReadMutation.mutate({ ids: [n.id] });
    }
    const url = (n.action_url || '').trim();
    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(url);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs shrink-0 h-8"
              disabled={markReadMutation.isPending || rows.length === 0}
              onClick={handleMarkAllRead}
            >
              {markReadMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Mark all read'
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading…
            </div>
          )}
          {isError && (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-sm text-destructive">Could not load notifications.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-16 px-4">No notifications yet.</p>
          )}
          {!isLoading &&
            !isError &&
            rows.map((n) => {
              const uiType = mapPortalNotificationUiType(n.type);
              const title = n.title?.trim() || 'Notification';
              const body = (n.message || n.preview || '').trim();
              const unread = n.is_read === false;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleRowActivate(n)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 mb-2 transition-colors hover:bg-muted/60',
                    unread ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                    n.urgent && 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        uiType === 'alert' && 'bg-destructive/10',
                        uiType === 'success' && 'bg-emerald-500/10',
                        uiType === 'warning' && 'bg-amber-500/10',
                        uiType === 'info' && 'bg-primary/10',
                      )}
                    >
                      {n.type === 'order' ? (
                        <Package className="w-4 h-4 text-emerald-600" />
                      ) : uiType === 'alert' ? (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      ) : uiType === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : uiType === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Bell className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-semibold leading-snug', unread && 'text-foreground')}>
                          {title}
                          {unread && (
                            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />
                          )}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {n.action_url ? (
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                          ) : null}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-muted/70"
                            disabled={deleteMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteMutation.mutateAsync(n.id);
                            }}
                            aria-label="Delete notification"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      {body ? (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{body}</p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatNotifTime(n.created_at || n.time)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
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
