import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MyReelsGrid from './MyReelsGrid';
import ReelUploadForm from './ReelUploadForm';
import '../reels-theme.css';

const VendorReelsPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'upload'>('grid');

  return (
    <div className="min-h-screen" style={{ background: 'var(--reels-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-lg" style={{ background: 'rgba(10,10,10,0.9)', borderBottom: '1px solid var(--reels-border)' }}>
        <button onClick={() => view === 'upload' ? setView('grid') : navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--reels-glass)' }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="reels-font-display font-bold text-white text-lg">
          {view === 'upload' ? 'New Reel' : 'KhudraReels'}
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {view === 'grid' ? (
          <MyReelsGrid onNewReel={() => setView('upload')} />
        ) : (
          <ReelUploadForm />
        )}
      </div>
    </div>
  );
};

export default VendorReelsPage;
