import { toast } from 'sonner';
import {
  SUPPORT_CHAT_MAX_ATTACHMENT_BYTES,
  SUPPORT_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
} from './supportChatConstants';

export function pendingFileKind(file: File): 'image' | 'video' | 'pdf' | 'doc' {
  const t = (file.type || '').toLowerCase();
  const n = file.name.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return 'doc';
}

export function formatSupportFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Merge picked files into the composer queue with size/count limits. */
export function mergePickedSupportFiles(prev: File[], incoming: File[]): File[] {
  const next = [...prev];
  let skippedSize = 0;
  let skippedEmpty = 0;
  let hitCap = false;

  for (const f of incoming) {
    if (next.length >= SUPPORT_CHAT_MAX_ATTACHMENTS_PER_MESSAGE) {
      hitCap = true;
      break;
    }
    if (f.size <= 0) {
      skippedEmpty += 1;
      continue;
    }
    if (f.size > SUPPORT_CHAT_MAX_ATTACHMENT_BYTES) {
      skippedSize += 1;
      continue;
    }
    next.push(f);
  }

  if (hitCap) {
    toast.error(`You can attach up to ${SUPPORT_CHAT_MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
  }
  if (skippedSize > 0) {
    toast.error(
      skippedSize === 1
        ? `One file exceeds the ${formatSupportFileSize(SUPPORT_CHAT_MAX_ATTACHMENT_BYTES)} limit.`
        : `${skippedSize} files exceed the ${formatSupportFileSize(SUPPORT_CHAT_MAX_ATTACHMENT_BYTES)} limit.`,
    );
  }
  if (skippedEmpty > 0) {
    toast.error(skippedEmpty === 1 ? 'That file is empty.' : 'Some selected files are empty.');
  }

  return next;
}
