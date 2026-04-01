import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Share2, Heart, Star, Minus, Plus, ShoppingCart, MessageCircle, ChevronRight, ChevronDown, Sparkles, Grid3X3, Shield, Gift } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import ScrollToTop from '@/components/ui/ScrollToTop';
import AIChatbot from '@/components/chat/AIChatbot';
import ProductCard from '@/components/product/ProductCard';
import FrequentlyBoughtTogether from '@/components/sections/FrequentlyBoughtTogether';
import CategoryFloatingSidebar from '@/components/sections/CategoryFloatingSidebar';
import {
  AIInfoPopup,
  SimilarItemsPopup,
  WarrantyPopup,
  VariantSelector,
} from '@/components/product/ProductDetailPopups';
import { useCart } from '@/contexts/CartContext';
import {
  clearAllAuthTokens,
  getApiErrorHttpStatus,
  getAuthToken,
  getLoginSurface,
  mapWebsiteProductToUi,
  websiteApi,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PRODUCT_DESCRIPTION_FALLBACK =
  'Premium quality product sourced from trusted vendors. This product comes with quality assurance and is perfect for your daily needs. Experience the difference with KhudraPasal.';

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { identifier } = useParams();
  const [hasWebsiteSession, setHasWebsiteSession] = useState(() => Boolean(getAuthToken()));
  const [loginSurface, setLoginSurface] = useState(() => getLoginSurface());
  useEffect(() => {
    const sync = () => {
      setHasWebsiteSession(Boolean(getAuthToken()));
      setLoginSurface(getLoginSurface());
    };
    sync();
    window.addEventListener('khudra-auth-changed', sync);
    return () => window.removeEventListener('khudra-auth-changed', sync);
  }, []);
  const { data: detailData } = useQuery({
    queryKey: ['product-detail', identifier, hasWebsiteSession],
    queryFn: () => websiteApi.productDetail(identifier || ''),
    enabled: Boolean(identifier),
  });
  const queryClient = useQueryClient();
  const { data: reviewRows = [] } = useQuery({
    queryKey: ['product-reviews', identifier],
    queryFn: () => websiteApi.productReviews(identifier || ''),
    enabled: Boolean(identifier),
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const reviewMutation = useMutation({
    mutationFn: () =>
      websiteApi.submitProductReview(identifier || '', { rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      setReviewMsg({ type: 'ok', text: 'Thank you! Your review was submitted and is pending moderation.' });
      setReviewComment('');
      queryClient.invalidateQueries({ queryKey: ['product-reviews', identifier] });
      queryClient.invalidateQueries({ queryKey: ['product-detail', identifier] });
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : 'Could not submit review.';
      setReviewMsg({ type: 'err', text: msg });
    },
  });
  const isWebsiteCustomerSession = hasWebsiteSession && (loginSurface === null || loginSurface === 'portal');
  const canSubmitReview = Boolean(
    isWebsiteCustomerSession && identifier && detailData?.can_submit_review === true,
  );
  const loginRedirectPath = useMemo(
    () => `${window.location.pathname}${window.location.search}`,
    [],
  );
  const redirectToLogin = () => {
    navigate(`/login?next=${encodeURIComponent(loginRedirectPath)}`);
  };
  const requireAuth = () => {
    if (isWebsiteCustomerSession) return true;
    redirectToLogin();
    return false;
  };
  useEffect(() => {
    if (!detailData?.slug || !identifier) return;
    if (identifier === detailData.slug) return;
    navigate(`/product/${encodeURIComponent(detailData.slug)}`, { replace: true });
  }, [detailData?.slug, identifier, navigate]);
  const product = detailData
    ? mapWebsiteProductToUi(detailData)
    : {
        id: '0',
        slug: '',
        name: 'Loading product',
        description: '',
        price: 0,
        image: '',
        category: 'all',
        inStock: false,
      };
  const { data: relatedData } = useQuery({
    queryKey: ['related-products', product?.category],
    queryFn: () => websiteApi.products({ category: product?.category, page_size: 12 }),
    enabled: Boolean(detailData && product?.category && product.category !== 'all'),
  });
  const { data: storeInfo } = useQuery({
    queryKey: ['website', 'store-info'],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 60_000,
  });
  const { addToCart, getItemQuantity, updateQuantity, cartCount } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'highlights' | 'details' | 'info'>('highlights');
  
  // Popup states
  const [showAIInfo, setShowAIInfo] = useState(false);
  const [showSimilarItems, setShowSimilarItems] = useState(false);
  const [showWarranty, setShowWarranty] = useState(false);
  
  // Variant selection
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const quantity = getItemQuantity(product.id);
  const isInCart = quantity > 0;
  const { data: wishlistRows = [], isLoading: isWishlistLoading } = useQuery({
    queryKey: ['product-wishlist'],
    queryFn: () => websiteApi.wishlist(),
    enabled: hasWebsiteSession,
  });
  const isWishlisted = useMemo(
    () => wishlistRows.some((row) => String(row.product.id) === product.id),
    [wishlistRows, product.id],
  );
  const wishlistMutation = useMutation({
    mutationFn: () => {
      if (!requireAuth()) {
        throw new Error('Authentication required.');
      }
      return isWishlisted
        ? websiteApi.removeWishlistItem(product.id)
        : websiteApi.addWishlistItem(product.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-wishlist'] });
    },
    onError: (error: unknown) => {
      if (getApiErrorHttpStatus(error) === 401) {
        clearAllAuthTokens();
        redirectToLogin();
      }
    },
  });
  const relatedProducts = (relatedData?.results || []).map(mapWebsiteProductToUi);

  const productImages = useMemo(() => {
    if (!detailData) return product.image ? [product.image] : ['/placeholder.svg'];
    const primary = (detailData.image_url || '').trim();
    const gallery = (detailData.images || []).map((i) => i.image_url).filter(Boolean);
    const merged = [primary, ...gallery].filter(Boolean);
    const uniq = [...new Set(merged)];
    return uniq.length ? uniq : ['/placeholder.svg'];
  }, [detailData, product.image]);

  // Related products (same leaf category, lower price - for "Frequently Bought Together")
  const frequentlyBought = useMemo(
    () =>
      relatedProducts
        .filter((p) => p.category === product.category && p.id !== product.id && p.price < product.price)
        .slice(0, 3),
    [product, relatedProducts],
  );

  // Similar products for popup
  const similarProducts = useMemo(() => 
    relatedProducts
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4),
  [product, relatedProducts]);

  // Free item (BOGO logic - lower priced item in same category)
  const freeItem = useMemo(() => {
    if (product.price > 1000) {
      return relatedProducts.find(p => 
        p.category === product.category && 
        p.id !== product.id && 
        p.price < product.price * 0.2
      );
    }
    return undefined;
  }, [product, relatedProducts]);

  const variants = useMemo(() => [] as { label: string; options: string[] }[], []);

  const sidebarCategories: { id: string; name: string }[] = [];

  const faqs = useMemo(
    () => [
      {
        question: 'Returns & support',
        answer:
          'Return and warranty policies depend on the seller and product type. Contact Khudra Pasal support from your order details for help.',
      },
    ],
    [],
  );

  const reviews = useMemo(
    () =>
      reviewRows.map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        comment: r.comment,
        date: new Date(r.date).toLocaleDateString(),
      })),
    [reviewRows],
  );

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} at Khudra Pasal`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const handleWhatsApp = () => {
    const message = `Hi! I'm interested in ${product.name} priced at Rs. ${product.price}. Is it available?`;
    const footerPhone = storeInfo?.phone || '+977 9858047858';
    const whatsappNumber = footerPhone.replace(/\D/g, '') || '9779858047858';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleVariantChange = (label: string, value: string) => {
    setSelectedVariants(prev => ({ ...prev, [label]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header cartCount={cartCount} />

      {/* Floating Category Sidebar */}
      <CategoryFloatingSidebar
        categories={sidebarCategories}
        activeId={product.category}
      />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/category/${product.category}`} className="hover:text-foreground capitalize">{product.category}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>
      </div>

      <main className="container mx-auto px-4 py-4">
        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-card rounded-2xl overflow-hidden border border-border">
              {/* AI Info Button - Left */}
              <button
                onClick={() => setShowAIInfo(true)}
                className="absolute top-4 left-4 z-10 p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full text-white hover:opacity-90 transition-opacity shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Similar Items Button - Right */}
              <button
                onClick={() => setShowSimilarItems(true)}
                className="absolute top-4 right-14 z-10 p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full text-white hover:opacity-90 transition-opacity shadow-lg"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>

              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.discount && (
                <span className="absolute bottom-4 left-4 px-3 py-1 bg-category-fresh text-white text-sm font-bold rounded-lg">
                  {product.discount}% OFF
                </span>
              )}
              
              {/* Free Item Badge */}
              {freeItem && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-category-fresh text-white rounded-lg">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-bold">FREE GIFT!</span>
                </div>
              )}

              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2 bg-card/80 backdrop-blur-sm rounded-full hover:bg-card transition-colors"
              >
                <Share2 className="w-5 h-5 text-foreground" />
              </button>
            </div>
            
            {/* Thumbnail Gallery */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {productImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors",
                    selectedImage === index ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              {product.unit && (
                <p className="text-muted-foreground">{product.unit}</p>
              )}
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 px-3 py-1 bg-category-fresh/10 rounded-lg">
                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                  <span className="font-semibold text-foreground">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">
                  {product.reviewCount?.toLocaleString()} reviews
                </span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-foreground">
                  Rs. {product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    Rs. {product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              {product.discount && (
                <span className="inline-block px-3 py-1 bg-category-fresh/15 text-category-fresh text-sm font-semibold rounded-lg">
                  You save Rs. {(product.originalPrice! - product.price).toLocaleString()}
                </span>
              )}
            </div>

            {/* Warranty Button */}
            <button
              onClick={() => setShowWarranty(true)}
              className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl w-full hover:bg-muted/80 transition-colors"
            >
              <Shield className="w-5 h-5 text-category-fresh" />
              <span className="font-medium text-foreground">Warranty & Guarantee</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>

            {/* Variant Selector */}
            {variants.length > 0 && (
              <VariantSelector
                variants={variants}
                selected={selectedVariants}
                onChange={handleVariantChange}
              />
            )}

            {/* Tabs: Highlights | Product Details | Information */}
            <div className="border-b border-border">
              <div className="flex gap-4">
                {['highlights', 'details', 'info'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSection(tab as typeof activeSection)}
                    className={cn(
                      "pb-3 text-sm font-medium capitalize border-b-2 transition-colors",
                      activeSection === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === 'info' ? 'Information' : tab === 'details' ? 'Product Details' : 'Highlights'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[100px]">
              {activeSection === 'highlights' && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {(detailData?.short_description ?? '').trim() || PRODUCT_DESCRIPTION_FALLBACK}
                </p>
              )}
              {activeSection === 'details' && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {(detailData?.description ?? '').trim() || PRODUCT_DESCRIPTION_FALLBACK}
                </p>
              )}
              {activeSection === 'info' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-foreground capitalize">{product.categoryName || product.category}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Parent category</span>
                    <span className="text-foreground">{product.parentCategoryName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="text-foreground">{product.unit || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">In Stock</span>
                    <span className={product.inStock !== false ? "text-category-fresh" : "text-destructive"}>
                      {product.inStock !== false ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart */}
            <div className="flex items-center gap-4">
              {isInCart ? (
                <div className="flex items-center bg-category-fresh rounded-xl overflow-hidden">
                  <button
                    onClick={() => {
                      if (!requireAuth()) return;
                      updateQuantity(product.id, quantity - 1);
                    }}
                    className="p-3 text-white hover:bg-white/20 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="px-6 text-white font-bold text-lg">{quantity}</span>
                  <button
                    onClick={() => {
                      if (!requireAuth()) return;
                      updateQuantity(product.id, quantity + 1);
                    }}
                    className="p-3 text-white hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!requireAuth()) return;
                    addToCart(product);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              )}
              
              <button
                onClick={() => {
                  if (!requireAuth()) return;
                  wishlistMutation.mutate();
                }}
                disabled={isWishlistLoading || wishlistMutation.isPending}
                className="p-3 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-60"
              >
                <Heart className={cn("w-5 h-5", isWishlisted ? "fill-amber-500 text-amber-500" : "text-muted-foreground")} />
              </button>
              <button
                onClick={() => {
                  if (!requireAuth()) return;
                  navigate('/checkout', { state: { from: `${location.pathname}${location.search}` } });
                }}
                className="p-3 border border-border rounded-xl hover:bg-muted transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* WhatsApp Button */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-5 h-5" />
              Instant Shop via WhatsApp
            </button>
          </div>
        </div>

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether
          mainProduct={product}
          relatedProducts={frequentlyBought}
          freeItem={freeItem}
          mainQuantity={Math.max(1, quantity)}
          onRequireAuth={requireAuth}
        />

        {/* Reviews */}
        <section className="my-12">
          <h2 className="text-xl font-bold text-foreground mb-4">Customer Reviews</h2>
          {canSubmitReview ? (
            <div className="mb-6 p-4 rounded-xl border border-border bg-card space-y-3 max-w-lg">
              <p className="text-sm font-medium text-foreground">Write a review</p>
              <div>
                <Label className="text-xs">Rating</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 h-9 w-24"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <Textarea
                  className="mt-1 min-h-[80px]"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product…"
                />
              </div>
              {reviewMsg ? (
                <p className={cn('text-sm', reviewMsg.type === 'ok' ? 'text-emerald-600' : 'text-destructive')}>
                  {reviewMsg.text}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={reviewMutation.isPending}
                onClick={() => {
                  if (!requireAuth()) return;
                  setReviewMsg(null);
                  reviewMutation.mutate();
                }}
              >
                Submit review
              </Button>
            </div>
          ) : null}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : null}
            {reviews.map((review) => (
              <div key={review.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-primary">{review.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < review.rating ? "fill-current text-yellow-500" : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform",
                      expandedFaq === index && "rotate-180"
                    )}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 text-muted-foreground animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* You May Also Like */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-4">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similarProducts.map((item) => (
              <ProductCard key={item.id} product={item} categoryTheme={item.category} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
      <AIChatbot />
      <MobileFooterNav />

      {/* Popups */}
      <AIInfoPopup
        product={product}
        isOpen={showAIInfo}
        onClose={() => setShowAIInfo(false)}
      />
      <SimilarItemsPopup
        product={product}
        similarProducts={similarProducts}
        isOpen={showSimilarItems}
        onClose={() => setShowSimilarItems(false)}
      />
      <WarrantyPopup
        isOpen={showWarranty}
        onClose={() => setShowWarranty(false)}
      />
    </div>
  );
};

export default ProductDetail;
