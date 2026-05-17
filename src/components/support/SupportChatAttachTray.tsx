import { Camera, FileText, FileUp, Images, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SUPPORT_CHAT_DOCUMENT_ACCEPT,
  SUPPORT_CHAT_GALLERY_ACCEPT,
  SUPPORT_CHAT_PDF_ACCEPT,
} from './supportChatConstants';

type SupportChatAttachTrayProps = {
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  className?: string;
};

function pickFiles(onFiles: (files: FileList | null) => void, list: FileList | null, input: HTMLInputElement) {
  onFiles(list);
  input.value = '';
}

function AttachOption({
  icon: Icon,
  label,
  accept,
  multiple,
  capture,
  disabled,
  onFiles,
}: {
  icon: typeof Images;
  label: string;
  accept: string;
  multiple?: boolean;
  capture?: boolean | 'environment' | 'user';
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={cn(
        'flex min-h-[4.25rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-2 py-3 text-center text-xs font-medium text-foreground transition-colors touch-manipulation',
        disabled ? 'pointer-events-none opacity-50' : 'hover:bg-muted/60 active:bg-muted',
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <span className="leading-tight">{label}</span>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        capture={capture}
        onChange={(e) => pickFiles(onFiles, e.target.files, e.currentTarget)}
      />
    </label>
  );
}

/** Label-based attach menu (reliable on iOS/Android; avoids Radix popover blocking file pickers). */
export default function SupportChatAttachTray({ disabled, onFiles, className }: SupportChatAttachTrayProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg',
        className,
      )}
      role="group"
      aria-label="Attach files"
    >
      <AttachOption
        icon={Images}
        label="Photos & videos"
        accept={SUPPORT_CHAT_GALLERY_ACCEPT}
        multiple
        disabled={disabled}
        onFiles={onFiles}
      />
      <AttachOption
        icon={Camera}
        label="Camera"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onFiles={onFiles}
      />
      <AttachOption
        icon={Video}
        label="Record video"
        accept="video/*"
        capture="environment"
        disabled={disabled}
        onFiles={onFiles}
      />
      <AttachOption
        icon={FileText}
        label="PDF"
        accept={SUPPORT_CHAT_PDF_ACCEPT}
        disabled={disabled}
        onFiles={onFiles}
      />
      <AttachOption
        icon={FileUp}
        label="Document"
        accept={SUPPORT_CHAT_DOCUMENT_ACCEPT}
        disabled={disabled}
        onFiles={onFiles}
      />
    </div>
  );
}
