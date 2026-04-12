import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Share2, Bookmark, MessageCircle } from 'lucide-react';

export interface ReelActionsSidebarProps {
  views: number;
  likes: number;
  shares: number;
  bookmarks: number;
  commentsCount?: number;
  liked: boolean;
  saved?: boolean;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
  onSave?: () => void;
  /** `sidebar`: right column in a row layout. `floating`: transparent overlay rail (full-screen /reels). */
  layout?: 'sidebar' | 'floating';
  /** Extra classes for the outer rail (e.g. width, border). */
  className?: string;
  /** When false, rail is inert (empty list / no active reel). */
  disabled?: boolean;
}

const formatCount = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  index: number;
  disabled?: boolean;
  floating?: boolean;
}> = ({ icon, label, onClick, active, index, disabled, floating = false }) => (
  <motion.button
    type="button"
    className={`flex flex-col items-center ${floating ? 'gap-0.5' : 'gap-1'} disabled:opacity-40 disabled:pointer-events-none`}
    onClick={onClick}
    disabled={disabled}
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.08 + index * 0.05, type: 'spring', stiffness: 320 }}
    whileTap={{ scale: disabled ? 1 : 0.9 }}
  >
    <div
      className={`rounded-full flex items-center justify-center backdrop-blur-md ${
        floating ? 'w-12 h-12 sm:w-[52px] sm:h-[52px]' : 'w-11 h-11 sm:w-12 sm:h-12'
      }`}
      style={{
        background: active ? 'var(--reels-accent)' : floating ? 'rgba(0,0,0,0.46)' : 'var(--reels-glass)',
        border: `1px solid ${active ? 'var(--reels-accent)' : floating ? 'rgba(255,255,255,0.24)' : 'var(--reels-glass-border)'}`,
      }}
    >
      {icon}
    </div>
    <span className={`reels-font-mono font-medium text-white max-w-[4rem] text-center leading-tight ${floating ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>
      {label}
    </span>
  </motion.button>
);

const ViewsStat: React.FC<{ views: number; index: number; floating?: boolean }> = ({
  views,
  index,
  floating = false,
}) => (
  <motion.div
    className={`flex flex-col items-center ${floating ? 'gap-0.5' : 'gap-1'} pointer-events-none select-none`}
    aria-hidden
    initial={{ opacity: 0, x: 8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.08 + index * 0.05, type: 'spring', stiffness: 320 }}
  >
    <div
      className={`rounded-full flex items-center justify-center backdrop-blur-md ${
        floating ? 'w-12 h-12 sm:w-[52px] sm:h-[52px]' : 'w-11 h-11 sm:w-12 sm:h-12'
      }`}
      style={{
        background: floating ? 'rgba(0,0,0,0.46)' : 'var(--reels-glass)',
        border: floating ? '1px solid rgba(255,255,255,0.24)' : '1px solid var(--reels-glass-border)',
      }}
    >
      <Eye className="w-5 h-5 text-white" />
    </div>
    <span className={`reels-font-mono font-medium text-white ${floating ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>
      {formatCount(views)}
    </span>
  </motion.div>
);

const ReelActionsSidebar: React.FC<ReelActionsSidebarProps> = ({
  views,
  likes,
  shares,
  bookmarks,
  commentsCount = 0,
  liked,
  saved,
  onLike,
  onShare,
  onComment,
  onSave,
  layout = 'sidebar',
  className = '',
  disabled = false,
}) => {
  const floating = layout === 'floating';
  return (
    <aside
      className={
        floating
          ? `pointer-events-auto flex flex-col items-center justify-end gap-3 py-0 shrink-0 w-14 sm:w-16 ${className}`.trim()
          : `flex h-full min-h-0 flex-col items-center justify-center gap-3 sm:gap-4 border-l py-4 sm:py-6 shrink-0 w-14 sm:w-16 ${className}`.trim()
      }
      style={
        floating
          ? undefined
          : {
              background: 'var(--reels-surface)',
              borderColor: 'var(--reels-border)',
            }
      }
      aria-label="Reel actions"
    >
      <ActionButton
        index={0}
        disabled={disabled}
        icon={
          <motion.div animate={liked ? { scale: [1, 1.2, 1] } : {}} transition={{ type: 'spring' }}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-white text-white' : 'text-white'}`} />
          </motion.div>
        }
        label={formatCount(likes)}
        onClick={onLike}
        active={liked}
        floating={floating}
      />
      <ViewsStat views={views} index={1} floating={floating} />
      <ActionButton
        index={2}
        disabled={disabled}
        icon={<MessageCircle className="w-5 h-5 text-white" />}
        label={formatCount(commentsCount)}
        onClick={onComment}
        floating={floating}
      />
      <ActionButton
        index={3}
        disabled={disabled}
        icon={<Bookmark className={`w-5 h-5 ${saved ? 'fill-white text-white' : 'text-white'}`} />}
        label={formatCount(bookmarks)}
        onClick={onSave || (() => {})}
        active={saved}
        floating={floating}
      />
      <ActionButton
        index={4}
        disabled={disabled}
        icon={<Share2 className="w-5 h-5 text-white" />}
        label={formatCount(shares)}
        onClick={onShare}
        floating={floating}
      />
    </aside>
  );
};

export default ReelActionsSidebar;
