import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import SupportChatAttachTray from './SupportChatAttachTray';
import { SUPPORT_CHAT_DESKTOP_ACCEPT } from './supportChatConstants';

export type PendingAttachmentTileProps = {
  file: File;
  onRemove: () => void;
};

type SupportTicketChatComposerProps = {
  mobileUx: boolean;
  /** When true, composer is pinned to the bottom of a visual-viewport-sized shell (no transform lift). */
  composerDocked?: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  pendingFiles: File[];
  onPickFiles: (list: FileList | null) => void;
  onRemovePending: (index: number) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  sendPending: boolean;
  sendError?: boolean;
  disabledComposer?: boolean;
  placeholder?: string;
  dragOver?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  PendingTile: React.ComponentType<PendingAttachmentTileProps>;
};

export function SupportTicketChatComposer({
  mobileUx,
  composerDocked = false,
  draft,
  onDraftChange,
  pendingFiles,
  onPickFiles,
  onRemovePending,
  onSubmit,
  onKeyDown,
  sendPending,
  sendError,
  disabledComposer,
  placeholder = 'Type a message…',
  dragOver,
  textareaRef,
  PendingTile,
}: SupportTicketChatComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = !disabledComposer && !sendPending && (draft.trim().length > 0 || pendingFiles.length > 0);

  const scrollComposerIntoView = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  };

  const handlePickFiles = (list: FileList | null) => {
    onPickFiles(list);
    setAttachOpen(false);
  };

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        mobileUx ? 'px-2 pt-2' : 'space-y-2 p-3',
        composerDocked
          ? 'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
          : mobileUx
            ? 'pb-[max(0.5rem,env(safe-area-inset-bottom))]'
            : undefined,
      )}
    >
      {sendPending ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2 px-1 pb-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Sending…
        </p>
      ) : null}
      {sendError ? (
        <p className="text-xs text-destructive px-1 pb-1">
          Message failed to send. Fix the issue and try again.
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={SUPPORT_CHAT_DESKTOP_ACCEPT}
        onChange={(e) => {
          onPickFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {pendingFiles.length > 0 ? (
        <div className="mb-2 flex max-h-[7.5rem] gap-2.5 overflow-x-auto overflow-y-hidden px-0.5">
          {pendingFiles.map((f, i) => (
            <PendingTile key={`${f.name}-${i}-${f.size}-${f.lastModified}`} file={f} onRemove={() => onRemovePending(i)} />
          ))}
        </div>
      ) : null}

      {mobileUx && attachOpen ? (
        <SupportChatAttachTray
          className="mb-2"
          disabled={Boolean(disabledComposer) || sendPending}
          onFiles={handlePickFiles}
        />
      ) : null}

      {mobileUx ? (
        <div className="flex items-end gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-11 w-11 shrink-0 touch-manipulation rounded-full',
              attachOpen && 'bg-muted text-foreground',
            )}
            disabled={Boolean(disabledComposer) || sendPending}
            aria-label={attachOpen ? 'Hide attachments' : 'Attach file'}
            aria-expanded={attachOpen}
            onClick={() => setAttachOpen((v) => !v)}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={scrollComposerIntoView}
            placeholder={placeholder}
            rows={1}
            disabled={Boolean(disabledComposer) || sendPending}
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-3xl border border-input bg-muted/40 px-4 py-2.5 shadow-none focus-visible:ring-1"
          />
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 touch-manipulation rounded-full"
            disabled={!canSend}
            onClick={onSubmit}
            aria-label="Send message"
          >
            {sendPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 self-end touch-manipulation"
              disabled={Boolean(disabledComposer) || sendPending}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <div
              className={cn(
                'flex min-h-[5.5rem] flex-1 flex-col rounded-lg border border-input bg-background shadow-sm transition-shadow',
                dragOver && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background',
              )}
            >
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={scrollComposerIntoView}
                placeholder={placeholder}
                rows={3}
                disabled={Boolean(disabledComposer) || sendPending}
                className={cn(
                  'min-h-[4.5rem] flex-1 resize-y rounded-lg border-0 px-3 py-2.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                )}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
          <div className="flex justify-end">
            <Button type="button" size="sm" className="touch-manipulation" disabled={!canSend} onClick={onSubmit}>
              {sendPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
