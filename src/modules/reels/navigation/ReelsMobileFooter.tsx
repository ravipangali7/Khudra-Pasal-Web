import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Home, Wallet, ShoppingBag, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  isMobileOrdersShellRoute,
  isMobileProfileShellRoute,
  isMobileWalletShellRoute,
  navigateToMobileOrders,
  navigateToMobileProfile,
  navigateToMobileWallet,
} from '@/lib/mobileProfileNav';
import '../reels-theme.css';

const FOOTER_HEIGHT = 64;

const ReelsMobileFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(
    () => [
      { id: 'home', icon: Home, label: 'Home', path: '/' },
      { id: 'wallet', icon: Wallet, label: 'Wallet', path: '/portal/wallet' },
      { id: 'reels', icon: null, label: 'Reel', path: '/reels' },
      { id: 'orders', icon: ShoppingBag, label: 'Orders', path: '/portal/orders' },
      { id: 'profile', icon: User, label: 'Profile', path: '/signup' },
    ],
    [],
  );

  useEffect(() => {
    document.body.style.paddingBottom = `${FOOTER_HEIGHT + 16}px`;
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const content = (
    <nav
      className="mobile-tabbar-fixed md:hidden"
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: `${FOOTER_HEIGHT}px`,
      }}
    >
      <div className="flex items-center justify-around h-full px-0.5">
        {tabs.map((tab) => {
          const active =
            tab.id === 'profile'
              ? isMobileProfileShellRoute(location.pathname)
              : tab.id === 'wallet'
                ? isMobileWalletShellRoute(location.pathname)
                : tab.id === 'orders'
                  ? isMobileOrdersShellRoute(location.pathname)
                  : tab.id === 'reels'
                    ? location.pathname === '/reels' || location.pathname.startsWith('/reels/')
                    : isActive(tab.path);

          if (tab.id === 'reels') {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate('/reels')}
                className="flex flex-col items-center -mt-3 min-w-0 flex-1"
              >
                <motion.div
                  className="w-[48px] h-[48px] rounded-full flex items-center justify-center shrink-0"
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
                  className="text-[9px] font-bold mt-0.5 truncate max-w-full px-0.5"
                  style={{ color: active ? '#F59E0B' : 'rgba(85,85,85,1)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          const Icon = tab.icon!;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'profile') {
                  void navigateToMobileProfile(navigate, location.pathname);
                  return;
                }
                if (tab.id === 'wallet') {
                  void navigateToMobileWallet(navigate, location.pathname);
                  return;
                }
                if (tab.id === 'orders') {
                  void navigateToMobileOrders(navigate, location.pathname);
                  return;
                }
                navigate(tab.path);
              }}
              className="flex flex-col items-center gap-0.5 py-2 px-1 relative min-w-0 flex-1"
            >
              <motion.div animate={active ? { scale: 1.1 } : { scale: 1 }}>
                <Icon
                  className="w-[18px] h-[18px] shrink-0"
                  style={{ color: active ? '#F59E0B' : 'rgba(85,85,85,1)' }}
                />
              </motion.div>
              <span
                className="text-[9px] text-center leading-tight truncate max-w-full"
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
