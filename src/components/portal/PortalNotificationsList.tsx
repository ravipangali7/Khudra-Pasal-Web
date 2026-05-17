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
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAuthToken, portalApi, type PortalNotificationRow } from '@/lib/api';
import { mapPortalNotificationUiType } from '@/lib/portalNotifications';
import { resolveMediaUrl } from '@/pages/admin/hooks/adminFormUtils';

function formatNotifTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function invalidateChildPortalData(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['portal', 'child', 'purchase-approvals'] });
  void qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'portal' &&
      q.queryKey[1] === 'child' &&
      q.queryKey[2] === 'rules',
  });
}

export type PortalNotificationsListProps = {
  enabled?: boolean;
  refetchInterval?: number | false;
  surface?: 'child' | 'default';
  /** Called after navigating via action_url (e.g. close modal). */
  onAfterNavigate?: () => void;
  className?: string;
  /** When true, row tap opens `/notifications/{id}` instead of following action_url immediately. */
  openDetailInPage?: boolean;
  /** Base list URL (no trailing slash); required when openDetailInPage is true. */
  notificationsListHref?: string;
};

export default function PortalNotificationsList({
  enabled = true,
  refetchInterval = false,
  surface = 'default',
  onAfterNavigate,
  className,
  openDetailInPage = false,
  notificationsListHref,
}: PortalNotificationsListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authed = Boolean(getAuthToken());

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => portalApi.notifications(),
    enabled: enabled && authed,
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (body: { all?: boolean; ids?: string[] }) => portalApi.notificationsMarkRead(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
      if (surface === 'child') {
        invalidateChildPortalData(queryClient);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update notifications.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => portalApi.deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
      if (surface === 'child') {
        invalidateChildPortalData(queryClient);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete notification.'),
  });

  const handleRowActivate = (n: PortalNotificationRow) => {
    if (!n.is_read) {
      markReadMutation.mutate({ ids: [n.id] });
    }
    if (openDetailInPage && notificationsListHref) {
      navigate(`${notificationsListHref.replace(/\/$/, '')}/${n.id}`);
      onAfterNavigate?.();
      return;
    }
    const url = (n.action_url || '').trim();
    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(url);
      }
      onAfterNavigate?.();
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm', className)}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn('text-center py-12 px-4 space-y-3', className)}>
        <p className="text-sm text-destructive">Could not load notifications.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-16 px-4', className)}>
        No notifications yet.
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {rows.map((n) => {
        const uiType = mapPortalNotificationUiType(n.type);
        const title = n.title?.trim() || 'Notification';
        const body = (n.message || n.preview || '').trim();
        const unread = n.is_read === false;
        const thumb = n.image_url ? resolveMediaUrl(n.image_url) : '';
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => handleRowActivate(n)}
            className={cn(
              'w-full text-left rounded-xl border p-3 transition-colors hover:bg-muted/60',
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
                {thumb ? (
                  <img src={thumb} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
                ) : n.type === 'order' ? (
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
  );
}

/** Mark-all-read control for page header / modal header. */
export function PortalNotificationsMarkAllButton({
  surface = 'default',
  className,
}: {
  surface?: 'child' | 'default';
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => portalApi.notifications(),
    enabled: Boolean(getAuthToken()),
  });

  const markReadMutation = useMutation({
    mutationFn: () => portalApi.notificationsMarkRead({ all: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'summary'] });
      if (surface === 'child') {
        invalidateChildPortalData(queryClient);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update notifications.'),
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('text-xs shrink-0 h-8', className)}
      disabled={markReadMutation.isPending || rows.length === 0}
      onClick={() => markReadMutation.mutate()}
    >
      {markReadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark all read'}
    </Button>
  );
}
