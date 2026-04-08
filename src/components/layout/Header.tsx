import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, MapPin, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuthUi } from "@/contexts/AuthUiContext";
import { usePortalHeaderChrome } from "@/contexts/PortalHeaderChromeContext";
import LogoutConfirmDialog from "@/components/auth/LogoutConfirmDialog";
import SearchDropdown from "@/components/search/SearchDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearAllAuthTokens, getAuthToken, portalApi, websiteApi } from "@/lib/api";
import { portalDashboardHrefForRole } from "@/lib/portalNavigation";
import logo from "@/assets/logo.png";

function initialsFromName(name: string | undefined): string {
  const n = name?.trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 2);
  }
  return n.slice(0, 2).toUpperCase();
}

/** Shown only when the API returns no admin-configured placeholders. */
const NEUTRAL_SEARCH_HINT = "products and categories";

/** Mobile header height (toolbar + search strip) for sticky children below the header. */
export const STOREFRONT_HEADER_HEIGHT_MOBILE = "112px";

/** Text nav row sticks directly under the sticky header. */
export const STOREFRONT_TEXT_NAV_STICKY_TOP = "top-[112px] md:top-16";

/**
 * Sticky offset for CategoryNav: below header + {@link StorefrontTextNav}.
 * Mobile ~112px + ~44px text bar; md ~64px + ~40px text bar.
 */
export const STOREFRONT_CATEGORY_NAV_STICKY_TOP = "top-[156px] md:top-[104px]";

/** @deprecated Use STOREFRONT_CATEGORY_NAV_STICKY_TOP */
export const STOREFRONT_HEADER_STICKY_OFFSET = STOREFRONT_CATEGORY_NAV_STICKY_TOP;

const Header = () => {
  const portalChrome = usePortalHeaderChrome();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));
  const { cartCount, setIsCartOpen } = useCart();
  const { openLoginSheet, openSignupSheet } = useAuthUi();

  const { data: searchPlaceholders = [] } = useQuery({
    queryKey: ["website", "search-placeholders"],
    queryFn: () => websiteApi.searchPlaceholders(),
    staleTime: 60_000,
  });

  const placeholders = searchPlaceholders.length > 0 ? searchPlaceholders : [NEUTRAL_SEARCH_HINT];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  useEffect(() => {
    const sync = () => setIsLoggedIn(Boolean(getAuthToken()));
    sync();
    window.addEventListener("khudra-auth-changed", sync);
    return () => window.removeEventListener("khudra-auth-changed", sync);
  }, []);

  const hint = placeholders[placeholderIndex] ?? placeholders[0];

  const {
    data: portalSession,
    isLoading: portalSessionLoading,
    isError: portalSessionError,
  } = useQuery({
    queryKey: ["website", "header-portal-session"],
    queryFn: async () => {
      const [me, self] = await Promise.all([portalApi.me(), portalApi.selfProfile()]);
      return { me, self };
    },
    enabled: isLoggedIn && !portalChrome,
    staleTime: 60_000,
    retry: false,
  });

  const portalHref = portalDashboardHrefForRole(portalSession?.me.role);
  const displayName = portalSession?.self?.name?.trim() || portalSession?.me.name?.trim() || "Account";
  const avatarUrl =
    (portalSession?.self?.logo_url || portalSession?.self?.avatar_url)?.trim() || null;

  const searchTrigger = (
    <button
      type="button"
      onClick={() => setIsSearchOpen(true)}
      className="w-full search-bar cursor-pointer"
    >
      <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-left text-sm text-muted-foreground">
        {searchPlaceholders.length > 0 ? (
          <>Search for &quot;{hint}&quot;</>
        ) : (
          <>Search {hint}</>
        )}
      </span>
    </button>
  );

  const cartButton = (
    <button
      type="button"
      onClick={() => setIsCartOpen(true)}
      className="relative flex shrink-0 items-center gap-2 px-2 md:px-3 py-2 rounded-full hover:bg-primary/10 transition-colors"
    >
      <ShoppingCart className="w-5 h-5 text-foreground" />
      <span className="hidden md:inline text-sm font-medium">Cart</span>
      {cartCount > 0 && (
        <span className="cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
      )}
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/60 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16 gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
              {portalChrome ? (
                <Sheet open={portalChrome.mobileMenuOpen} onOpenChange={portalChrome.setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 lg:hidden"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    {portalChrome.sidebar}
                  </SheetContent>
                </Sheet>
              ) : null}
              <Link to="/" className="flex-shrink-0">
                <img src={logo} alt="Khudra Pasal" className="h-8 md:h-12 w-auto object-contain" />
              </Link>
              <button
                type="button"
                className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-primary/10 transition-colors text-sm"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground whitespace-nowrap">Select Location</span>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="hidden md:flex md:flex-1 md:justify-center min-w-0 max-w-2xl mx-2 md:mx-6">
              {searchTrigger}
            </div>

            <div className="flex max-w-[min(100%,50vw)] flex-wrap items-center justify-end gap-1 sm:gap-2 shrink-0 sm:max-w-none">
              {isLoggedIn ? (
                portalChrome ? (
                  <>
                    <div className="flex max-w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
                      {portalChrome.toolbar}
                    </div>
                    {cartButton}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setLogoutOpen(true)}
                      className="hidden sm:inline px-2 md:px-3 py-2 rounded-full hover:bg-primary/10 transition-colors text-sm font-medium text-foreground"
                    >
                      Logout
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoutOpen(true)}
                      className="sm:hidden p-2 rounded-full hover:bg-primary/10 text-muted-foreground"
                      aria-label="Logout"
                    >
                      <User className="w-5 h-5" />
                    </button>
                    {portalSessionLoading ? (
                      <div
                        className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-1.5 py-1"
                        aria-hidden
                      >
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="hidden sm:block h-3.5 w-20 max-w-[8rem] rounded bg-muted animate-pulse" />
                      </div>
                    ) : portalSessionError ? (
                      <Link
                        to="/portal/dashboard"
                        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 pl-1 pr-2 sm:pr-3 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Open your account"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/50">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <span className="hidden sm:inline text-sm font-medium text-foreground">Account</span>
                      </Link>
                    ) : (
                      <Link
                        to={portalHref}
                        className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-1.5 py-1 pl-1 pr-2 sm:pr-3 max-w-[min(220px,42vw)] hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Open your account — ${displayName}`}
                      >
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initialsFromName(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline text-sm font-medium text-foreground truncate min-w-0">
                          {displayName}
                        </span>
                      </Link>
                    )}
                    {cartButton}
                  </>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openLoginSheet}
                    className="hidden sm:inline px-2 md:px-3 py-2 rounded-full hover:bg-primary/10 transition-colors text-sm font-medium text-foreground"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={openSignupSheet}
                    className="hidden sm:inline px-2 md:px-3 py-2 rounded-full hover:bg-primary/10 transition-colors text-sm font-medium text-foreground"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={openLoginSheet}
                    className="sm:hidden p-2 rounded-full hover:bg-primary/10 text-muted-foreground"
                    aria-label="Sign in"
                  >
                    <User className="w-5 h-5" />
                  </button>
                  {cartButton}
                </>
              )}
            </div>
          </div>

          <div className="md:hidden pb-2 pt-0">{searchTrigger}</div>
        </div>
      </header>

      <SearchDropdown
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
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

export default Header;
