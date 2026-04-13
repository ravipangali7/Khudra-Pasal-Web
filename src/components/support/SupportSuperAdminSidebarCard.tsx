import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle } from 'lucide-react';
import { portalApi, vendorApi, type SupportSuperAdminContact } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0] ?? ''}${p[p.length - 1][0] ?? ''}`.toUpperCase();
  if (p.length === 1 && p[0].length) return p[0].slice(0, 2).toUpperCase();
  return '?';
}

type Props = {
  variant: 'portal' | 'vendor';
  onOpenMessages: () => void;
  className?: string;
};

export default function SupportSuperAdminSidebarCard({ variant, onOpenMessages, className }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['support', 'super-admin-contact', variant],
    queryFn: (): Promise<SupportSuperAdminContact> =>
      variant === 'portal' ? portalApi.supportSuperAdminContact() : vendorApi.supportSuperAdminContact(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground text-xs',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading support…
      </div>
    );
  }

  if (isError || !data?.name) {
    return null;
  }

  const phone = (data.phone || '').trim();
  const avatar = (data.avatar_url || '').trim();

  return (
    <button
      type="button"
      onClick={onOpenMessages}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors',
        'shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 border border-border">
            {avatar ? <AvatarImage src={avatar} alt="" className="object-cover" /> : null}
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials(data.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
              data.is_online ? 'bg-emerald-500' : 'bg-muted-foreground/50',
            )}
            title={data.is_online ? 'Online' : 'Offline'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{data.name}</p>
          {phone ? (
            <p className="text-xs text-muted-foreground truncate tabular-nums">{phone}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Khudra Pasal support</p>
          )}
        </div>
        <MessageCircle className="h-5 w-5 shrink-0 text-primary opacity-80" aria-hidden />
      </div>
      <div className="px-3 pb-2.5 pt-0">
        <p className="text-[11px] text-muted-foreground leading-snug">Tap to open messages</p>
      </div>
    </button>
  );
}
