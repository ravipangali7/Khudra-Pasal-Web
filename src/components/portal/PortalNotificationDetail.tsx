import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle,
  ExternalLink,
  Loader2,
  Package,
  Trash2,
} from 'lucide-react';
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

type Props = {
  notificationId: string;
  listHref: string;
  surface?: 'child' | 'default';
};

export default function PortalNotificationDetail({ notificationId, listHref, surface = 'default' }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authed = Boolean(getAuthToken());

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => portalApi.notifications(),
    enabled: authed,
    refetchOnWindowFocus: true,
  });

  const notification = rows.find((n) => n.id === notificationId) ?? null;

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
      toast.success('Notification removed.');
      navigate(listHref);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete notification.'),
  });

  useEffect(() => {
    if (!notification || notification.is_read !== false) return;
    markReadMutation.mutate({ ids: [notification.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark read once when detail opens
  }, [notification?.id, notification?.is_read]);

  const handleFollowAction = (n: PortalNotificationRow) => {
    const url = (n.action_url || '').trim();
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 px-4 space-y-3">
        <p className="text-sm text-destructive">Could not load notification.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" className="h-8 -ml-2" asChild>
          <Link to={listHref}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to notifications
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground px-1">
          This notification could not be found. It may have been removed.
        </p>
      </div>
    );
  }

  const uiType = mapPortalNotificationUiType(notification.type);
  const title = notification.title?.trim() || 'Notification';
  const body = (notification.message || notification.preview || '').trim();
  const thumb = notification.image_url ? resolveMediaUrl(notification.image_url) : '';
  const actionUrl = (notification.action_url || '').trim();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="h-8 -ml-2" asChild>
          <Link to={listHref}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to notifications
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
          disabled={deleteMutation.isPending}
          onClick={() => void deleteMutation.mutateAsync(notification.id)}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </>
          )}
        </Button>
      </div>

      <article
        className={cn(
          'rounded-xl border bg-card p-4 md:p-6 space-y-4 shadow-sm',
          notification.urgent ? 'border-destructive/40' : 'border-border',
        )}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
              uiType === 'alert' && 'bg-destructive/10',
              uiType === 'success' && 'bg-emerald-500/10',
              uiType === 'warning' && 'bg-amber-500/10',
              uiType === 'info' && 'bg-primary/10',
            )}
          >
            {thumb ? (
              <img src={thumb} alt="" className="w-11 h-11 rounded-full object-cover border border-border" />
            ) : notification.type === 'order' ? (
              <Package className="w-5 h-5 text-emerald-600" />
            ) : uiType === 'alert' ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : uiType === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : uiType === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : (
              <Bell className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold leading-snug">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {formatNotifTime(notification.created_at || notification.time)}
            </p>
          </div>
        </div>

        {body ? (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No additional details.</p>
        )}

        {actionUrl ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => handleFollowAction(notification)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open related page
          </Button>
        ) : null}
      </article>
    </div>
  );
}
