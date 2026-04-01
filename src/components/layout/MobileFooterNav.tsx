import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, TrendingUp, LogIn, LogOut, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import { clearAllAuthTokens, getAuthToken } from '@/lib/api';

const FOOTER_HEIGHT = 64;

const MobileFooterNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    document.body.style.paddingBottom = `${FOOTER_HEIGHT + 16}px`;
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  useEffect(() => {
    const sync = () => setIsLoggedIn(Boolean(getAuthToken()));
    sync();
    window.addEventListener('khudra-auth-changed', sync);
    return () => window.removeEventListener('khudra-auth-changed', sync);
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const tabs = useMemo(
    () => [
      { id: 'home', icon: Home, label: 'Home', path: '/' },
      { id: 'trending', icon: TrendingUp, label: 'Trending', path: '/category/all' },
      { id: 'reels', icon: null, label: 'Reels', path: '/reels' },
      { id: 'offers', icon: Tag, label: 'Offers', path: '/products' },
      isLoggedIn
        ? { id: 'logout', icon: LogOut, label: 'Logout', path: '#' }
        : { id: 'login', icon: LogIn, label: 'Login', path: '/login' },
    ],
    [isLoggedIn],
  );

  const content = (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(270 80% 20%) 0%, hsl(270 60% 12%) 50%, hsl(220 40% 10%) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(270 60% 30% / 0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: `${FOOTER_HEIGHT}px`,
      }}
    >
      <div className="flex items-center justify-around h-full px-1">
        {tabs.map(tab => {
          const active = isActive(tab.path);

          if (tab.id === 'reels') {
            return (
              <button
                key={tab.id}
                onClick={() => navigate('/reels')}
                className="flex flex-col items-center -mt-4"
              >
                <motion.div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, hsl(38 92% 50%) 0%, hsl(32 92% 42%) 100%)',
                    boxShadow: '0 0 24px rgba(245, 158, 11, 0.45), 0 4px 12px rgba(0,0,0,0.3)',
                    border: '2px solid hsl(38 92% 58% / 0.5)',
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
                  style={{ color: active ? 'hsl(38 92% 58%)' : 'hsl(270 30% 70%)' }}
                >
                  Reels
                </span>
              </button>
            );
          }

          const Icon = tab.icon!;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'logout') {
                  setLogoutOpen(true);
                  return;
                }
                navigate(tab.path);
              }}
              className="flex flex-col items-center gap-0.5 py-2 px-3 relative"
            >
              <motion.div animate={active ? { scale: 1.15 } : { scale: 1 }}>
                <Icon
                  className="w-5 h-5"
                  style={{
                    color: active ? 'hsl(36 100% 60%)' : 'hsl(270 20% 60%)',
                    filter: active ? 'drop-shadow(0 0 6px hsl(36 100% 50% / 0.4))' : 'none',
                  }}
                />
              </motion.div>
              {tab.id === 'offers' && cartCount > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span
                className="text-[10px]"
                style={{
                  color: active ? 'hsl(36 100% 60%)' : 'hsl(270 20% 55%)',
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

  return (
    <>
      {createPortal(content, document.body)}
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => {
          clearAllAuthTokens();
          setLogoutOpen(false);
        }}
      />
    </>
  );
};

export default MobileFooterNav;
