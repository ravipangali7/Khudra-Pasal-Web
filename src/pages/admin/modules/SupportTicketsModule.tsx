import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, extractResults, type SupportTicketAdminDetail, type SupportTicketMessageRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SupportTicketChatPanel, { type SupportTicketChatPanelHandle } from '@/components/support/SupportTicketChatPanel';
import { cn } from '@/lib/utils';
import {
  SOURCE_PANEL_FILTER_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from '@/components/support/supportConstants';
import { toast } from 'sonner';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function submitterInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || '?';
  }
  if (parts.length === 1 && parts[0].length) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '?';
}

export default function SupportTicketsModule() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatRef = useRef<SupportTicketChatPanelHandle>(null);
  const [ticketSwitcherOpen, setTicketSwitcherOpen] = useState(false);
  const [sourcePanel, setSourcePanel] = useState('__all');
  const [statusFilter, setStatusFilter] = useState('__all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [olderMessages, setOlderMessages] = useState<SupportTicketMessageRow[]>([]);
  const [loadOlderExhausted, setLoadOlderExhausted] = useState(false);
  const [loadOlderPending, setLoadOlderPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOlderMessages([]);
    setLoadOlderExhausted(false);
  }, [selectedId]);

  const listParams = useMemo(() => {
    const p: Record<string, string> = { page_size: '50' };
    if (sourcePanel && sourcePanel !== '__all') p.source_panel = sourcePanel;
    if (statusFilter && statusFilter !== '__all') p.status = statusFilter;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [sourcePanel, statusFilter, debouncedSearch]);

  const listQuery = useQuery({
    queryKey: ['admin', 'support-tickets', listParams],
    queryFn: () => adminApi.tickets(listParams),
  });

  const tickets = useMemo(() => extractResults(listQuery.data), [listQuery.data]);

  useEffect(() => {
    const raw = (searchParams.get('ticket') || '').trim();
    if (!raw || listQuery.isLoading) return;
    const ids = new Set(
      (tickets as Record<string, unknown>[]).map((row) => String(row.id)),
    );
    if (!ids.has(raw)) return;
    setSelectedId(raw);
    const next = new URLSearchParams(searchParams);
    next.delete('ticket');
    setSearchParams(next, { replace: true });
  }, [searchParams, listQuery.isLoading, tickets, setSearchParams]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'support-tickets', 'detail', selectedId],
    queryFn: () => adminApi.ticketDetail(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: selectedId ? 12_000 : false,
  });

  const detail = detailQuery.data as SupportTicketAdminDetail | undefined;
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
    if (!selectedId || detailQuery.isLoading) return;
    const t = window.setTimeout(() => chatRef.current?.focusComposer(), 100);
    return () => window.clearTimeout(t);
  }, [selectedId, detailQuery.isLoading, detailQuery.dataUpdatedAt]);

  const loadOlder = async () => {
    if (!selectedId || mergedMessages.length === 0) return;
    const oldest = mergedMessages.reduce((a, b) => (Number(a.id) < Number(b.id) ? a : b));
    setLoadOlderPending(true);
    const started = Date.now();
    try {
      const res = await adminApi.supportTicketMessagesOlder(selectedId, {
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

  const patchMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminApi.patchTicket(selectedId!, payload),
    onSuccess: () => {
      toast.success('Ticket updated');
      void qc.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'support-tickets', 'detail', selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMut = useMutation({
    mutationFn: ({ body, files }: { body: string; files: File[] }) =>
      adminApi.postTicketMessage(selectedId!, { body, files }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'support-tickets', 'detail', selectedId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'support-tickets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Support tickets</h1>
        <p className="text-sm text-muted-foreground">All panels · filter, open a thread, reply and set status.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs">Panel</Label>
          <Select value={sourcePanel} onValueChange={setSourcePanel}>
            <SelectTrigger>
              <SelectValue placeholder="All panels" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_PANEL_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              {TICKET_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px] max-w-sm">
          <Label className="text-xs">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Subject or ticket #"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 xl:min-h-0">
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[min(70vh,560px)] max-h-[min(85vh,720px)]">
          {listQuery.isLoading ? (
            <div className="p-8 flex justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : (tickets as Record<string, unknown>[]).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No tickets match.</div>
          ) : (
            <ul className="overflow-y-auto divide-y divide-border">
              {(tickets as Record<string, unknown>[]).map((row) => {
                const id = String(row.id);
                const active = id === selectedId;
                const unread = Boolean(row.has_unread);
                const preview = String(row.last_message_preview ?? '').trim();
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full text-left px-3 py-3 flex gap-3 transition-colors hover:bg-muted/50',
                        active && 'bg-primary/8',
                      )}
                      onClick={() => setSelectedId(id)}
                    >
                      <Avatar className="h-11 w-11 shrink-0 border border-border/80">
                        <AvatarImage src={String(row.submitter_avatar_url ?? '')} alt="" />
                        <AvatarFallback className="text-xs font-medium">
                          {submitterInitials(String(row.submitter_name ?? ''))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm truncate',
                              unread ? 'font-bold text-foreground' : 'font-semibold text-foreground',
                            )}
                          >
                            {String(row.submitter_name ?? '—')}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                            {String(row.last_activity ?? '')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{String(row.source_panel ?? '')}</p>
                        <p className={cn('text-sm truncate mt-0.5', unread ? 'font-semibold' : 'font-normal')}>
                          {String(row.subject ?? '')}
                        </p>
                        {preview ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          <span className="capitalize">{statusLabel(String(row.status ?? ''))}</span>
                          <span className="mx-1">·</span>
                          <span className="font-mono">{id}</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4 min-h-0 flex flex-col">
          {selectedId && detail ? (
            <>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg leading-tight">{detail.subject}</h2>
                      {detail.counterpart_online === true ? (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          User online
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          User offline
                        </span>
                      )}
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
                        <p className="text-xs font-medium text-muted-foreground">Switch ticket</p>
                      </div>
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {(tickets as Record<string, unknown>[]).map((row) => {
                          const id = String(row.id);
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
                                <p className="font-medium truncate">{String(row.subject)}</p>
                                <p className="text-[11px] font-mono text-muted-foreground">{id}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                                  {String(row.source_panel ?? '')}
                                  <span className="mx-1">·</span>
                                  {statusLabel(String(row.status ?? ''))}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground shrink-0">{detail.id}</p>
                  <div className="flex items-center gap-2.5 min-w-0 justify-end">
                    <span className="text-sm font-medium text-foreground truncate text-right">
                      {detail.submitter.name}
                    </span>
                    <Avatar className="h-10 w-10 shrink-0 border border-border/80">
                      <AvatarImage
                        src={detail.submitter.avatar_url ?? ''}
                        alt=""
                      />
                      <AvatarFallback className="text-xs font-medium">
                        {submitterInitials(detail.submitter.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {detail.submitter.phone} · {detail.submitter.role}
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1 min-w-[160px]">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={detail.status}
                      onValueChange={(v) => patchMut.mutate({ status: v })}
                      disabled={patchMut.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-[140px]">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={detail.priority}
                      onValueChange={(v) => patchMut.mutate({ priority: v })}
                      disabled={patchMut.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <SupportTicketChatPanel
                  ref={chatRef}
                  messages={mergedMessages}
                  isLoading={detailQuery.isLoading}
                  onSend={(body, files) => sendMut.mutate({ body, files })}
                  sendPending={sendMut.isPending}
                  sendError={sendMut.isError}
                  viewerRole="staff"
                  showLoadOlder={mergedMessages.length > 0 && !loadOlderExhausted}
                  loadOlderPending={loadOlderPending}
                  onLoadOlder={loadOlder}
                />
              </div>
            </>
          ) : selectedId && detailQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading ticket…
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border min-h-[320px] flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Select a ticket from the list.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
