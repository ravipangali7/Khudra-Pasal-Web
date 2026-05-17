import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useParams } from "react-router-dom";
import { ChildShoppingRulesProvider } from "@/contexts/ChildShoppingRulesContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import { AuthUiProvider } from "@/contexts/AuthUiContext";
import FcmForegroundListener from "@/components/FcmForegroundListener";
import FcmTokenRegistrar from "@/components/FcmTokenRegistrar";
import ScrollToTopOnNavigate from "@/components/ScrollToTopOnNavigate";
import WebPromoLayer from "@/components/layout/WebPromoLayer";
import AppPromoNativeClaim from "@/components/AppPromoNativeClaim";
import StoreSiteScripts from "@/components/StoreSiteScripts";
import RouteFallback from "@/components/RouteFallback";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Checkout from "./pages/Checkout";
import ProductDetail from "./pages/ProductDetail";
import Category from "./pages/Category";
import Brands from "./pages/Brands";
import BrandDetail from "./pages/BrandDetail";
import Blog from "./pages/Blog";
import BlogPostDetail from "./pages/BlogPostDetail";
import CmsPublicPage from "./pages/CmsPublicPage";
import ProductListing from "./pages/ProductListing";
import NotFound from "./pages/NotFound";
import VendorStorePage from "./pages/VendorStorePage";
import { getApiErrorHttpStatus } from "@/lib/api";

const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const FamilyPortal = lazy(() => import("./pages/FamilyPortal"));
const ChildPortal = lazy(() => import("./pages/ChildPortal"));
const JoinFamilyPage = lazy(() => import("./pages/JoinFamilyPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const VendorPortal = lazy(() => import("./pages/vendor/VendorPortal"));
const ReelsFeedPage = lazy(() => import("./modules/reels/feed/ReelsFeedPage"));
const VendorReelsPage = lazy(() => import("./modules/reels/vendor/VendorReelsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const s = getApiErrorHttpStatus(error);
        if (s === 401 || s === 403) return false;
        return failureCount < 3;
      },
    },
  },
});

const RESERVED_LEGACY_PRODUCT_SEGMENTS = new Set([
  "trending",
  "flash-deals",
  "latest",
  "discounted",
  "category",
  "all",
]);

/** Old `/products/:slug` bookmarks → `/category/:slug` (explicit routes handle section slugs first). */
function LegacyProductsCategoryRedirect() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const slug = categoryId ?? "";
  if (slug === "" || slug === "all") {
    return <Navigate to="/products" replace />;
  }
  if (RESERVED_LEGACY_PRODUCT_SEGMENTS.has(slug)) {
    return <Navigate to="/products" replace />;
  }
  return <Navigate to={`/category/${encodeURIComponent(slug)}`} replace />;
}

function LegacyProductsCategoryPathRedirect() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const slug = categoryId ?? "";
  if (!slug || slug === "all") return <Navigate to="/products" replace />;
  return <Navigate to={`/category/${encodeURIComponent(slug)}`} replace />;
}

/** Relative links like `join-family/:token` from `/family-portal/*` resolve here; normalize to the real join route. */
function FamilyPortalJoinFamilyRedirect() {
  const { token } = useParams<{ token: string }>();
  const t = token?.trim() ?? "";
  if (!t) return <Navigate to="/family-portal/dashboard" replace />;
  return <Navigate to={`/join-family/${encodeURIComponent(t)}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <ChildShoppingRulesProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <AuthUiProvider>
            <ScrollToTopOnNavigate />
            <WebPromoLayer />
            <AppPromoNativeClaim />
            <StoreSiteScripts />
            <FcmTokenRegistrar />
            <FcmForegroundListener />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/homepage" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/product/:identifier" element={<ProductDetail />} />
              <Route path="/category/:categoryId" element={<Category />} />
              <Route path="/brands/:brandId" element={<BrandDetail />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/products" element={<ProductListing />} />
              <Route path="/products/trending" element={<ProductListing />} />
              <Route path="/products/flash-deals" element={<ProductListing />} />
              <Route path="/products/latest" element={<ProductListing />} />
              <Route path="/products/discounted" element={<ProductListing />} />
              <Route path="/products/category/:categoryId" element={<LegacyProductsCategoryPathRedirect />} />
              <Route path="/products/:categoryId" element={<LegacyProductsCategoryRedirect />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPostDetail />} />
              <Route path="/page/:slug" element={<CmsPublicPage />} />
              <Route path="/discounted-product" element={<Navigate to="/products/discounted" replace />} />
              <Route path="/deals" element={<Navigate to="/products/discounted" replace />} />
              <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="/portal/*" element={<CustomerPortal />} />
              <Route path="/family-portal" element={<Navigate to="/family-portal/dashboard" replace />} />
              <Route
                path="/family-portal/join-family/:token"
                element={<FamilyPortalJoinFamilyRedirect />}
              />
              <Route path="/family-portal/*" element={<FamilyPortal />} />
              <Route path="/child-portal" element={<Navigate to="/child-portal/dashboard" replace />} />
              <Route path="/child-portal/*" element={<ChildPortal />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/*" element={<SuperAdminDashboard />} />
              <Route path="/vendor/*" element={<VendorPortal />} />
              <Route path="/join-family/:token" element={<JoinFamilyPage />} />
              <Route path="/reels" element={<ReelsFeedPage />} />
              <Route path="/store/:slug" element={<VendorStorePage />} />
              <Route path="/vendor/reels" element={<VendorReelsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <CartDrawer />
          </AuthUiProvider>
        </CartProvider>
        </ChildShoppingRulesProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
