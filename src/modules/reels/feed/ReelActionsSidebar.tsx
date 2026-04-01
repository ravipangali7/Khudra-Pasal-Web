import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Share2, Bookmark, MessageCircle } from 'lucide-react';

interface ReelActionsSidebarProps {
  views: number;
  likes: number;
  commentsCount?: number;
  liked: boolean;
  saved?: boolean;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
  onSave?: () => void;
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
}> = ({ icon, label, onClick, active, index }) => (
  <motion.button
    className="flex flex-col items-center gap-1"
    onClick={onClick}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 300 }}
    whileTap={{ scale: 0.9 }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
      style={{
        background: active ? 'var(--reels-accent)' : 'var(--reels-glass)',
        border: `1px solid ${active ? 'var(--reels-accent)' : 'var(--reels-glass-border)'}`,
      }}
    >
      {icon}
    </div>
    <span className="reels-font-mono text-[10px] font-medium text-white">{label}</span>
  </motion.button>
);

const ViewsStat: React.FC<{ views: number; index: number }> = ({ views, index }) => (
  <motion.div
    className="flex flex-col items-center gap-1 pointer-events-none select-none"
    aria-hidden
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 300 }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md"
      style={{
        background: 'var(--reels-glass)',
        border: '1px solid var(--reels-glass-border)',
      }}
    >
      <Eye className="w-5 h-5 text-white" />
    </div>
    <span className="reels-font-mono text-[10px] font-medium text-white">{formatCount(views)}</span>
  </motion.div>
);

const ReelActionsSidebar: React.FC<ReelActionsSidebarProps> = ({
  views,
  likes,
  commentsCount = 0,
  liked,
  saved,
  onLike,
  onShare,
  onComment,
  onSave,
}) => {
  return (
    <div className="absolute right-3 bottom-[260px] z-[5] flex flex-col items-center gap-4">
      <ActionButton
        index={0}
        icon={
          <motion.div animate={liked ? { scale: [1, 1.3, 1] } : {}} transition={{ type: 'spring' }}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-white text-white' : 'text-white'}`} />
          </motion.div>
        }
        label={formatCount(likes)}
        onClick={onLike}
        active={liked}
      />
      <ViewsStat views={views} index={1} />
      <ActionButton
        index={2}
        icon={<MessageCircle className="w-5 h-5 text-white" />}
        label={formatCount(commentsCount)}
        onClick={onComment}
      />
      <ActionButton
        index={3}
        icon={<Bookmark className={`w-5 h-5 ${saved ? 'fill-white text-white' : 'text-white'}`} />}
        label="Fav"
        onClick={onSave || (() => {})}
        active={saved}
      />
      <ActionButton
        index={4}
        icon={<Share2 className="w-5 h-5 text-white" />}
        label="Share"
        onClick={onShare}
      />
    </div>
  );
};

export default ReelActionsSidebar;
