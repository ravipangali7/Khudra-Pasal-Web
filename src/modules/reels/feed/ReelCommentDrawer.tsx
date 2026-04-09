import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

/** Oldest first, newest near composer; temp ids tie-break (more negative = newer). */
function compareCommentsChronological(a: ReelCommentRow, b: ReelCommentRow): number {
  const ta = new Date(a.created_at).getTime();
  const tb = new Date(b.created_at).getTime();
  if (ta !== tb) return ta - tb;
  if (a.id < 0 && b.id < 0) return b.id - a.id;
  return a.id - b.id;
}

const ReelCommentDrawer: React.FC<Props> = ({ reelId, open, onClose, onCommentAdded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState('');
  const [optimisticRows, setOptimisticRows] = useState<ReelCommentRow[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSmUp, setIsSmUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  );
  const nextTempIdRef = useRef(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const hasSession = isStorefrontCustomerSession();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalEl(document.body);
  }, []);

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

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setIsSmUp(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      setKeyboardInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      if (window.matchMedia('(min-width: 640px)').matches) {
        setKeyboardInset(0);
        return;
      }
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKeyboardInset(overlap > 12 ? overlap : 0);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      setKeyboardInset(0);
    };
  }, [open]);

  const comments = useMemo(() => {
    const serverRows = commentsQuery.data?.results ?? [];
    const seen = new Set<number>();
    const merged: ReelCommentRow[] = [];
    for (const row of [...optimisticRows, ...serverRows]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    merged.sort(compareCommentsChronological);
    return merged;
  }, [commentsQuery.data?.results, optimisticRows]);

  const scrollListToBottom = () => {
    const el = listScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  };

  const lastCommentKey =
    comments.length > 0
      ? `${comments[comments.length - 1].id}:${comments[comments.length - 1].created_at}`
      : '';

  useLayoutEffect(() => {
    if (!open || reelId == null) return;
    scrollListToBottom();
  }, [open, reelId, comments.length, lastCommentKey]);

  const addMut = useMutation({
    mutationFn: ({ body }: { body: string; tempId: number }) => websiteApi.addReelComment(reelId as number, body),
    onSuccess: (row, vars) => {
      setOptimisticRows((prev) => {
        const without = prev.filter((item) => item.id !== vars.tempId);
        if (without.some((item) => item.id === row.id)) return without;
        return [...without, row];
      });
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

  const composerSafePadding = { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' as const };
  const composerLiftStyle: React.CSSProperties =
    keyboardInset > 0
      ? {
          ...composerSafePadding,
          transform: `translateY(-${keyboardInset}px)`,
          transition: 'transform 0.15s ease-out',
        }
      : { ...composerSafePadding, transition: 'transform 0.15s ease-out' };

  const drawerTree =
    open && reelId != null ? (
      <motion.div
        key="reel-comments-overlay"
        className="fixed inset-0 z-[10050]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.button
          type="button"
          className="absolute inset-0 bg-black/60"
          aria-label="Close comments"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />

        <motion.div
          className="absolute bottom-0 left-0 right-0 flex h-[min(92dvh,100%)] max-h-[min(92dvh,100%)] flex-col rounded-t-2xl border-t border-white/10 bg-zinc-950 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-[420px] sm:rounded-none sm:border-l sm:border-t-0 sm:shadow-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reel-comments-title"
          initial={isSmUp ? { x: '100%', y: 0 } : { y: '100%', x: 0 }}
          animate={{ x: 0, y: 0 }}
          exit={isSmUp ? { x: '100%', y: 0 } : { y: '100%', x: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          style={{ willChange: 'transform' }}
        >
            <div className="flex shrink-0 flex-col items-center pt-2 sm:pt-0">
              <div className="mb-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" aria-hidden />
              <div className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 sm:py-4">
                <div className="min-w-0">
                  <h3 id="reel-comments-title" className="text-base font-semibold text-white">
                    Comments
                  </h3>
                  <p className="text-xs text-white/45">
                    {comments.length} comment{comments.length === 1 ? '' : 's'}
                  </p>
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

            <div ref={listScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              {commentsQuery.isLoading && (
                <p className="py-6 text-center text-sm text-white/50">Loading comments…</p>
              )}
              {commentsQuery.isError && (
                <p className="py-6 text-center text-sm text-amber-200/90">
                  Could not load comments. Try signing in or refresh.
                </p>
              )}
              {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
                <p className="py-10 text-center text-sm text-white/50">
                  No comments yet. Start the conversation.
                </p>
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
                        <p className="mt-1 break-words text-[15px] leading-snug text-white/90 whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {hasSession ? (
              <form
                className="shrink-0 border-t border-white/10 bg-zinc-950 px-3 pt-3"
                style={composerLiftStyle}
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = draft.trim();
                  if (!body || addMut.isPending) return;
                  const tempId = nextTempIdRef.current;
                  nextTempIdRef.current -= 1;
                  setOptimisticRows((prev) => [
                    ...prev,
                    {
                      id: tempId,
                      body,
                      user_name: 'You',
                      created_at: new Date().toISOString(),
                      parent: null,
                    },
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
                    aria-busy={addMut.isPending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--reels-accent,#f59e0b)] text-white shadow-md disabled:opacity-45"
                    aria-label="Send comment"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="shrink-0 space-y-3 border-t border-white/10 px-4 pt-4" style={composerLiftStyle}>
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
          </motion.div>

        <EmojiPickerOverlay
          open={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelectEmoji={handleInsertEmoji}
        />
      </motion.div>
    ) : null;

  return portalEl ? createPortal(<AnimatePresence>{drawerTree}</AnimatePresence>, portalEl) : null;
};

export default ReelCommentDrawer;
