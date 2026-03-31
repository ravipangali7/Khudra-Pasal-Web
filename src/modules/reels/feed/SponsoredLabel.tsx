import React from 'react';

const SponsoredLabel: React.FC = () => (
  <div
    className="absolute top-14 left-4 z-[6] px-2 py-0.5 rounded-md reels-font-body text-[10px] font-medium"
    style={{
      background: 'rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    Sponsored
  </div>
);

export default SponsoredLabel;
