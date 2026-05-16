import { ReactNode, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AIChatbot from '@/components/chat/AIChatbot';
import {
  PortalHeaderChromeContext,
  type PortalHeaderChromeValue,
} from '@/contexts/PortalHeaderChromeContext';
import PortalAccountSwitch from '@/components/portal/PortalAccountSwitch';
import type { PortalAccountSurface } from '@/lib/portalAccountSwitch';

interface PortalLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  headerActions?: ReactNode;
  /** When set, shows the account-type switch control in the sticky header on every page. */
  portalSurface?: PortalAccountSurface;
}

const PortalLayout = ({ children, sidebar, headerActions, portalSurface }: PortalLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const portalChrome = useMemo(
    (): PortalHeaderChromeValue => ({
      toolbar: (
        <>
          {portalSurface ? <PortalAccountSwitch currentSurface={portalSurface} /> : null}
          {headerActions ?? null}
        </>
      ),
      sidebar,
      mobileMenuOpen,
      setMobileMenuOpen,
    }),
    [headerActions, portalSurface, sidebar, mobileMenuOpen],
  );

  return (
    <PortalHeaderChromeContext.Provider value={portalChrome}>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="flex min-h-[calc(100vh-112px)] min-w-0 md:min-h-[calc(100vh-4rem)]">
          <div className="hidden lg:block lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:shrink-0">
            {sidebar}
          </div>

          <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
        </div>

        <AIChatbot />
        <MobileFooterNav />
      </div>
    </PortalHeaderChromeContext.Provider>
  );
};

export default PortalLayout;
