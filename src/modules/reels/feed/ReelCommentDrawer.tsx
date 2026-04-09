import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';
import { isStorefrontCustomerSession, websiteApi } from '@/lib/api';
import { toast } from 'sonner';
import EmojiPickerOverlay from './EmojiPickerOverlay';

type ReelCommentRow = {
  id: number;
  body: string;
  user_name: string;
  created_at: string;
  parent: number | null;
};

type Props = {
  reelId: number | null;
  open: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ReelCommentDrawer: React.FC<Props> = ({ reelId, open, onClose, onCommentAdded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState('');
  const [optimisticRows, setOptimisticRows] = useState<ReelCommentRow[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const nextTempIdRef = useRef(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasSession = isStorefrontCustomerSession();

  const commentsQuery = useQuery({
    queryKey: ['reel-comments', reelId],
    queryFn: () => websiteApi.reelComments(reelId as number),
    enabled: open && reelId != null,
  });

  useEffect(() => {
    setOptimisticRows([]);
    setDraft('');
    setShowEmojiPicker(false);
  }, [reelId, open]);

  const comments = useMemo(() => {
    const serverRows = commentsQuery.data?.results ?? [];
    const seen = new Set<number>();
    const merged: ReelCommentRow[] = [];
    for (const row of [...optimisticRows, ...serverRows]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    return merged;
  }, [commentsQuery.data?.results, optimisticRows]);

  const addMut = useMutation({
    mutationFn: ({ body }: { body: string; tempId: number }) => websiteApi.addReelComment(reelId as number, body),
    onSuccess: (row, vars) => {
      setOptimisticRows((prev) => prev.filter((item) => item.id !== vars.tempId));
      setOptimisticRows((prev) => (prev.some((item) => item.id === row.id) ? prev : [row, ...prev]));
      setDraft('');
      onCommentAdded?.();
    },
    onError: (error: Error, vars) => {
      setOptimisticRows((prev) => prev.filter((item) => item.id !== vars.tempId));
      toast.error(error.message || 'Could not add comment');
    },
  });

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => `${prev}${emoji}`);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const nextValue = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(nextValue);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      const nextPos = start + emoji.length;
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const goToLogin = () => {
    const nextPath = `${location.pathname}${location.search}`;
    navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
  };

  if (!open || reelId == null) return null;

  const composerSafePadding = { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' as const };

  return (
    <div className="fixed inset-0 z-[10050]">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close comments" />

      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[min(92dvh,100%)] flex-col rounded-t-2xl border-t border-white/10 bg-zinc-950 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-[420px] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reel-comments-title"
      >
        <div className="flex shrink-0 flex-col items-center pt-2 sm:pt-0">
          <div className="mb-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" aria-hidden />
          <div className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 sm:py-4">
            <div className="min-w-0">
              <h3 id="reel-comments-title" className="text-base font-semibold text-white">
                Comments
              </h3>
              <p className="text-xs text-white/45">{comments.length} comment{comments.length === 1 ? '' : 's'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {commentsQuery.isLoading && <p className="py-6 text-center text-sm text-white/50">Loading comments…</p>}
          {commentsQuery.isError && (
            <p className="py-6 text-center text-sm text-amber-200/90">Could not load comments. Try signing in or refresh.</p>
          )}
          {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
            <p className="py-10 text-center text-sm text-white/50">No comments yet. Start the conversation.</p>
          )}
          <ul className="divide-y divide-white/[0.06]">
            {comments.map((comment) => {
              const name = comment.user_name || 'User';
              return (
                <li key={`${comment.id}-${comment.created_at}`} className="flex gap-3 py-3.5 first:pt-2">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/90 to-rose-600/85 text-xs font-bold text-white shadow-inner"
                    aria-hidden
                  >
                    {initialsFromName(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-white">{name}</span>
                      <span className="text-xs text-white/40">{formatCommentTime(comment.created_at)}</span>
                    </div>
                    <p className="mt-1 break-words text-[15px] leading-snug text-white/90 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {hasSession ? (
          <form
            className="shrink-0 border-t border-white/10 bg-zinc-950 px-3 pt-3"
            style={composerSafePadding}
            onSubmit={(e) => {
              e.preventDefault();
              const body = draft.trim();
              if (!body || addMut.isPending) return;
              const tempId = nextTempIdRef.current;
              nextTempIdRef.current -= 1;
              setOptimisticRows((prev) => [
                {
                  id: tempId,
                  body,
                  user_name: 'You',
                  created_at: new Date().toISOString(),
                  parent: null,
                },
                ...prev,
              ]);
              addMut.mutate({ body, tempId });
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg text-white transition-colors hover:bg-white/15"
                aria-label="Pick emoji"
                title="Pick emoji"
              >
                🙂
              </button>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={1}
                className="min-h-[44px] max-h-24 flex-1 resize-none rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                placeholder="Add comment…"
              />
              <button
                type="submit"
                disabled={addMut.isPending || !draft.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--reels-accent,#f59e0b)] text-white shadow-md disabled:opacity-45"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <div className="shrink-0 space-y-3 border-t border-white/10 px-4 pt-4" style={composerSafePadding}>
            <p className="text-center text-xs text-white/65">Sign in to post a comment.</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full rounded-full py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--reels-accent)' }}
            >
              Sign in
            </button>
          </div>
        )}
      </div>

      <EmojiPickerOverlay open={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelectEmoji={handleInsertEmoji} />
    </div>
  );
};

export default ReelCommentDrawer;
