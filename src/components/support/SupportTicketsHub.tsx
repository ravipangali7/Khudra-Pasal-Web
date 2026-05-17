import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Loader2, MessageSquarePlus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  extractResults,
  portalApi,
  vendorApi,
  type SupportTicketMessageRow,
  type SupportTicketUserDetail,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SupportTicketChatPanel, { type SupportTicketChatPanelHandle } from './SupportTicketChatPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileUx } from '@/hooks/useMobileUx';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useVisualViewportLayout } from '@/hooks/useVisualViewportLayout';
import {
  appendSupportTicketMessageToCache,
  SUPPORT_CHAT_POLL_MS,
} from './supportChatCache';
import { SUPPORT_CATEGORY_OPTIONS, SUPPORT_PRIORITY_OPTIONS } from './supportConstants';

type HubVariant = 'portal' | 'vendor';

export type SupportTicketsHubHandle = {
  /** Scrolls the hub into view and opens or focuses the in-page ticket chat. */
  openMessages: () => void;
};

type SupportTicketsHubProps = {
  variant: HubVariant;
  listQueryKey: string[];
  title?: string;
  subtitle?: string;
  showPriorityOnCreate?: boolean;
  /** When true, after load selects or focuses chat (first ticket or new-ticket form) like imperative openMessages(). */
  openMessagesOnMount?: boolean;
};

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

const SupportTicketsHub = forwardRef<SupportTicketsHubHandle, SupportTicketsHubProps>(function SupportTicketsHub(
  {
    variant,
    listQueryKey,
    title = 'Support',
    subtitle = 'Create a ticket and chat with our team.',
    showPriorityOnCreate = true,
    openMessagesOnMount = false,
  },
  ref,
) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const mobileUx = useMobileUx();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatRef = useRef<SupportTicketChatPanelHandle>(null);
  const pendingOpenMessagesRef = useRef(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [ticketSwitcherOpen, setTicketSwitcherOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [priority, setPriority] = useState<string>('medium');
  const [olderMessages, setOlderMessages] = useState<SupportTicketMessageRow[]>([]);
  const [loadOlderExhausted, setLoadOlderExhausted] = useState(false);
  const [loadOlderPending, setLoadOlderPending] = useState(false);

  const mobileTicketChatOpen = Boolean(selectedId) && mobileUx;
  const vvLayout = useVisualViewportLayout(mobileTicketChatOpen);
  useLockBodyScroll(mobileTicketChatOpen);

  const mobileTicketChatStyle: CSSProperties | undefined = mobileTicketChatOpen
    ? {
        top: vvLayout.top,
        height: vvLayout.height,
        bottom: 'auto',
      }
    : undefined;

  useEffect(() => {
    setOlderMessages([]);
    setLoadOlderExhausted(false);
  }, [selectedId]);

  const { data: ticketPage, isLoading: listLoading } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      variant === 'portal'
        ? portalApi.supportTickets({ page_size: 50 })
        : vendorApi.supportTickets({ page_size: 50 }),
  });

  const tickets = useMemo(() => extractResults(ticketPage), [ticketPage]);

  useImperativeHandle(ref, () => ({
    openMessages: () => {
      document.getElementById('support-tickets-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pendingOpenMessagesRef.current = true;
    },
  }));

  useEffect(() => {
    if (!openMessagesOnMount) return;
    document.getElementById('support-tickets-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pendingOpenMessagesRef.current = true;
  }, [openMessagesOnMount]);

  useEffect(() => {
    if (!pendingOpenMessagesRef.current || listLoading) return;
    pendingOpenMessagesRef.current = false;
    if (selectedId) {
      if (!isMobile) {
        const t = window.setTimeout(() => chatRef.current?.focusComposer(), 200);
        return () => window.clearTimeout(t);
      }
      return;
    }
    if (tickets.length > 0) {
      const first = tickets[0] as Record<string, unknown>;
      setSelectedId(String(first.id));
      return;
    }
    if (!isMobile) {
      const t = window.setTimeout(() => subjectInputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [isMobile, listLoading, tickets, selectedId]);

  useEffect(() => {
    const raw = (searchParams.get('ticket') || '').trim();
    if (!raw || listLoading) return;
    const ids = new Set(
      (tickets as Record<string, unknown>[]).map((t) => String(t.id)),
    );
    if (!ids.has(raw)) return;
    setSelectedId(raw);
    const next = new URLSearchParams(searchParams);
    next.delete('ticket');
    setSearchParams(next, { replace: true });
  }, [searchParams, listLoading, tickets, setSearchParams]);

  const detailQuery = useQuery({
    queryKey: [...listQueryKey, 'detail', selectedId],
    queryFn: () =>
      variant === 'portal'
        ? portalApi.supportTicketDetail(selectedId!)
        : vendorApi.supportTicketDetail(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: selectedId ? SUPPORT_CHAT_POLL_MS : false,
    refetchIntervalInBackground: true,
  });

  const createMut = useMutation({
    mutationFn: () => {
      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        ...(showPriorityOnCreate ? { priority } : {}),
      };
      return variant === 'portal'
        ? portalApi.createSupportTicket(payload)
        : vendorApi.createSupportTicket(payload);
    },
    onSuccess: (res) => {
      toast.success(`Ticket ${res.id} created`);
      setSubject('');
      setDescription('');
      setCategory('other');
      setPriority('medium');
      void qc.invalidateQueries({ queryKey: listQueryKey });
      setSelectedId(res.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMut = useMutation({
    mutationFn: ({ body, files }: { body: string; files: File[] }) =>
      variant === 'portal'
        ? portalApi.postPortalSupportTicketMessage(selectedId!, { body, files })
        : vendorApi.postSupportTicketMessage(selectedId!, { body, files }),
    onSuccess: (res) => {
      if (selectedId) {
        appendSupportTicketMessageToCache(
          qc,
          [...listQueryKey, 'detail', selectedId],
          res.message,
        );
      }
      void qc.invalidateQueries({ queryKey: listQueryKey });
      void qc.invalidateQueries({ queryKey: [...listQueryKey, 'detail', selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detail = detailQuery.data as SupportTicketUserDetail | undefined;
  const baseMessages: SupportTicketMessageRow[] = detail?.messages ?? [];

  const mergedMessages = useMemo(() => {
    const byId = new Map<string, SupportTicketMessageRow>();
    for (const m of olderMessages) {
      byId.set(m.id, { ...m, attachments: m.attachments ?? [] });
    }
    for (const m of baseMessages) {
      byId.set(m.id, { ...m, attachments: m.attachments ?? [] });
    }
    return Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return Number(a.id) - Number(b.id);
    });
  }, [olderMessages, baseMessages]);

  const MIN_LOAD_OLDER_MS = 5000;

  useEffect(() => {
    if (!selectedId || detailQuery.isLoading || isMobile) return;
    const t = window.setTimeout(() => chatRef.current?.focusComposer(), 100);
    return () => window.clearTimeout(t);
  }, [selectedId, detailQuery.isLoading, detailQuery.dataUpdatedAt, isMobile]);

  const loadOlder = async () => {
    if (!selectedId || mergedMessages.length === 0) return;
    const oldest = mergedMessages.reduce((a, b) => (Number(a.id) < Number(b.id) ? a : b));
    setLoadOlderPending(true);
    const started = Date.now();
    try {
      const res =
        variant === 'portal'
          ? await portalApi.supportTicketMessagesOlder(selectedId, {
              before: oldest.id,
              limit: 50,
            })
          : await vendorApi.supportTicketMessagesOlder(selectedId, {
              before: oldest.id,
              limit: 50,
            });
      const remaining = Math.max(0, MIN_LOAD_OLDER_MS - (Date.now() - started));
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
      setOlderMessages((prev) => [...res.results.map((m) => ({ ...m, attachments: m.attachments ?? [] })), ...prev]);
      setLoadOlderExhausted(!res.has_more);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load older messages');
    } finally {
      setLoadOlderPending(false);
    }
  };

  return (
    <div id="support-tickets-hub" className={cn('w-full max-w-none', !mobileTicketChatOpen && 'space-y-6 md:space-y-8')}>
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-center',
          mobileTicketChatOpen && 'max-lg:hidden',
        )}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <MessageSquarePlus className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:min-h-0 max-lg:contents">
        <section className={cn('space-y-4', selectedId && 'max-lg:hidden')}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Your tickets</h3>
            {selectedId ? (
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="w-4 h-4" />
                List
              </Button>
            ) : null}
          </div>
          {listLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-card">
              {(tickets as Record<string, unknown>[]).map((t) => {
                const id = String(t.id);
                const active = id === selectedId;
                const unread = Boolean(t.has_unread);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full text-left px-4 py-3 text-sm transition-colors',
                        active ? 'bg-primary/10' : 'hover:bg-muted/50',
                      )}
                      onClick={() => setSelectedId(id)}
                    >
                      <p className={cn(unread ? 'font-bold' : 'font-medium')}>{String(t.subject)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{id}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{statusLabel(String(t.status))}</span>
                        <span>·</span>
                        <span>{String(t.last_activity ?? t.created)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!selectedId ? (
            <section className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Open a ticket</h3>
              <div className="space-y-2">
                <Label htmlFor="hub-subject">Subject</Label>
                <Input
                  ref={subjectInputRef}
                  id="hub-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showPriorityOnCreate ? (
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_PRIORITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="hub-desc">Description</Label>
                <Textarea
                  id="hub-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your issue…"
                  className="min-h-[120px] resize-y"
                />
              </div>
              <Button
                type="button"
                disabled={!subject.trim() || !description.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit ticket'
                )}
              </Button>
            </section>
          ) : null}
        </section>

        <section
          className={cn(
            'flex min-h-0 flex-col',
            selectedId &&
              !mobileUx &&
              'max-lg:fixed max-lg:inset-0 max-lg:z-[10050] max-lg:flex max-lg:flex-col max-lg:space-y-3 max-lg:bg-background max-lg:p-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:pt-[max(0.75rem,env(safe-area-inset-top))]',
            selectedId &&
              mobileUx &&
              'max-lg:fixed max-lg:left-0 max-lg:right-0 max-lg:z-[10050] max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:bg-background max-lg:p-0',
          )}
          style={mobileTicketChatStyle}
        >
          {selectedId ? (
            <>
              <div
                className={cn(
                  'relative shrink-0',
                  mobileUx
                    ? 'px-3 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))]'
                    : 'space-y-1 rounded-xl border border-border bg-card p-4',
                )}
              >
                {mobileUx ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -top-1 left-2 z-20 h-10 w-10 rounded-full border border-border bg-card shadow-md touch-manipulation"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to tickets"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                ) : null}
                <div
                  className={cn(
                    'flex items-start justify-between gap-2',
                    mobileUx && 'mt-8 rounded-xl border border-border bg-card p-3 shadow-sm',
                  )}
                >
                  {!mobileUx ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="max-lg:flex lg:hidden shrink-0 -ml-2 gap-1 h-9 px-2 touch-manipulation"
                      onClick={() => setSelectedId(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  ) : null}
                  <div className={cn('min-w-0 flex-1', mobileUx && 'pl-0.5')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{detail?.subject ?? '…'}</h3>
                      {detail && (
                        <>
                          {detail.counterpart_online ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                              Online
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Offline
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{selectedId}</p>
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
                        {detail ? statusLabel(detail.status) : '…'}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">{detail?.category ?? ''}</span>
                    </div>
                  </div>
                  <Popover open={ticketSwitcherOpen} onOpenChange={setTicketSwitcherOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1 h-9 border-primary/25 bg-primary/5 hover:bg-primary/10"
                      >
                        Open ticket
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                      <div className="border-b border-border px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">Switch conversation</p>
                      </div>
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {(tickets as Record<string, unknown>[]).map((t) => {
                          const id = String(t.id);
                          const active = id === selectedId;
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                className={cn(
                                  'w-full text-left px-3 py-2.5 text-sm transition-colors',
                                  active ? 'bg-primary/10' : 'hover:bg-muted/60',
                                )}
                                onClick={() => {
                                  setSelectedId(id);
                                  setTicketSwitcherOpen(false);
                                }}
                              >
                                <p className="font-medium truncate">{String(t.subject)}</p>
                                <p className="text-[11px] font-mono text-muted-foreground">{id}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                                  {statusLabel(String(t.status))}
                                  <span className="mx-1">·</span>
                                  {String(t.last_activity ?? t.created)}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  mobileUx ? 'min-h-0 px-2 pb-1' : 'max-lg:min-h-[50vh]',
                )}
              >
                <SupportTicketChatPanel
                  ref={chatRef}
                  messages={mergedMessages}
                  isLoading={detailQuery.isLoading}
                  onSend={async (body, files) => {
                    if (!selectedId) return;
                    await sendMut.mutateAsync({ body, files });
                  }}
                  sendPending={sendMut.isPending}
                  sendError={sendMut.isError}
                  viewerRole="user"
                  showLoadOlder={mergedMessages.length > 0 && !loadOlderExhausted}
                  loadOlderPending={loadOlderPending}
                  onLoadOlder={loadOlder}
                  messengerMobile={mobileTicketChatOpen}
                />
              </div>
            </>
          ) : (
            <div className="h-full min-h-[280px] rounded-xl border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Select a ticket to view the conversation, or create a new one.
            </div>
          )}
        </section>
      </div>
    </div>
  );
});

export default SupportTicketsHub;
