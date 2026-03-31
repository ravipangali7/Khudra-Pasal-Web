import React from 'react';

const ReelsFeedSkeleton: React.FC = () => {
  return (
    <div className="w-full h-[100dvh] flex items-center justify-center" style={{ background: 'var(--reels-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-white/10 rounded-full animate-spin" style={{ borderTopColor: 'var(--reels-accent)' }} />
        <p className="reels-font-body text-sm" style={{ color: 'var(--reels-text-muted)' }}>Loading reels...</p>
      </div>
    </div>
  );
};

export default ReelsFeedSkeleton;
