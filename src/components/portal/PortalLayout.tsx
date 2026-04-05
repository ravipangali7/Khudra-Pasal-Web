import { ReactNode, useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AIChatbot from '@/components/chat/AIChatbot';
import {
  PortalHeaderChromeContext,
  type PortalHeaderChromeValue,
} from '@/contexts/PortalHeaderChromeContext';

interface PortalLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  headerActions?: ReactNode;
}

const PortalLayout = ({ children, sidebar, headerActions }: PortalLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const portalChrome = useMemo(
    (): PortalHeaderChromeValue => ({
      toolbar: headerActions ?? null,
      sidebar,
      mobileMenuOpen,
      setMobileMenuOpen,
    }),
    [headerActions, sidebar, mobileMenuOpen],
  );

  return (
    <PortalHeaderChromeContext.Provider value={portalChrome}>
      <div className="min-h-screen bg-background">
        <Header />

        <div className="flex min-h-[calc(100vh-112px)] md:min-h-[calc(100vh-4rem)]">
          <div className="hidden lg:block lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:shrink-0">
            {sidebar}
          </div>

          <main className="flex-1 pb-24 lg:pb-8">{children}</main>
        </div>

        <AIChatbot />
        <MobileFooterNav />
      </div>
    </PortalHeaderChromeContext.Provider>
  );
};

export default PortalLayout;
