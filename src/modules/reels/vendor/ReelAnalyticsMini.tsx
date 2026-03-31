import React from 'react';
import { Eye, Heart } from 'lucide-react';

interface ReelAnalyticsMiniProps {
  views: number;
  likes: number;
}

const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();

const ReelAnalyticsMini: React.FC<ReelAnalyticsMiniProps> = ({ views, likes }) => (
  <div className="flex items-center gap-3">
    <span className="flex items-center gap-1 reels-font-mono text-xs" style={{ color: 'var(--reels-text-secondary)' }}>
      <Eye className="w-3.5 h-3.5" /> {formatCount(views)}
    </span>
    <span className="flex items-center gap-1 reels-font-mono text-xs" style={{ color: 'var(--reels-text-secondary)' }}>
      <Heart className="w-3.5 h-3.5" /> {formatCount(likes)}
    </span>
  </div>
);

export default ReelAnalyticsMini;
