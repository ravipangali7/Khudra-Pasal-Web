import { useEffect, useState } from 'react';
import { FileText, Loader2, Paperclip, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pendingFileKind } from './supportChatFiles';

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

export type PendingAttachmentTileProps = {
  file: File;
  onRemove: () => void;
  /** Compact tiles for the inline composer bar. */
  compact?: boolean;
};

export function PendingAttachmentTile({ file, onRemove, compact }: PendingAttachmentTileProps) {
  const kind = pendingFileKind(file);
  const previewUrl = useFileObjectUrl(kind === 'image' || kind === 'video' ? file : null);
  const shortName = file.name.length > 16 ? `${file.name.slice(0, 14)}…` : file.name;
  const tileClass = compact ? 'w-[4.25rem]' : 'w-[5.5rem]';

  return (
    <div className={cn('relative shrink-0 group', tileClass)}>
      <div
        className={cn(
          'rounded-lg border border-border bg-muted/50 overflow-hidden aspect-square flex flex-col',
          'shadow-sm ring-1 ring-black/5 dark:ring-white/10',
        )}
      >
        {kind === 'image' && previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : kind === 'image' ? (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : kind === 'video' && previewUrl ? (
          <video
            src={previewUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : kind === 'video' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-1">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : kind === 'pdf' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-amber-500/10 p-1">
            <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-1">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
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
          'ring-2 ring-background touch-manipulation',
        )}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {!compact ? (
        <p
          className="mt-1 max-w-[5.5rem] truncate px-0.5 text-center text-[10px] leading-tight text-muted-foreground"
          title={file.name}
        >
          {shortName}
        </p>
      ) : null}
    </div>
  );
}

type PendingAttachmentStripProps = {
  files: File[];
  onRemove: (index: number) => void;
  compact?: boolean;
  className?: string;
};

export function PendingAttachmentStrip({ files, onRemove, compact, className }: PendingAttachmentStripProps) {
  if (files.length === 0) return null;

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain',
        compact ? 'max-h-[4.5rem] px-2 pt-2 pb-1' : 'mb-2 max-h-[7.5rem] gap-2.5 px-0.5',
        className,
      )}
    >
      {files.map((f, i) => (
        <PendingAttachmentTile
          key={`${f.name}-${i}-${f.size}-${f.lastModified}`}
          file={f}
          compact={compact}
          onRemove={() => onRemove(i)}
        />
      ))}
    </div>
  );
}
