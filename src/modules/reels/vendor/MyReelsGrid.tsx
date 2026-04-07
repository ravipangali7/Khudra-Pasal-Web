import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, MoreVertical, Edit, Pause, Trash2, Eye, Heart, MessageCircle, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReelStatusBadge from './ReelStatusBadge';
import BoostModal from './BoostModal';
import type { Reel } from '../types';
import { extractResults, vendorApi, websiteApiReelsPreferDirectMp4 } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
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
import '../reels-theme.css';

const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();

// Mock role check — in real app, this comes from auth context
const useUserRole = () => ({ role: 'vendor' as 'vendor' | 'admin' | 'customer' });
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
  const { role } = useUserRole();
  const canBoost = role === 'vendor' || role === 'admin';

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

  const editCaptionMut = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      vendorApi.updateReel(id, { caption }),
    onSuccess: () => {
      invalidateReelQueries();
      setEditOpen(false);
      setEditReel(null);
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
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseReel, setPauseReel] = useState<Reel | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReel, setDeleteReel] = useState<Reel | null>(null);

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
                        { key: 'edit' as const, icon: Edit, label: 'Edit Caption', danger: false },
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
          if (!o) {
            setEditReel(null);
            setEditCaptionDraft('');
          }
        }}
      >
        <DialogContent className="z-[100] sm:max-w-md" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editCaptionDraft}
            onChange={e => setEditCaptionDraft(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="Caption"
            className="resize-none"
            disabled={editCaptionMut.isPending}
          />
          <p className="text-xs text-muted-foreground">{editCaptionDraft.length}/200</p>
          {editReel ? (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditReel(null);
                }}
                disabled={editCaptionMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void editCaptionMut.mutateAsync({
                    id: String(editReel.id),
                    caption: editCaptionDraft,
                  });
                }}
                disabled={editCaptionMut.isPending}
              >
                {editCaptionMut.isPending ? 'Saving…' : 'Save'}
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
