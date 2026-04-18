import { useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProfileMenu from '@/components/profile/ProfileMenu';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  title: string;
  subtitle?: string;
  notifications?: number;
  onNotificationsClick?: () => void;
  onSearch?: (query: string) => void;
  /** Hide the header dropdown Logout item (vendor portal uses sidebar/store logout). */
  hideHeaderLogout?: boolean;
  /** Optional actions rendered at top-right (before avatar dropdown). */
  headerRight?: React.ReactNode;
  onProfileClick: () => void;
  /** Optional user/store image for the header avatar */
  avatarImageUrl?: string | null;
  /** Text/initials inside avatar when no image */
  avatarFallback?: string;
  onHeaderLogout?: () => void;
}

export default function AdminLayout({ 
  children, 
  sidebar, 
  title, 
  subtitle,
  notifications = 0,
  onNotificationsClick,
  onSearch,
  hideHeaderLogout = false,
  headerRight,
  onProfileClick,
  avatarImageUrl,
  avatarFallback = 'SA',
  onHeaderLogout,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 fixed inset-y-0 left-0 z-30",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex items-center justify-between h-14 px-3 border-b border-border">
          {!sidebarCollapsed && (
            <span className="font-bold text-lg text-foreground">{title}</span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          {sidebar}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="font-bold text-lg text-foreground">{title}</span>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="overflow-hidden h-[calc(100vh-56px)]">
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-card border-b border-border flex items-center justify-between px-4 gap-4">
          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Title */}
          <div className="hidden md:block">
            <h1 className="font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-muted/50"
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => onNotificationsClick?.()}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </Button>

            {headerRight}

            <ProfileMenu
              onProfileClick={onProfileClick}
              onLogout={hideHeaderLogout ? undefined : onHeaderLogout}
              avatarImageUrl={avatarImageUrl}
              avatarFallback={avatarFallback}
            />
          </div>
        </header>

        {/* Page Content: min-w-0 so wide tables scroll inside their card, not the whole shell + header */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
