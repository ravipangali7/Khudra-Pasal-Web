import { useRef, useState, type CSSProperties } from 'react';
import { Camera, ImagePlus, Images, Loader2, Paperclip, Send, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MOBILE_MEDIA_ACCEPT = 'image/*,video/*';
const DESKTOP_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type PendingAttachmentTileProps = {
  file: File;
  onRemove: () => void;
};

type SupportTicketChatComposerProps = {
  mobileUx: boolean;
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
  /** Lifts the composer above the on-screen keyboard (mobile). */
  keyboardInset?: number;
};

export function SupportTicketChatComposer({
  mobileUx,
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
  keyboardInset = 0,
}: SupportTicketChatComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoCaptureInputRef = useRef<HTMLInputElement | null>(null);

  const pickAndClose = (list: FileList | null) => {
    onPickFiles(list);
    setAttachOpen(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (videoCaptureInputRef.current) videoCaptureInputRef.current.value = '';
  };

  const canSend = !disabledComposer && !sendPending && (draft.trim().length > 0 || pendingFiles.length > 0);

  const scrollComposerIntoView = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };

  const composerShellStyle: CSSProperties =
    keyboardInset > 0
      ? {
          transform: `translateY(-${keyboardInset}px)`,
          transition: 'transform 0.15s ease-out',
        }
      : { transition: 'transform 0.15s ease-out' };

  return (
    <div
      className={cn(
        'border-t border-border bg-background/95 shrink-0',
        mobileUx ? 'p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'p-3 space-y-2',
      )}
      style={composerShellStyle}
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
        accept={mobileUx ? MOBILE_MEDIA_ACCEPT : DESKTOP_FILE_ACCEPT}
        onChange={(e) => onPickFiles(e.target.files)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        multiple
        className="hidden"
        accept={MOBILE_MEDIA_ACCEPT}
        onChange={(e) => pickAndClose(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => pickAndClose(e.target.files)}
      />
      <input
        ref={videoCaptureInputRef}
        type="file"
        className="hidden"
        accept="video/*"
        capture="environment"
        onChange={(e) => pickAndClose(e.target.files)}
      />

      {pendingFiles.length > 0 ? (
        <div className="flex gap-2.5 px-1 pb-2 max-h-[7.5rem] overflow-x-auto overflow-y-hidden">
          {pendingFiles.map((f, i) => (
            <PendingTile key={`${f.name}-${i}-${f.size}-${f.lastModified}`} file={f} onRemove={() => onRemovePending(i)} />
          ))}
        </div>
      ) : null}

      {mobileUx ? (
        <div className="flex items-end gap-2">
          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-11 w-11 rounded-full"
                disabled={Boolean(disabledComposer) || sendPending}
                aria-label="Attach photo or video"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start" side="top">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Images className="w-4 h-4 shrink-0" />
                Photos &amp; videos
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 shrink-0" />
                Camera
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                onClick={() => videoCaptureInputRef.current?.click()}
              >
                <Video className="w-4 h-4 shrink-0" />
                Record video
              </button>
            </PopoverContent>
          </Popover>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={scrollComposerIntoView}
            placeholder={placeholder}
            rows={1}
            disabled={Boolean(disabledComposer) || sendPending}
            className="min-h-[2.75rem] max-h-28 flex-1 resize-none rounded-3xl px-4 py-2.5 border border-input bg-muted/40 shadow-none focus-visible:ring-1"
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0 h-11 w-11 rounded-full"
            disabled={!canSend}
            onClick={onSubmit}
            aria-label="Send message"
          >
            {sendPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 items-stretch">
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
                  'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                  'resize-y min-h-[4.5rem] flex-1 px-3 py-2.5 rounded-lg',
                )}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={!canSend} onClick={onSubmit}>
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
        </>
      )}
    </div>
  );
}
