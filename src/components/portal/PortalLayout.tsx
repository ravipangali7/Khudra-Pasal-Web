import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileFooterNav, { MOBILE_TABBAR_SCROLL_PADDING } from '@/components/layout/MobileFooterNav';
import {
  PortalHeaderChromeContext,
  type PortalHeaderChromeValue,
} from '@/contexts/PortalHeaderChromeContext';
import PortalAccountSwitch from '@/components/portal/PortalAccountSwitch';
import PortalHeaderCart from '@/components/portal/PortalHeaderCart';
import PortalHeaderNotifications, {
  type PortalHeaderNotificationsProps,
} from '@/components/portal/PortalHeaderNotifications';
import { PORTAL_MOBILE_ICON_CLASS } from '@/components/portal/portalMobileChrome';
import type { PortalAccountSurface } from '@/lib/portalAccountSwitch';
import { portalNotificationsHrefForBasePath } from '@/lib/portalNavigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const portalChrome = useMemo((): PortalHeaderChromeValue => {
    const notificationBell = showNotifications ? (
      <PortalHeaderNotifications
        surface={notificationSurface}
        ordersDeepLink={notificationOrdersDeepLink}
        notificationsPageHref={notificationsPageHref}
      />
    ) : null;

    const accountSwitch = portalSurface ? (
      <PortalAccountSwitch currentSurface={portalSurface} />
    ) : null;

    return {
      toolbar: (
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
          {notificationBell}
          {accountSwitch}
          {headerActions ? (
            <div className="hidden shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2 lg:flex">
              {headerActions}
            </div>
          ) : null}
          <PortalHeaderCart />
        </div>
      ),
      sidebar,
      mobileMenuOpen,
      setMobileMenuOpen,
      closeMobileMenu,
    };
  }, [
    headerActions,
    closeMobileMenu,
    notificationOrdersDeepLink,
    notificationSurface,
    notificationsPageHref,
    portalSurface,
    showNotifications,
    sidebar,
    mobileMenuOpen,
  ]);

  const mobileToolbar = (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1 [&>*]:shrink-0">
      <PortalHeaderCart className={PORTAL_MOBILE_ICON_CLASS} />
      {portalSurface ? (
        <PortalAccountSwitch currentSurface={portalSurface} className={PORTAL_MOBILE_ICON_CLASS} />
      ) : null}
      {showNotifications ? (
        <PortalHeaderNotifications
          surface={notificationSurface}
          ordersDeepLink={notificationOrdersDeepLink}
          notificationsPageHref={notificationsPageHref}
          className={PORTAL_MOBILE_ICON_CLASS}
        />
      ) : null}
    </div>
  );

  return (
    <PortalHeaderChromeContext.Provider value={portalChrome}>
      <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-background">
        <header className="z-30 w-full shrink-0 border-b border-border bg-card lg:hidden">
          <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {mobileToolbar}
          </div>
        </header>

        {mobileMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[10040] bg-black/60 lg:hidden"
              aria-label="Close menu"
              onClick={closeMobileMenu}
            />
            <div
              className="fixed inset-y-0 left-0 z-[10050] flex w-[min(18rem,88vw)] flex-col border-r border-border bg-card shadow-xl lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Portal navigation"
            >
              <div className="flex shrink-0 items-center justify-end border-b border-border px-2 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Close menu"
                  onClick={closeMobileMenu}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden [&_aside]:h-full [&_aside]:w-full [&_aside]:max-w-none">
                {sidebar}
              </div>
            </div>
          </>
        ) : null}

        <div className="hidden w-full shrink-0 lg:block">
          <Header />
        </div>

        <div className="flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
          <aside className="hidden lg:block lg:h-full lg:shrink-0 lg:overflow-y-auto">
            {sidebar}
          </aside>

          <main
            className={cn(
              'min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-4 lg:pb-8 lg:pt-6',
              'max-lg:pb-[calc(var(--tabbar-scroll-pad)+env(safe-area-inset-bottom,0px))]',
            )}
            style={{ ['--tabbar-scroll-pad' as string]: `${MOBILE_TABBAR_SCROLL_PADDING}px` }}
          >
            {children}
          </main>
        </div>

        <MobileFooterNav skipDocumentPadding />
      </div>
    </PortalHeaderChromeContext.Provider>
  );
};

export default PortalLayout;
