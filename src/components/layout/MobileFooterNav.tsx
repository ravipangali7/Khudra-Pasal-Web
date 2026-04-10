import { useEffect, useMemo } from 'react';
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

const FOOTER_HEIGHT = 64;

/** Space reserved above the tab bar (matches prior body padding when the window was the scroller). */
export const MOBILE_TABBAR_SCROLL_PADDING = FOOTER_HEIGHT + 16;

interface MobileFooterNavProps {
  /**
   * When the scroll container is an inner element (e.g. portal main) with its own bottom padding,
   * skip adding padding on `body` to avoid extra document scroll and double spacing.
   */
  skipDocumentPadding?: boolean;
}

const MobileFooterNav = ({ skipDocumentPadding = false }: MobileFooterNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (skipDocumentPadding) return;
    document.body.style.paddingBottom = `${MOBILE_TABBAR_SCROLL_PADDING}px`;
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [skipDocumentPadding]);

  const isActive = (path: string) => location.pathname === path;
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

  const content = (
    <nav
      className="mobile-tabbar-fixed md:hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(270 80% 20%) 0%, hsl(270 60% 12%) 50%, hsl(220 40% 10%) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(270 60% 30% / 0.4)',
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
                className="flex flex-col items-center -mt-4 min-w-0 flex-1"
              >
                <motion.div
                  className="w-[48px] h-[48px] rounded-full flex items-center justify-center shadow-lg shrink-0"
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
                  className="text-[9px] font-bold mt-0.5 truncate max-w-full px-0.5"
                  style={{ color: active ? 'hsl(38 92% 58%)' : 'hsl(270 30% 70%)' }}
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
              <motion.div animate={active ? { scale: 1.12 } : { scale: 1 }}>
                <Icon
                  className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0"
                  style={{
                    color: active ? 'hsl(36 100% 60%)' : 'hsl(270 20% 60%)',
                    filter: active ? 'drop-shadow(0 0 6px hsl(36 100% 50% / 0.4))' : 'none',
                  }}
                />
              </motion.div>
              <span
                className="text-[9px] leading-tight text-center truncate max-w-full"
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

  return createPortal(content, document.body);
};

export default MobileFooterNav;
