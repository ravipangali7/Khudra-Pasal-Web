import React, { useState, useEffect } from 'react';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../reels-theme.css';

const MobileReelsFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const isReelsPage = location.pathname === '/reels';

  useEffect(() => {
    if (!isReelsPage) { setVisible(true); return; }
    let lastY = 0;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY <= lastY);
      lastY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isReelsPage]);

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'search', icon: Search, label: 'Search', path: '/category/all' },
    { id: 'reels', icon: null, label: 'Reels', path: '/reels' },
    { id: 'cart', icon: ShoppingCart, label: 'Cart', path: '/checkout' },
    { id: 'profile', icon: User, label: 'Profile', path: '/portal/dashboard' },
  ];

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--reels-border)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      animate={{ y: visible ? 0 : '100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          
          if (tab.id === 'reels') {
            return (
              <button key={tab.id} onClick={() => navigate('/reels')} className="flex flex-col items-center -mt-3">
                <motion.div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--reels-accent)',
                    boxShadow: '0 0 24px var(--reels-accent-glow)'
                  }}
                  animate={isReelsPage ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="white" strokeWidth="2" />
                    <line x1="2" y1="8" x2="22" y2="8" stroke="white" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="8" stroke="white" strokeWidth="2" />
                    <polygon points="10,12 10,19 17,15.5" fill="white" />
                  </svg>
                </motion.div>
                <span className="reels-font-body text-[9px] font-bold mt-0.5" style={{ color: isReelsPage ? 'var(--reels-accent)' : 'var(--reels-text-muted)' }}>Reels</span>
              </button>
            );
          }

          const Icon = tab.icon!;
          return (
            <button key={tab.id} onClick={() => navigate(tab.path)} className="flex flex-col items-center gap-0.5 py-2 px-3">
              <Icon className="w-5 h-5" style={{ color: active ? 'var(--reels-accent)' : 'var(--reels-text-muted)' }} />
              <span className="reels-font-body text-[10px]" style={{ color: active ? 'var(--reels-accent)' : 'var(--reels-text-muted)', fontWeight: active ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default MobileReelsFooter;
