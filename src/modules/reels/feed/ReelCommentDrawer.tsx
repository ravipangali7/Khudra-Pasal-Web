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

  return (
    <div className="fixed inset-0 z-[220]">
      <button type="button" className="absolute inset-0 bg-black/55" onClick={onClose} aria-label="Close comments" />
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-zinc-950 border-l border-white/10 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white text-sm font-semibold">Comments</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {commentsQuery.isLoading && <p className="text-xs text-white/60">Loading comments...</p>}
          {commentsQuery.isError && (
            <p className="text-xs text-amber-200/90">Could not load comments. Try signing in or refresh.</p>
          )}
          {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 && (
            <p className="text-xs text-white/60">No comments yet. Start the conversation.</p>
          )}
          {comments.map((comment) => (
            <div key={`${comment.id}-${comment.created_at}`} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-white/80 font-medium">{comment.user_name || 'User'}</p>
              <p className="text-sm text-white mt-1 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
        </div>

        {hasSession ? (
          <form
            className="p-3 border-t border-white/10 flex items-end gap-2"
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="w-11 h-11 rounded-xl bg-white text-black border border-white/15 flex items-center justify-center"
                aria-label="Pick emoji"
                title="Pick emoji"
              >
                🙂
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 rounded-xl bg-white border border-white/15 text-black placeholder:text-gray-500 text-sm p-2.5 min-h-[44px] max-h-28"
              placeholder="Write a comment... add emoji 🙂"
            />
            <button
              type="submit"
              disabled={addMut.isPending || !draft.trim()}
              className="w-11 h-11 rounded-xl bg-[var(--reels-accent)] text-white flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="p-4 border-t border-white/10 space-y-3">
            <p className="text-xs text-white/70">Sign in to post a comment.</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--reels-accent)' }}
            >
              Sign in
            </button>
          </div>
        )}
      </div>
      <EmojiPickerOverlay
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelectEmoji={handleInsertEmoji}
      />
    </div>
  );
};

export default ReelCommentDrawer;
