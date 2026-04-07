import React, { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { extractResults, vendorApi, websiteApi } from '@/lib/api';
import { detectApiPlatformFromVideoUrl } from '../api/reelMappers';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, X, ChevronDown } from 'lucide-react';
import VideoPreviewCard from './VideoPreviewCard';
import ReelsButton from '../shared/ReelsButton';
import { cn } from '@/lib/utils';
import '../reels-theme.css';

const platforms = [
  { icon: '▶', label: 'YouTube Shorts' },
  { icon: '♪', label: 'TikTok' },
  { icon: '📷', label: 'Instagram' },
  { icon: '🎬', label: 'Direct MP4' },
];

export type ReelUploadFormProps = {
  vendorId?: string | null;
  onPublished?: () => void;
  /** Use vendor portal light theme (matches AdminLayout). */
  variant?: 'standalone' | 'portal';
};

const ReelUploadForm: React.FC<ReelUploadFormProps> = ({ vendorId, onPublished, variant = 'standalone' }) => {
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [autoThumb, setAutoThumb] = useState(true);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [thumbExpanded, setThumbExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: catalogPage } = useQuery({
    queryKey: ['reel-upload-catalog-products', vendorId],
    queryFn: () =>
      vendorId
        ? vendorApi.products({ page_size: 120 })
        : websiteApi.products({ page_size: 120 }),
  });

  const catalogProducts = useMemo(() => {
    if (vendorId) {
      return extractResults<Record<string, unknown>>(catalogPage).map((p) => ({
        id: Number(p.id),
        name: String(p.name),
        price: Number(p.price ?? 0),
        image: String(p.image_url || '/placeholder.svg'),
      }));
    }
    return (catalogPage?.results || []).map((p) => ({
      id: p.id as number,
      name: p.name,
      price: Number(p.price || 0),
      image: p.image_url || '/placeholder.svg',
    }));
  }, [catalogPage, vendorId]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handlePublish = async () => {
    if (vendorId) {
      if (!videoUrl.trim() && !videoFile) return;
      setPublishing(true);
      try {
        const fd = new FormData();
        if (videoFile) fd.append('video', videoFile);
        if (videoUrl.trim()) fd.append('video_url', videoUrl.trim());
        fd.append('caption', caption);
        const platform = videoFile ? 'direct_mp4' : detectApiPlatformFromVideoUrl(videoUrl);
        fd.append('platform', platform);
        fd.append('status', 'active');
        if (tags.length) fd.append('tags', tags.join(','));
        if (selectedProduct) fd.append('product_id', String(selectedProduct));
        const thumbEl = fileInputRef.current?.files?.[0];
        if (thumbEl && !autoThumb) fd.append('thumbnail', thumbEl);
        await vendorApi.createReel(fd);
        void queryClient.invalidateQueries({ queryKey: ['vendor', 'reels'] });
        void queryClient.invalidateQueries({ queryKey: ['website', 'my-reels'] });
        setPublished(true);
        setShowConfetti(true);
        onPublished?.();
        setTimeout(() => {
          setShowConfetti(false);
          setPublished(false);
        }, 2500);
      } catch (e) {
        console.error(e);
      } finally {
        setPublishing(false);
      }
      return;
    }
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setPublished(false);
      }, 3000);
    }, 1500);
  };

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setThumbPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const selectedProd = catalogProducts.find(p => p.id === selectedProduct);
  const filteredProducts = catalogProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <motion.div
      className={cn('rounded-2xl p-6 space-y-6 relative overflow-hidden', variant === 'portal' && 'vendor-reels-light')}
      style={{ background: 'var(--reels-card)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && (
          <>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full z-50"
                style={{ background: ['var(--reels-accent)', 'var(--reels-gold)', '#4CAF50'][i], left: `${30 + i * 20}%`, top: '30%' }}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: [0, -80, 40], x: [(i - 1) * 20, (i - 1) * 60], opacity: [1, 1, 0], scale: [1, 1.5, 0.5], rotate: [0, 360] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <h3 className="reels-font-display font-bold text-xl reels-ui-text">Upload New Reel</h3>

      {/* Step 1: Video URL */}
      <div>
        <label className="reels-font-body text-sm font-medium reels-ui-text block mb-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2"
            style={{ background: 'var(--reels-accent)', color: 'var(--reels-step-on-accent)' }}
          >
            1
          </span>
          Paste your product video link
        </label>
        <input
          type="text"
          value={videoUrl}
          onChange={e => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/shorts/... or video.mp4"
          className="w-full rounded-xl px-4 py-3 reels-font-body text-sm reels-ui-text outline-none focus:ring-2 transition-all placeholder:text-[color:var(--reels-text-muted)]"
          style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {platforms.map(p => (
            <span key={p.label} className="reels-font-body text-[11px] px-2 py-1 rounded-full" style={{ background: 'var(--reels-glass)', color: 'var(--reels-text-secondary)' }}>
              {p.icon} {p.label}
            </span>
          ))}
        </div>
        {vendorId && (
          <div className="mt-3">
            <label className="reels-font-body text-xs block mb-1" style={{ color: 'var(--reels-text-muted)' }}>
              Or upload video file
            </label>
            <input
              type="file"
              accept="video/*"
              className="text-xs reels-ui-text w-full file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}
        <div className="mt-3">
          <VideoPreviewCard url={videoUrl} />
        </div>
      </div>

      {/* Step 2: Product Selection with searchable dropdown */}
      <div>
        <label className="reels-font-body text-sm font-medium reels-ui-text block mb-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2"
            style={{ background: 'var(--reels-accent)', color: 'var(--reels-step-on-accent)' }}
          >
            2
          </span>
          Select product to feature
        </label>

        {/* Selected product card */}
        {selectedProd && (
          <motion.div
            className="flex items-center gap-3 p-3 rounded-xl mb-3"
            style={{ background: 'var(--reels-accent)', border: '1px solid var(--reels-accent)' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <img src={selectedProd.image} alt={selectedProd.name} className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <p className="reels-font-body text-sm text-white font-medium">{selectedProd.name}</p>
              <p className="reels-font-mono text-xs text-white/80">NPR {selectedProd.price.toLocaleString()}</p>
            </div>
            <button onClick={() => setSelectedProduct(null)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Searchable dropdown */}
        <div className="relative">
          <div
            className="w-full flex items-center gap-2 rounded-xl px-4 py-3 cursor-pointer"
            style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
            onClick={() => setProductDropdownOpen(!productDropdownOpen)}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--reels-text-muted)' }} />
            <input
              type="text"
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setProductDropdownOpen(true); }}
              placeholder={selectedProd ? 'Change product...' : 'Search products...'}
              className="flex-1 bg-transparent reels-font-body text-sm reels-ui-text outline-none placeholder:text-[color:var(--reels-text-muted)]"
              onClick={e => { e.stopPropagation(); setProductDropdownOpen(true); }}
            />
            <ChevronDown className={`w-4 h-4 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--reels-text-muted)' }} />
          </div>

          <AnimatePresence>
            {productDropdownOpen && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 max-h-[200px] overflow-y-auto"
                style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {filteredProducts.length === 0 ? (
                  <p className="p-3 reels-font-body text-xs text-center" style={{ color: 'var(--reels-text-muted)' }}>No products found</p>
                ) : (
                  filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p.id); setProductDropdownOpen(false); setProductSearch(''); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                    >
                      <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg" />
                      <div className="text-left flex-1">
                        <p className="reels-font-body text-sm reels-ui-text">{p.name}</p>
                        <p className="reels-font-mono text-xs" style={{ color: 'var(--reels-gold)' }}>NPR {p.price.toLocaleString()}</p>
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Step 3: Caption & Tags */}
      <div>
        <label className="reels-font-body text-sm font-medium reels-ui-text block mb-2">
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2"
            style={{ background: 'var(--reels-accent)', color: 'var(--reels-step-on-accent)' }}
          >
            3
          </span>
          Caption & Tags
        </label>
        <div className="relative">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value.slice(0, 200))}
            placeholder="Write a caption..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 reels-font-body text-sm reels-ui-text outline-none resize-none placeholder:text-[color:var(--reels-text-muted)]"
            style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
          />
          <span className="absolute bottom-2 right-3 reels-font-mono text-[10px]" style={{ color: caption.length >= 180 ? 'var(--reels-accent)' : 'var(--reels-text-muted)' }}>
            {caption.length}/200
          </span>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tags (press Enter)"
            className="w-full rounded-xl px-4 py-2.5 reels-font-body text-sm reels-ui-text outline-none placeholder:text-[color:var(--reels-text-muted)]"
            style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag, i) => (
              <motion.span
                key={i}
                className="reels-font-body text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'var(--reels-glass)', color: 'var(--reels-text-secondary)' }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((_, j) => j !== i))}
                  className="ml-0.5 opacity-50 hover:opacity-100"
                  style={{ color: 'var(--reels-text-primary)' }}
                >
                  ×
                </button>
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* Step 4: Thumbnail (collapsible) */}
      <div>
        <button
          onClick={() => setThumbExpanded(!thumbExpanded)}
          className="w-full flex items-center justify-between mb-2"
        >
          <label className="reels-font-body text-sm font-medium reels-ui-text flex items-center pointer-events-none">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-2"
              style={{ background: 'var(--reels-accent)', color: 'var(--reels-step-on-accent)' }}
            >
              4
            </span>
            Thumbnail <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--reels-glass)', color: 'var(--reels-text-muted)' }}>Optional</span>
          </label>
          <ChevronDown className={`w-4 h-4 transition-transform ${thumbExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--reels-text-muted)' }} />
        </button>

        <AnimatePresence>
          {thumbExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <span className="reels-font-body text-xs" style={{ color: 'var(--reels-text-secondary)' }}>Auto-generate from video</span>
                <div className="relative w-10 h-5 rounded-full cursor-pointer transition-colors" style={{ background: autoThumb ? 'var(--reels-accent)' : 'var(--reels-glass)' }} onClick={() => setAutoThumb(!autoThumb)}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoThumb ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
              {!autoThumb && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} />
                  {thumbPreview ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--reels-surface)' }}>
                      <img src={thumbPreview} alt="Thumbnail preview" className="w-full h-40 object-cover" />
                      <button onClick={() => { setThumbPreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white text-xs">×</button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-white/20 transition-colors"
                      style={{ borderColor: 'var(--reels-glass-border)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8" style={{ color: 'var(--reels-text-muted)' }} />
                      <span className="reels-font-body text-xs" style={{ color: 'var(--reels-text-muted)' }}>Drag & drop or click to upload</span>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit */}
      <ReelsButton
        variant="primary"
        fullWidth
        onClick={handlePublish}
        loading={publishing}
        disabled={vendorId ? !videoUrl.trim() && !videoFile : !videoUrl || !selectedProduct}
        className="text-base py-3"
      >
        {published ? '✅ Reel Published!' : publishing ? 'Publishing...' : '🚀 Publish Reel'}
      </ReelsButton>
    </motion.div>
  );
};

export default ReelUploadForm;
