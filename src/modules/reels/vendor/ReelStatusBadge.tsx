import React from 'react';

interface ReelStatusBadgeProps {
  status: 'active' | 'paused' | 'deleted' | 'flagged';
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50', label: 'Active' },
  paused: { bg: 'rgba(255, 183, 3, 0.15)', color: '#FFB703', label: 'Paused' },
  deleted: { bg: 'rgba(230, 57, 70, 0.15)', color: '#E63946', label: 'Deleted' },
  flagged: { bg: 'rgba(255, 152, 0, 0.15)', color: '#FF9800', label: 'Flagged' },
};

const ReelStatusBadge: React.FC<ReelStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <span
      className="reels-font-body text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
};

export default ReelStatusBadge;
