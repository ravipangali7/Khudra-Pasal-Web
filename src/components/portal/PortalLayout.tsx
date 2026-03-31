import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Header from '@/components/layout/Header';
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
        <div className="container px-4 py-3 lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              {sidebar}
            </SheetContent>
          </Sheet>
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
