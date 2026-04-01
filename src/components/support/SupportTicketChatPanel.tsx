import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ChevronUp, FileText, ImagePlus, Loader2, Paperclip, Send, Video, X } from 'lucide-react';
import type { SupportTicketAttachmentRow, SupportTicketMessageRow } from '@/lib/api';
import { fetchAuthenticatedBlob } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ViewerRole = 'user' | 'staff';

export type SupportTicketChatPanelHandle = {
  focusComposer: () => void;
};

function senderInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase() || '?';
  }
  if (parts.length === 1 && parts[0].length) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return '?';
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function normalizeMessage(m: SupportTicketMessageRow): SupportTicketMessageRow {
  return { ...m, attachments: m.attachments ?? [] };
}

function pendingFileKind(file: File): 'image' | 'video' | 'pdf' | 'doc' {
  const t = (file.type || '').toLowerCase();
  const n = file.name.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return 'doc';
}

function useFileObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function PendingAttachmentTile({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const kind = pendingFileKind(file);
  const previewUrl = useFileObjectUrl(kind === 'image' ? file : null);
  const shortName =
    file.name.length > 16 ? `${file.name.slice(0, 14)}…` : file.name;

  return (
    <div className="relative group shrink-0 w-[5.5rem]">
      <div
        className={cn(
          'rounded-lg border border-border bg-muted/50 overflow-hidden aspect-square flex flex-col',
          'shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        )}
      >
        {kind === 'image' && previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : kind === 'image' ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : kind === 'video' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-muted">
            <Video className="w-7 h-7 text-muted-foreground" />
          </div>
        ) : kind === 'pdf' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-amber-500/10">
            <FileText className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 bg-muted">
            <Paperclip className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full',
          'bg-destructive text-destructive-foreground shadow-md',
          'opacity-90 hover:opacity-100 transition-opacity',
          'ring-2 ring-background',
        )}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p
        className="mt-1 text-[10px] text-muted-foreground text-center truncate px-0.5 max-w-[5.5rem] leading-tight"
        title={file.name}
      >
        {shortName}
      </p>
    </div>
  );
}

function ChatAttachment({
  att,
  mine,
}: {
  att: SupportTicketAttachmentRow;
  mine: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const path = att.url.startsWith('/') ? att.url : `/${att.url}`;
    (async () => {
      try {
        const blob = await fetchAuthenticatedBlob(path);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [att.url]);

  if (err) {
    return (
      <p className="text-xs opacity-80 mt-1">
        Could not load {att.filename}
      </p>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        {att.filename}
      </div>
    );
  }

  if (att.kind === 'image') {
    return (
      <a
        href={blobUrl}
        target="_blank"
        rel="noreferrer"
        className="block mt-2 rounded-lg overflow-hidden border border-border/60 max-w-[min(100%,280px)]"
      >
        <img src={blobUrl} alt={att.filename} className="w-full h-auto max-h-48 object-contain bg-muted/40" />
      </a>
    );
  }

  if (att.kind === 'video') {
    return (
      <video
        src={blobUrl}
        controls
        className="mt-2 max-w-[min(100%,320px)] max-h-56 rounded-lg border border-border/60 bg-black/80"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <a
      href={blobUrl}
      download={att.filename}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-2 mt-2 text-xs font-medium underline underline-offset-2',
        mine ? 'text-primary-foreground/90' : 'text-primary',
      )}
    >
      <Paperclip className="w-3.5 h-3.5 shrink-0" />
      {att.filename}
    </a>
  );
}

export type SupportTicketChatPanelProps = {
  messages: SupportTicketMessageRow[];
  isLoading: boolean;
  onSend: (body: string, files: File[]) => void;
  sendPending: boolean;
  sendError?: boolean;
  viewerRole: ViewerRole;
  disabledComposer?: boolean;
  placeholder?: string;
  onLoadOlder?: () => void;
  loadOlderPending?: boolean;
  showLoadOlder?: boolean;
};

const SupportTicketChatPanel = forwardRef<SupportTicketChatPanelHandle, SupportTicketChatPanelProps>(
  function SupportTicketChatPanel(
    {
      messages,
      isLoading,
      onSend,
      sendPending,
      sendError,
      viewerRole,
      disabledComposer,
      placeholder = 'Type a message…',
      onLoadOlder,
      loadOlderPending,
      showLoadOlder,
    },
    ref,
  ) {
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focusComposer: () => {
      textareaRef.current?.focus();
    },
  }));

  const normalized = messages.map(normalizeMessage);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 96;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (nearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [normalized.length, isLoading, sendPending]);

  const isMine = (m: SupportTicketMessageRow) =>
    viewerRole === 'staff' ? m.sender_role_kind === 'staff' : m.sender_role_kind === 'user';

  const displaySender = (m: SupportTicketMessageRow, mine: boolean) => {
    if (mine) return viewerRole === 'staff' ? 'You (support)' : 'You';
    if (m.sender_role_kind === 'staff') return m.sender_name || 'Support';
    return m.sender_name || 'User';
  };

  const submit = () => {
    const t = draft.trim();
    if ((!t && pendingFiles.length === 0) || sendPending) return;
    onSend(t, [...pendingFiles]);
    setDraft('');
    setPendingFiles([]);
    nearBottomRef.current = true;
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setPendingFiles((prev) => [...prev, ...Array.from(list)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col border border-border rounded-xl bg-card min-h-[320px] max-h-[min(70vh,640px)] h-[min(70vh,640px)]',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onPickFiles(e.dataTransfer.files);
      }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3"
      >
        {showLoadOlder && onLoadOlder ? (
          <div className="flex justify-center pb-3 pt-1 min-h-[2.5rem] items-center">
            <button
              type="button"
              disabled={Boolean(loadOlderPending)}
              onClick={() => onLoadOlder()}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                'disabled:pointer-events-none transition-colors',
              )}
              aria-label={loadOlderPending ? 'Loading older messages' : 'Load older messages'}
            >
              {loadOlderPending ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              ) : (
                <ChevronUp className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading conversation…
          </div>
        ) : normalized.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
        ) : (
          <ul className="space-y-3 pr-1">
            {normalized.map((m) => {
              const mine = isMine(m);
              const avatarSrc = (m.sender_avatar_url || '').trim();
              const bubble = (
                <div
                  className={cn(
                    'max-w-[min(100%,28rem)] rounded-2xl px-3 py-2 text-sm shadow-sm',
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md',
                  )}
                >
                  <p
                    className={cn(
                      'text-[11px] mb-0.5 font-medium',
                      mine ? 'opacity-90' : 'opacity-90 font-semibold',
                    )}
                  >
                    {displaySender(m, mine)}
                  </p>
                  {m.body ? (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  ) : null}
                  {m.attachments.map((att) => (
                    <ChatAttachment key={att.id} att={att} mine={mine} />
                  ))}
                  <p
                    className={cn(
                      'text-[10px] mt-1 opacity-70',
                      mine ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {formatWhen(m.created_at)}
                  </p>
                </div>
              );
              return (
                <li
                  key={m.id}
                  className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}
                >
                  {mine ? (
                    bubble
                  ) : (
                    <div className="flex items-end gap-2 max-w-[min(100%,32rem)]">
                      <Avatar className="h-9 w-9 shrink-0 border border-border bg-background">
                        {avatarSrc ? (
                          <AvatarImage src={avatarSrc} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-medium bg-muted">
                          {senderInitials(displaySender(m, false))}
                        </AvatarFallback>
                      </Avatar>
                      {bubble}
                    </div>
                  )}
                </li>
              );
            })}
            <div ref={endRef} />
          </ul>
        )}
      </div>
      <div className="border-t border-border p-3 bg-background/80 shrink-0 space-y-2">
        {sendPending ? (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Sending…
          </p>
        ) : null}
        {sendError ? (
          <p className="text-xs text-destructive">Message failed to send. Fix the issue and try again.</p>
        ) : null}
        <div className="flex gap-2 items-stretch">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 self-end h-10 w-10"
            disabled={Boolean(disabledComposer) || sendPending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach files"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <div
            className={cn(
              'flex-1 flex flex-col min-h-[5.5rem] rounded-lg border border-input bg-background',
              'shadow-sm transition-shadow',
              dragOver && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background',
            )}
          >
            {pendingFiles.length > 0 ? (
              <div className="flex gap-2.5 px-2.5 pt-2.5 pb-2 border-b border-border/70 bg-muted/25 max-h-[9.5rem] overflow-y-auto overflow-x-hidden">
                <div className="flex flex-wrap gap-3 content-start">
                  {pendingFiles.map((f, i) => (
                    <PendingAttachmentTile
                      key={`${f.name}-${i}-${f.size}-${f.lastModified}`}
                      file={f}
                      onRemove={() =>
                        setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={3}
              disabled={Boolean(disabledComposer) || sendPending}
              className={cn(
                'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                'resize-y min-h-[4.5rem] flex-1 px-3 py-2.5',
                pendingFiles.length === 0 ? 'rounded-lg' : 'rounded-none rounded-b-lg',
              )}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={
              Boolean(disabledComposer) ||
              sendPending ||
              (!draft.trim() && pendingFiles.length === 0)
            }
            onClick={submit}
          >
            {sendPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
  },
);

export default SupportTicketChatPanel;
