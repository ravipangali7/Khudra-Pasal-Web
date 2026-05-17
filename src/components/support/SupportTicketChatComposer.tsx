import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import SupportChatAttachTray from './SupportChatAttachTray';
import { PendingAttachmentStrip } from './PendingAttachmentStrip';
import { SUPPORT_CHAT_DESKTOP_ACCEPT } from './supportChatConstants';

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
    scrollComposerIntoView();
  };

  const inputShellClass = cn(
    'flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-input bg-muted/40 shadow-none transition-shadow',
    dragOver && !mobileUx && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background',
  );

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
          Message failed to send. Your draft and attachments were restored — try again.
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={SUPPORT_CHAT_DESKTOP_ACCEPT}
        onChange={(e) => {
          handlePickFiles(e.target.files);
          e.target.value = '';
        }}
      />

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
          <div className={inputShellClass}>
            <PendingAttachmentStrip
              files={pendingFiles}
              onRemove={onRemovePending}
              compact
            />
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={scrollComposerIntoView}
              placeholder={pendingFiles.length > 0 ? 'Add a caption…' : placeholder}
              rows={1}
              disabled={Boolean(disabledComposer) || sendPending}
              className="max-h-28 min-h-[2.75rem] resize-none rounded-none border-0 bg-transparent px-4 py-2.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
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
            <div className={cn(inputShellClass, 'rounded-lg')}>
              <PendingAttachmentStrip files={pendingFiles} onRemove={onRemovePending} />
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={scrollComposerIntoView}
                placeholder={pendingFiles.length > 0 ? 'Add a caption…' : placeholder}
                rows={3}
                disabled={Boolean(disabledComposer) || sendPending}
                className="min-h-[4.5rem] flex-1 resize-y rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
