import { ReactNode, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AIChatbot from '@/components/chat/AIChatbot';
import {
  PortalHeaderChromeContext,
  type PortalHeaderChromeValue,
} from '@/contexts/PortalHeaderChromeContext';
import PortalAccountSwitch from '@/components/portal/PortalAccountSwitch';
import PortalHeaderCart from '@/components/portal/PortalHeaderCart';
import PortalHeaderNotifications, {
  type PortalHeaderNotificationsProps,
} from '@/components/portal/PortalHeaderNotifications';
import type { PortalAccountSurface } from '@/lib/portalAccountSwitch';
import { portalNotificationsHrefForBasePath } from '@/lib/portalNavigation';

interface PortalLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  headerActions?: ReactNode;
  /** When set, shows the account-type switch control in the sticky header on every page. */
  portalSurface?: PortalAccountSurface;
  /** Top notification bell + inbox modal; set `false` to hide. */
  notifications?: PortalHeaderNotificationsProps | false;
}

const PortalLayout = ({
  children,
  sidebar,
  headerActions,
  portalSurface,
  notifications = {},
}: PortalLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showNotifications = notifications !== false;
  const notificationSurface =
    showNotifications && typeof notifications === 'object' ? notifications.surface : undefined;
  const notificationOrdersDeepLink =
    showNotifications && typeof notifications === 'object' ? notifications.ordersDeepLink : undefined;
  const notificationsPageHref =
    portalSurface === 'child'
      ? portalNotificationsHrefForBasePath('/child-portal')
      : portalSurface === 'family'
        ? portalNotificationsHrefForBasePath('/family-portal')
        : undefined;

  const portalChrome = useMemo(
    (): PortalHeaderChromeValue => ({
      toolbar: (
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
          {showNotifications ? (
            <PortalHeaderNotifications
              surface={notificationSurface}
              ordersDeepLink={notificationOrdersDeepLink}
              notificationsPageHref={notificationsPageHref}
            />
          ) : null}
          {portalSurface ? <PortalAccountSwitch currentSurface={portalSurface} /> : null}
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
            {headerActions ?? null}
            <PortalHeaderCart />
          </div>
        </div>
      ),
      sidebar,
      mobileMenuOpen,
      setMobileMenuOpen,
    }),
    [
      headerActions,
      notificationOrdersDeepLink,
      notificationSurface,
      notificationsPageHref,
      portalSurface,
      showNotifications,
      sidebar,
      mobileMenuOpen,
    ],
  );

  return (
    <PortalHeaderChromeContext.Provider value={portalChrome}>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="flex min-h-[calc(100vh-112px)] min-w-0 md:min-h-[calc(100vh-4rem)]">
          <div className="hidden lg:block lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:shrink-0">
            {sidebar}
          </div>

          <main className="min-w-0 flex-1 pb-24 pt-4 lg:pb-8 lg:pt-6">{children}</main>
        </div>

        <AIChatbot />
        <MobileFooterNav />
      </div>
    </PortalHeaderChromeContext.Provider>
  );
};

export default PortalLayout;
