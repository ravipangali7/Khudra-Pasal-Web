import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Zap, TrendingUp, Crown } from 'lucide-react';
import { formatApiError } from '@/pages/admin/hooks/adminFormUtils';
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

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: number;
  reelName: string;
  patchReel: (id: string, body: Record<string, unknown>) => Promise<unknown>;
  /** Query key prefixes to invalidate after a successful boost (e.g. `[['admin','reels']]`). */
  invalidateQueryKeys?: readonly (readonly string[])[];
}

const boostTypes = [
  { id: 'standard', label: 'Standard', icon: Zap, description: 'Show in trending feed', color: '#3B82F6', multiplier: '2x' },
  { id: 'premium', label: 'Premium', icon: TrendingUp, description: 'Priority placement + explore page', color: '#F59E0B', multiplier: '5x' },
  { id: 'mega', label: 'Mega', icon: Crown, description: 'Top of all feeds + push notifications', color: '#E63946', multiplier: '10x' },
];

const BoostModal: React.FC<BoostModalProps> = ({
  isOpen,
  onClose,
  reelId,
  reelName,
  patchReel,
  invalidateQueryKeys = [],
}) => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('standard');
  const [budget, setBudget] = useState('500');
  const [duration, setDuration] = useState('7');
  const [boostConfirmOpen, setBoostConfirmOpen] = useState(false);
  const [localErr, setLocalErr] = useState('');

  const estimatedReach = () => {
    const b = parseInt(budget, 10) || 0;
    const d = parseInt(duration, 10) || 1;
    const mult = selectedType === 'mega' ? 10 : selectedType === 'premium' ? 5 : 2;
    return Math.max(0, Math.floor((b * d * mult) / 10));
  };

  const boostMut = useMutation({
    mutationFn: async () => {
      const d = parseInt(duration, 10);
      if (!Number.isFinite(d) || d <= 0) {
        throw new Error('Duration must be at least 1 day.');
      }
      const ev = estimatedReach();
      const budgetNpr = parseInt(budget, 10) || 0;
      const payload: Record<string, unknown> = {
        apply_boost: true,
        boost_duration_days: d,
        boost_expected_views: ev,
        boost_tier: selectedType,
      };
      if (budgetNpr > 0) payload.boost_daily_budget_npr = budgetNpr;
      return patchReel(String(reelId), payload);
    },
    onSuccess: () => {
      for (const key of invalidateQueryKeys) {
        void queryClient.invalidateQueries({ queryKey: [...key] });
      }
      setBoostConfirmOpen(false);
      setLocalErr('');
      onClose();
    },
    onError: (e: Error) => setLocalErr(formatApiError(e)),
  });

  const openConfirm = () => {
    setLocalErr('');
    const d = parseInt(duration, 10);
    if (!Number.isFinite(d) || d <= 0) {
      setLocalErr('Duration must be at least 1 day.');
      return;
    }
    setBoostConfirmOpen(true);
  };

  const handleClose = () => {
    setLocalErr('');
    setBoostConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            <motion.div
              className="fixed inset-0 z-[61] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                className="w-full max-w-md rounded-2xl p-6 relative"
                style={{ background: 'var(--reels-surface)', border: '1px solid var(--reels-glass-border)' }}
                onClick={e => e.stopPropagation()}
              >
                <button type="button" onClick={handleClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10">
                  <X className="w-4 h-4 text-white" />
                </button>

                <h2 className="reels-font-display font-bold text-xl text-white mb-1">Boost Reel</h2>
                <p className="reels-font-body text-xs mb-5" style={{ color: 'var(--reels-text-muted)' }}>{reelName}</p>

                <label className="reels-font-body text-xs font-semibold text-white mb-2 block">Boost Type</label>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {boostTypes.map(bt => {
                    const Icon = bt.icon;
                    const active = selectedType === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setSelectedType(bt.id)}
                        className="p-3 rounded-xl text-center transition-all"
                        style={{
                          background: active ? `${bt.color}20` : 'var(--reels-glass)',
                          border: `2px solid ${active ? bt.color : 'transparent'}`,
                        }}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: bt.color }} />
                        <p className="reels-font-body text-xs font-semibold text-white">{bt.label}</p>
                        <p className="reels-font-mono text-[10px]" style={{ color: 'var(--reels-text-muted)' }}>{bt.multiplier} reach</p>
                      </button>
                    );
                  })}
                </div>

                <label className="reels-font-body text-xs font-semibold text-white mb-1.5 block">Daily Budget (NPR)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl reels-font-mono text-sm text-white mb-4"
                  style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)', outline: 'none' }}
                  min="100"
                  placeholder="500"
                />

                <label className="reels-font-body text-xs font-semibold text-white mb-1.5 block">Duration (Days)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl reels-font-mono text-sm text-white mb-4"
                  style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)', outline: 'none' }}
                  min="1"
                  max="30"
                  placeholder="7"
                />

                <div className="p-3 rounded-xl mb-5" style={{ background: 'var(--reels-glass)' }}>
                  <div className="flex justify-between reels-font-body text-xs mb-1">
                    <span style={{ color: 'var(--reels-text-muted)' }}>Total Cost</span>
                    <span className="reels-font-mono font-bold" style={{ color: 'var(--reels-gold)' }}>
                      NPR {((parseInt(budget, 10) || 0) * (parseInt(duration, 10) || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between reels-font-body text-xs">
                    <span style={{ color: 'var(--reels-text-muted)' }}>Est. Reach</span>
                    <span className="reels-font-mono font-bold text-white">{estimatedReach().toLocaleString()} views</span>
                  </div>
                </div>

                {localErr && !boostConfirmOpen ? (
                  <p className="reels-font-body text-xs text-red-400 mb-3">{localErr}</p>
                ) : null}

                <button
                  type="button"
                  onClick={openConfirm}
                  disabled={boostMut.isPending}
                  className="w-full py-3 rounded-xl reels-font-body text-sm font-bold text-white transition-all"
                  style={{
                    background: boostMut.isPending ? 'var(--reels-text-muted)' : 'var(--reels-accent)',
                    boxShadow: boostMut.isPending ? 'none' : '0 0 20px var(--reels-accent-glow)',
                  }}
                >
                  {boostMut.isPending ? '⏳ Processing...' : '🚀 Start Boost'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={boostConfirmOpen} onOpenChange={setBoostConfirmOpen}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm boost</AlertDialogTitle>
            <AlertDialogDescription>
              Apply boost to &quot;{reelName}&quot; for {duration} day(s) with ~{estimatedReach().toLocaleString()} expected views
              ({boostTypes.find(b => b.id === selectedType)?.label ?? selectedType} tier)? This will be saved on the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {localErr ? <p className="text-sm text-destructive">{localErr}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={boostMut.isPending} onClick={() => setLocalErr('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={boostMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                void boostMut.mutateAsync();
              }}
            >
              {boostMut.isPending ? 'Saving…' : 'Confirm boost'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BoostModal;
