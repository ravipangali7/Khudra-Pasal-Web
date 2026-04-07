import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, MoreVertical, Edit, Pause, Trash2, Eye, Heart, MessageCircle, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReelStatusBadge from './ReelStatusBadge';
import BoostModal from './BoostModal';
import type { Reel } from '../types';
import { extractResults, vendorApi, websiteApiReelsPreferDirectMp4 } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import { useReelsQueryAuthRev } from '../feed/useReelsQueryAuthRev';
import { useVendorReelViewer } from './VendorReelViewerContext';
import { cn } from '@/lib/utils';
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
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
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

  const delMut = useMutation({
    mutationFn: (reelPk: string) => vendorApi.deleteReel(reelPk),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendor', 'reels'] });
      void queryClient.invalidateQueries({ queryKey: ['website', 'my-reels'] });
    },
  });

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
                <ReelStatusBadge status="active" />
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === reel.id ? null : reel.id);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: 'var(--reels-text-muted)' }} />
                  </button>
                  {menuOpen === reel.id && (
                    <div
                      className="absolute right-0 top-6 z-20 rounded-lg py-1 min-w-[140px] shadow-md"
                      style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
                    >
                      {[
                        { icon: Edit, label: 'Edit Caption' },
                        { icon: Pause, label: 'Pause Reel' },
                        ...(canBoost ? [{ icon: Zap, label: 'Boost Reel' }] : []),
                        { icon: Trash2, label: 'Delete', danger: true }
                      ].map(action => (
                        <button
                          type="button"
                          key={action.label}
                          className="reels-dropdown-item w-full flex items-center gap-2 px-3 py-2 reels-font-body text-xs"
                          style={{ color: action.danger ? '#E63946' : 'var(--reels-text-secondary)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (action.label === 'Boost Reel') {
                              setBoostReel(reel);
                              setBoostOpen(true);
                            } else if (action.label === 'Delete' && useVendorPortal && confirm('Delete this reel?')) {
                              delMut.mutate(String(reel.id));
                            } else console.log(action.label, reel.id);
                            setMenuOpen(null);
                          }}
                        >
                          <action.icon className="w-3.5 h-3.5" /> {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
    </div>,
  );
};

export default MyReelsGrid;
