import React, { useEffect, useRef } from 'react';

interface ReelProgressBarProps {
  isActive: boolean;
  progress?: number;
  onComplete?: () => void;
}

const ReelProgressBar: React.FC<ReelProgressBarProps> = ({ isActive, progress = 0, onComplete }) => {
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      hasCompletedRef.current = false;
      return;
    }
    if (progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    } else if (progress < 100) {
      hasCompletedRef.current = false;
    }
  }, [isActive, progress, onComplete]);

  return (
    <div className="absolute top-0 left-0 right-0 z-[6] h-[2px]" style={{ background: 'var(--reels-glass)' }}>
      <div
        className="h-full transition-[width] duration-75 ease-linear"
        style={{
          width: `${progress}%`,
          background: 'var(--reels-accent)',
          boxShadow: '0 0 6px var(--reels-accent-glow)'
        }}
      />
    </div>
  );
};

export default ReelProgressBar;
