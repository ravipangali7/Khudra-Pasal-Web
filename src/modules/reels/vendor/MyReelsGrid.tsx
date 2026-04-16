import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, MoreVertical, Edit, Pause, Trash2, Eye, Heart, MessageCircle, Zap, Search, X, ChevronDown } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReelStatusBadge from './ReelStatusBadge';
import BoostModal from './BoostModal';
import type { Reel } from '../types';
import { extractResults, vendorApi, websiteApiReelsPreferDirectMp4 } from '@/lib/api';
import { detectApiPlatformFromVideoUrl, mapApiReelToUi, mapUiPlatformToApi } from '../api/reelMappers';
import { useReelsQueryAuthRev } from '../feed/useReelsQueryAuthRev';
import { useVendorReelViewer } from './VendorReelViewerContext';
import { cn } from '@/lib/utils';
import { formatApiError } from '@/pages/admin/hooks/adminFormUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import '../reels-theme.css';

const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();

const REEL_PLATFORMS: { value: string; label: string }[] = [
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'direct_mp4', label: 'Direct MP4' },
];

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <motion.div
    className="rounded-xl p-4 text-center"
    style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-border)' }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <p className="reels-font-mono text-xl font-bold" style={{ color: 'var(--reels-gold)' }}>{typeof value === 'number' ? formatCount(value) : value}</p>
    <p className="reels-font-body text-[11px]" style={{ color: 'var(--reels-text-muted)' }}>{label}</p>
  </motion.div>
);

type MyReelsGridProps = {
  onNewReel: () => void;
  /** When set, loads reels for this vendor (numeric id). */
  vendorId?: string | null;
  /** When set (and no vendorId), filters by store slug. */
  vendorSlug?: string | null;
  /** Use authenticated /vendor/reels/ API (vendor portal). */
  useVendorPortal?: boolean;
};

const MyReelsGrid: React.FC<MyReelsGridProps> = ({ onNewReel, vendorId, vendorSlug, useVendorPortal }) => {
  const reelViewer = useVendorReelViewer();
  const queryClient = useQueryClient();
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostReel, setBoostReel] = useState<Reel | null>(null);
  const canBoost = Boolean(useVendorPortal);

  const slug = vendorSlug ?? (import.meta.env.VITE_DEV_VENDOR_SLUG as string | undefined) ?? null;
  const id = vendorId ?? null;
  const enabled = Boolean(useVendorPortal || slug || id);
  const reelsAuthRev = useReelsQueryAuthRev();

  const wrapPortal = (node: React.ReactNode) =>
    useVendorPortal ? <div className="vendor-reels-light">{node}</div> : node;

  const invalidateReelQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['vendor', 'reels'] });
    void queryClient.invalidateQueries({ queryKey: ['website', 'my-reels'] });
  };

  const delMut = useMutation({
    mutationFn: (reelPk: string) => vendorApi.deleteReel(reelPk),
    onSuccess: () => {
      invalidateReelQueries();
      setDeleteConfirmOpen(false);
      setDeleteReel(null);
    },
    onError: (e: Error) => toast.error(formatApiError(e)),
  });

  const pauseResumeMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      vendorApi.updateReel(id, { status }),
    onSuccess: () => {
      invalidateReelQueries();
      setPauseConfirmOpen(false);
      setPauseReel(null);
    },
    onError: (e: Error) => toast.error(formatApiError(e)),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editReel, setEditReel] = useState<Reel | null>(null);
  const [editCaptionDraft, setEditCaptionDraft] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [editProductSearch, setEditProductSearch] = useState('');
  const [editProductDropdownOpen, setEditProductDropdownOpen] = useState(false);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editPlatformApi, setEditPlatformApi] = useState('direct_mp4');
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseReel, setPauseReel] = useState<Reel | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReel, setDeleteReel] = useState<Reel | null>(null);

  const { data: editCatalogPage } = useQuery({
    queryKey: ['vendor', 'products', 'reel-edit-grid'],
    enabled: Boolean(useVendorPortal && editOpen),
    queryFn: () => vendorApi.products({ page_size: 120 }),
  });

  const editCatalogProducts = useMemo(() => {
    return extractResults<Record<string, unknown>>(editCatalogPage).map((p) => ({
      id: Number(p.id),
      name: String(p.name),
      price: Number(p.price ?? 0),
      image: String(p.image_url || '/placeholder.svg'),
    }));
  }, [editCatalogPage]);

  const selectedEditProduct = editCatalogProducts.find((p) => p.id === editProductId);
  const filteredEditProducts = editCatalogProducts.filter((p) =>
    p.name.toLowerCase().includes(editProductSearch.toLowerCase()),
  );

  const resetEditForm = () => {
    setEditReel(null);
    setEditCaptionDraft('');
    setEditTags([]);
    setEditTagInput('');
    setEditProductId(null);
    setEditProductSearch('');
    setEditProductDropdownOpen(false);
    setEditVideoUrl('');
    setEditPlatformApi('direct_mp4');
    setEditThumbFile(null);
  };

  const editReelMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> | FormData }) =>
      vendorApi.updateReel(id, payload),
    onSuccess: () => {
      invalidateReelQueries();
      setEditOpen(false);
      resetEditForm();
    },
    onError: (e: Error) => toast.error(formatApiError(e)),
  });

  const requireVendorPortal = () => {
    if (!useVendorPortal) {
      toast.info('Open the vendor portal to manage reels.');
      return false;
    }
    return true;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['website', 'my-reels', slug, id, useVendorPortal, reelsAuthRev],
    enabled,
    queryFn: () =>
      useVendorPortal
        ? vendorApi.reels({ page_size: 80 })
        : websiteApiReelsPreferDirectMp4({
            page_size: 80,
            ...(id ? { vendor_id: id } : {}),
            ...(!id && slug ? { vendor_slug: slug } : {}),
          }),
  });

  const reels = useMemo(() => extractResults(data).map(mapApiReelToUi), [data]);

  const vendorStats = useMemo(
    () => ({
      totalReels: reels.length,
      totalViews: reels.reduce((a, r) => a + r.views, 0),
      totalLikes: reels.reduce((a, r) => a + r.likes, 0),
      totalOrders: 0,
    }),
    [reels],
  );

  if (!enabled) {
    return wrapPortal(
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-24 h-36 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'var(--reels-card)', border: '2px dashed var(--reels-glass-border)' }}>
          <Play className="w-8 h-8" style={{ color: 'var(--reels-text-muted)' }} />
        </div>
        <h3 className="reels-font-display font-bold reels-ui-text text-lg mb-2">Connect your store</h3>
        <p className="reels-font-body text-sm mb-6 max-w-md" style={{ color: 'var(--reels-text-muted)' }}>
          Set{' '}
          <code className={cn('text-xs px-1 rounded', useVendorPortal ? 'bg-muted' : 'bg-black/30')}>VITE_DEV_VENDOR_SLUG</code> to your vendor store slug, or pass{' '}
          <code className={cn('text-xs px-1 rounded', useVendorPortal ? 'bg-muted' : 'bg-black/30')}>vendorSlug</code> /{' '}
          <code className={cn('text-xs px-1 rounded', useVendorPortal ? 'bg-muted' : 'bg-black/30')}>vendorId</code> from the portal shell, then reload.
        </p>
      </div>,
    );
  }

  if (isLoading) {
    return wrapPortal(
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="reels-font-body text-sm" style={{ color: 'var(--reels-text-muted)' }}>Loading reels…</p>
      </div>,
    );
  }

  if (reels.length === 0) {
    return wrapPortal(
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-36 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'var(--reels-card)', border: '2px dashed var(--reels-glass-border)' }}>
          <Play className="w-8 h-8" style={{ color: 'var(--reels-text-muted)' }} />
        </div>
        <h3 className="reels-font-display font-bold reels-ui-text text-lg mb-2">No reels yet</h3>
        <p className="reels-font-body text-sm mb-6" style={{ color: 'var(--reels-text-muted)' }}>Share your first product video and start selling!</p>
        <button
          type="button"
          onClick={onNewReel}
          className="reels-font-body text-sm font-semibold px-6 py-2.5 rounded-xl"
          style={{ background: 'var(--reels-accent)', color: 'var(--reels-on-accent)' }}
        >
          + Upload Your First Reel
        </button>
      </div>,
    );
  }

  return wrapPortal(
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="reels-font-display font-bold text-2xl reels-ui-text">My Reels</h2>
        <button
          onClick={onNewReel}
          className="reels-font-body text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--reels-accent)', color: 'var(--reels-on-accent)' }}
        >
          + New Reel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Reels" value={vendorStats.totalReels} />
        <StatCard label="Views" value={vendorStats.totalViews} />
        <StatCard label="Likes" value={vendorStats.totalLikes} />
        <StatCard label="Orders" value={vendorStats.totalOrders} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {reels.map((reel, index) => (
          <motion.div
            key={reel.id}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (useVendorPortal && reelViewer) reelViewer.openReelViewer(reel.id);
              }
            }}
            onClick={() => {
              if (useVendorPortal && reelViewer) reelViewer.openReelViewer(reel.id);
            }}
            className="rounded-xl group cursor-pointer relative"
            style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-border)' }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.03, borderColor: 'var(--reels-accent)' }}
          >
            {/* Thumbnail */}
            <div className="relative aspect-[9/16] overflow-hidden rounded-t-xl" style={{ background: 'var(--reels-surface)' }}>
              <img src={reel.product.image} alt={reel.product.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 rounded-b-xl">
              <p className="reels-font-body text-xs reels-ui-text font-medium truncate mb-1">{reel.product.name}</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center gap-1 reels-font-mono text-[10px]" style={{ color: 'var(--reels-text-secondary)' }}>
                  <Eye className="w-3 h-3" /> {formatCount(reel.views)}
                </span>
                <span className="flex items-center gap-1 reels-font-mono text-[10px]" style={{ color: 'var(--reels-text-secondary)' }}>
                  <Heart className="w-3 h-3" /> {formatCount(reel.likes)}
                </span>
                <span className="flex items-center gap-1 reels-font-mono text-[10px]" style={{ color: 'var(--reels-text-secondary)' }}>
                  <MessageCircle className="w-3 h-3" /> {formatCount(reel.commentsCount ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <ReelStatusBadge status={reel.status ?? 'active'} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--reels-glass-border)] p-1 hover:bg-[var(--reels-glass)] focus:outline-none focus:ring-2 focus:ring-[var(--reels-accent)]/30"
                      aria-label="Reel actions"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" style={{ color: 'var(--reels-text-muted)' }} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className={cn(
                      'min-w-[160px] p-1 z-[100]',
                      useVendorPortal &&
                        'border border-[hsl(214_32%_91%)] bg-[hsl(0_0%_100%)] text-[hsl(222_47%_11%)] [&_[role=menuitem]]:focus:bg-[hsl(210_40%_96%)]',
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {(() => {
                      const isPaused = reel.status === 'paused';
                      const actions = [
                        { key: 'edit' as const, icon: Edit, label: 'Edit reel', danger: false },
                        {
                          key: isPaused ? ('resume' as const) : ('pause' as const),
                          icon: isPaused ? Play : Pause,
                          label: isPaused ? 'Resume Reel' : 'Pause Reel',
                          danger: false,
                        },
                        ...(canBoost
                          ? [{ key: 'boost' as const, icon: Zap, label: 'Boost Reel' as const, danger: false as const }]
                          : []),
                        { key: 'delete' as const, icon: Trash2, label: 'Delete', danger: true as const },
                      ];
                      return actions.map((action) => (
                        <DropdownMenuItem
                          key={action.key}
                          className={cn(
                            'reels-dropdown-item reels-font-body text-xs gap-2 cursor-pointer',
                            action.danger
                              ? 'text-[#E63946] focus:text-[#E63946] focus:bg-[hsl(0_84%_60%_/_0.08)]'
                              : useVendorPortal
                                ? 'text-[hsl(215_16%_47%)] focus:text-[hsl(222_47%_11%)]'
                                : 'text-popover-foreground',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!requireVendorPortal()) return;
                            if (action.key === 'boost') {
                              setBoostReel(reel);
                              setBoostOpen(true);
                              return;
                            }
                            if (action.key === 'edit') {
                              setEditReel(reel);
                              setEditCaptionDraft(reel.caption || '');
                              setEditTags([...(reel.tags ?? [])]);
                              setEditTagInput('');
                              const linked =
                                reel.product.id > 0 && reel.product.name !== 'No product linked';
                              setEditProductId(linked ? reel.product.id : null);
                              setEditProductSearch('');
                              setEditProductDropdownOpen(false);
                              setEditVideoUrl(reel.videoUrl || '');
                              setEditPlatformApi(reel.platformApi ?? mapUiPlatformToApi(reel.platform));
                              setEditThumbFile(null);
                              setEditOpen(true);
                              return;
                            }
                            if (action.key === 'pause' || action.key === 'resume') {
                              setPauseReel(reel);
                              setPauseConfirmOpen(true);
                              return;
                            }
                            if (action.key === 'delete') {
                              setDeleteReel(reel);
                              setDeleteConfirmOpen(true);
                            }
                          }}
                        >
                          <action.icon className="w-3.5 h-3.5 shrink-0" />
                          {action.label}
                        </DropdownMenuItem>
                      ));
                    })()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Boost Modal */}
      {boostReel && (
        <BoostModal
          isOpen={boostOpen}
          onClose={() => { setBoostOpen(false); setBoostReel(null); }}
          reelId={boostReel.id}
          reelName={boostReel.product.name}
          patchReel={(id, body) => vendorApi.updateReel(id, body)}
          invalidateQueryKeys={[['vendor', 'reels'], ['website', 'my-reels']]}
        />
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) resetEditForm();
        }}
      >
        <DialogContent
          className="z-[100] sm:max-w-lg max-h-[min(90vh,720px)] flex flex-col gap-0 p-0"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
            <DialogHeader>
              <DialogTitle>Edit reel</DialogTitle>
            </DialogHeader>
          </div>
          {editReel ? (
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reel-edit-caption">Caption</Label>
                <Textarea
                  id="reel-edit-caption"
                  value={editCaptionDraft}
                  onChange={e => setEditCaptionDraft(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder="Caption"
                  className="resize-none"
                  disabled={editReelMut.isPending}
                />
                <p className="text-xs text-muted-foreground">{editCaptionDraft.length}/200</p>
              </div>

              <div className="space-y-2">
                <Label>Featured product</Label>
                <p className="text-xs text-muted-foreground">
                  Link a catalog product so shoppers can add it to the cart from this reel.
                </p>
                {selectedEditProduct && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                    <img src={selectedEditProduct.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedEditProduct.name}</p>
                      <p className="text-xs text-muted-foreground">NPR {selectedEditProduct.price.toLocaleString()}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setEditProductId(null)}
                      disabled={editReelMut.isPending}
                      aria-label="Remove product"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <div
                    className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer bg-background"
                    onClick={() => setEditProductDropdownOpen(!editProductDropdownOpen)}
                  >
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={editProductSearch}
                      onChange={e => {
                        setEditProductSearch(e.target.value);
                        setEditProductDropdownOpen(true);
                      }}
                      placeholder={selectedEditProduct ? 'Change product…' : 'Search products…'}
                      className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                      onClick={e => {
                        e.stopPropagation();
                        setEditProductDropdownOpen(true);
                      }}
                      disabled={editReelMut.isPending}
                    />
                    <ChevronDown
                      className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', editProductDropdownOpen && 'rotate-180')}
                    />
                  </div>
                  <AnimatePresence>
                    {editProductDropdownOpen && (
                      <motion.div
                        className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        {filteredEditProducts.length === 0 ? (
                          <p className="p-3 text-xs text-center text-muted-foreground">No products found</p>
                        ) : (
                          filteredEditProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-accent/50 text-left"
                              onClick={() => {
                                setEditProductId(p.id);
                                setEditProductDropdownOpen(false);
                                setEditProductSearch('');
                              }}
                            >
                              <img src={p.image} alt="" className="w-8 h-8 rounded-md object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground">NPR {p.price.toLocaleString()}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reel-edit-tags">Tags</Label>
                <Input
                  id="reel-edit-tags"
                  value={editTagInput}
                  onChange={e => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editTagInput.trim()) {
                      e.preventDefault();
                      const t = editTagInput.trim();
                      if (!editTags.includes(t)) setEditTags(prev => [...prev, t]);
                      setEditTagInput('');
                    }
                  }}
                  placeholder="Add a tag, press Enter"
                  disabled={editReelMut.isPending}
                />
                <div className="flex flex-wrap gap-1.5">
                  {editTags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                    >
                      #{tag}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditTags(editTags.filter((_, j) => j !== i))}
                        disabled={editReelMut.isPending}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reel-edit-video">Video URL</Label>
                <Input
                  id="reel-edit-video"
                  value={editVideoUrl}
                  onChange={e => {
                    const v = e.target.value;
                    setEditVideoUrl(v);
                    if (v.trim()) setEditPlatformApi(detectApiPlatformFromVideoUrl(v));
                  }}
                  placeholder="https://…"
                  disabled={editReelMut.isPending}
                />
                <div className="space-y-1">
                  <Label htmlFor="reel-edit-platform" className="text-xs text-muted-foreground">Platform</Label>
                  <select
                    id="reel-edit-platform"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editPlatformApi}
                    onChange={e => setEditPlatformApi(e.target.value)}
                    disabled={editReelMut.isPending}
                  >
                    {REEL_PLATFORMS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reel-edit-thumb">Thumbnail (optional)</Label>
                <Input
                  id="reel-edit-thumb"
                  type="file"
                  accept="image/*"
                  className="cursor-pointer"
                  disabled={editReelMut.isPending}
                  onChange={e => setEditThumbFile(e.target.files?.[0] ?? null)}
                />
                {editThumbFile ? (
                  <p className="text-xs text-muted-foreground">Selected: {editThumbFile.name}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {editReel ? (
            <DialogFooter className="px-6 py-4 border-t border-border gap-2 sm:gap-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  resetEditForm();
                }}
                disabled={editReelMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const caption = editCaptionDraft.slice(0, 200);
                  const videoUrl = editVideoUrl.trim();
                  let payload: Record<string, unknown> | FormData;
                  if (editThumbFile) {
                    const fd = new FormData();
                    fd.append('caption', caption);
                    fd.append('tags', JSON.stringify(editTags));
                    fd.append('video_url', videoUrl);
                    fd.append('platform', editPlatformApi);
                    if (editProductId != null && editProductId > 0) fd.append('product_id', String(editProductId));
                    else fd.append('product_id', '');
                    fd.append('thumbnail', editThumbFile);
                    payload = fd;
                  } else {
                    payload = {
                      caption,
                      tags: editTags,
                      video_url: videoUrl,
                      platform: editPlatformApi,
                      product_id: editProductId != null && editProductId > 0 ? editProductId : null,
                    };
                  }
                  void editReelMut.mutateAsync({ id: String(editReel.id), payload });
                }}
                disabled={editReelMut.isPending}
              >
                {editReelMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pauseConfirmOpen}
        onOpenChange={(o) => {
          setPauseConfirmOpen(o);
          if (!o) setPauseReel(null);
        }}
      >
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pauseReel?.status === 'paused' ? 'Resume this reel?' : 'Pause this reel?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pauseReel?.status === 'paused'
                ? 'This reel will be eligible to appear in public feeds again.'
                : 'This reel will be hidden from public feeds until you resume it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pauseResumeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pauseResumeMut.isPending || !pauseReel}
              onClick={(e) => {
                e.preventDefault();
                if (!pauseReel) return;
                const resume = pauseReel.status === 'paused';
                void pauseResumeMut.mutateAsync({
                  id: String(pauseReel.id),
                  status: resume ? 'active' : 'draft',
                });
              }}
            >
              {pauseResumeMut.isPending ? 'Saving…' : pauseReel?.status === 'paused' ? 'Resume' : 'Pause'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(o) => {
          setDeleteConfirmOpen(o);
          if (!o) setDeleteReel(null);
        }}
      >
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reel?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteReel
                ? `This will permanently remove “${deleteReel.product.name}”. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={delMut.isPending || !deleteReel}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteReel) return;
                void delMut.mutateAsync(String(deleteReel.id));
              }}
            >
              {delMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
  );
};

export default MyReelsGrid;
