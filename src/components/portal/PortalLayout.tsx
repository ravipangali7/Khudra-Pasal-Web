import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Header, { STOREFRONT_HEADER_STICKY_OFFSET } from '@/components/layout/Header';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import AIChatbot from '@/components/chat/AIChatbot';

interface PortalLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  heroGradient?: string;
  showHeroHeader?: boolean;
}

const PortalLayout = ({
  children,
  sidebar,
  title,
  subtitle,
  headerActions,
  heroGradient = "from-primary to-primary/80",
  showHeroHeader = true,
}: PortalLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {showHeroHeader ? (
        <div className={cn("bg-gradient-to-r text-primary-foreground", heroGradient)}>
          <div className="container px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile menu toggle */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="secondary" size="icon" className="lg:hidden h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    {sidebar}
                  </SheetContent>
                </Sheet>

                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
                </div>
              </div>
              {headerActions}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'sticky z-30 border-b border-border bg-card px-4 py-3',
            STOREFRONT_HEADER_STICKY_OFFSET,
          )}
        >
          <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  {sidebar}
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
                {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            {headerActions ? (
              <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className={cn("flex", showHeroHeader ? "min-h-[calc(100vh-200px)]" : "min-h-[calc(100vh-120px)]")}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:block sticky top-0 h-[calc(100vh-120px)]">
          {sidebar}
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <AIChatbot />
      <MobileFooterNav />
    </div>
  );
};

export default PortalLayout;
