import React, { useState, useEffect } from 'react';

interface VideoPreviewCardProps {
  url: string;
}

const detectPlatform = (url: string): { platform: string; valid: boolean } => {
  if (url.match(/youtube\.com|youtu\.be/)) return { platform: 'YouTube Shorts', valid: true };
  if (url.match(/tiktok\.com/)) return { platform: 'TikTok', valid: true };
  if (url.match(/instagram\.com/)) return { platform: 'Instagram', valid: true };
  if (url.match(/\.(mp4|webm|mov)$/i)) return { platform: 'Direct MP4', valid: true };
  if (url.length > 10) return { platform: 'Unknown', valid: false };
  return { platform: '', valid: false };
};

const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ url }) => {
  const [info, setInfo] = useState({ platform: '', valid: false });

  useEffect(() => {
    if (url.length > 5) {
      const timer = setTimeout(() => setInfo(detectPlatform(url)), 300);
      return () => clearTimeout(timer);
    }
    setInfo({ platform: '', valid: false });
  }, [url]);

  if (!url || url.length < 5) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-glass-border)' }}>
      {info.valid && url.match(/\.(mp4|webm|mov)$/i) && (
        <video src={url} className="w-full h-48 object-cover" muted autoPlay loop playsInline />
      )}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {info.valid ? (
            <span className="text-green-400 reels-font-body text-sm font-medium">✅ Video detected!</span>
          ) : url.length > 5 ? (
            <span className="text-red-400 reels-font-body text-sm font-medium">❌ Invalid URL</span>
          ) : null}
        </div>
        {info.platform && (
          <span className="reels-font-body text-xs px-2 py-1 rounded-full" style={{ background: 'var(--reels-glass)', color: 'var(--reels-text-secondary)' }}>
            {info.platform}
          </span>
        )}
      </div>
    </div>
  );
};

export default VideoPreviewCard;
