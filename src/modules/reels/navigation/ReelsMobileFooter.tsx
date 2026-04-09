import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, TrendingUp, ShoppingCart, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isMobileProfileShellRoute, navigateToMobileProfile } from '@/lib/mobileProfileNav';
import '../reels-theme.css';

const FOOTER_HEIGHT = 64;

const tabs = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'trending', icon: TrendingUp, label: 'Trending', path: '/category/all' },
  { id: 'reels', icon: null, label: 'Reels', path: '/reels' },
  { id: 'cart', icon: ShoppingCart, label: 'Cart', path: '/checkout' },
  { id: 'profile', icon: User, label: 'Profile', path: '/signup' },
];

const ReelsMobileFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.style.paddingBottom = `${FOOTER_HEIGHT + 16}px`;
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const content = (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: `${FOOTER_HEIGHT}px`,
      }}
    >
      <div className="flex items-center justify-around h-full">
        {tabs.map(tab => {
          const active =
            tab.id === 'profile'
              ? isMobileProfileShellRoute(location.pathname)
              : isActive(tab.path);

          if (tab.id === 'reels') {
            return (
              <button
                key={tab.id}
                onClick={() => navigate('/reels')}
                className="flex flex-col items-center -mt-3"
              >
                <motion.div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 0 24px rgba(245, 158, 11, 0.35)',
                  }}
                  animate={active ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="white" strokeWidth="2" />
                    <line x1="2" y1="8" x2="22" y2="8" stroke="white" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="8" stroke="white" strokeWidth="2" />
                    <polygon points="10,12 10,19 17,15.5" fill="white" />
                  </svg>
                </motion.div>
                <span
                  className="text-[9px] font-bold mt-0.5"
                  style={{ color: active ? '#F59E0B' : 'rgba(85,85,85,1)' }}
                >
                  Reels
                </span>
              </button>
            );
          }

          const Icon = tab.icon!;
          const cartCount = tab.id === 'cart' ? 3 : 0;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'profile') {
                  void navigateToMobileProfile(navigate, location.pathname);
                  return;
                }
                navigate(tab.path);
              }}
              className="flex flex-col items-center gap-0.5 py-2 px-3 relative"
            >
              <motion.div animate={active ? { scale: 1.1 } : { scale: 1 }}>
                <Icon className="w-5 h-5" style={{ color: active ? '#F59E0B' : 'rgba(85,85,85,1)' }} />
              </motion.div>
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span
                className="text-[10px]"
                style={{
                  color: active ? '#F59E0B' : 'rgba(85,85,85,1)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(content, document.body);
};

export default ReelsMobileFooter;
