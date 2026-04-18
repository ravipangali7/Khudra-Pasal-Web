import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowDownCircle, CheckCircle } from 'lucide-react';
import type { PortalPayoutAccountRow } from '@/lib/api';
import { isPortalOtpRequiredError, portalApi } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import OtpVerificationModal from '@/components/wallet/OtpVerificationModal';

interface WalletWithdrawProps {
  /** Modal mode: controlled open state. Ignored when variant is `page`. */
  isOpen?: boolean;
  variant?: 'modal' | 'page';
  onClose?: () => void;
  walletBalance?: number;
  payoutAccounts: PortalPayoutAccountRow[];
  payoutLoading?: boolean;
  onConfirmWithdraw?: (payload: { amount: number; payout_account_id: string; otp?: string }) => Promise<void>;
  /** Shown in page mode when user has no payout accounts yet. */
  onNavigateToPayout?: () => void;
  /** Used to send/consume wallet withdrawal OTP. */
  portalPrefix?: 'portal' | 'family-portal' | 'child-portal';
}

function accountLabel(a: PortalPayoutAccountRow) {
  if (a.type === 'bank') return `${a.bank_name || 'Bank'} · …${(a.bank_account_no || '').slice(-4)}`;
  return `${a.type} · ${a.phone || '—'}`;
}

const WalletWithdraw = ({
  isOpen = true,
  variant = 'modal',
  onClose,
  walletBalance = 0,
  payoutAccounts,
  payoutLoading = false,
  onConfirmWithdraw,
  onNavigateToPayout,
  portalPrefix = 'portal',
}: WalletWithdrawProps) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [payoutId, setPayoutId] = useState('');
  const [amount, setAmount] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const pendingWithdrawRef = useRef<{ amount: number; payout_account_id: string } | null>(null);

  const isPage = variant === 'page';

  const { data: walletPub } = useQuery({
    queryKey: ['wallet-settings-public', portalPrefix, 'withdraw-ui'],
    queryFn: () => portalApi.walletSettingsPublic(portalPrefix),
    staleTime: 60_000,
    enabled: isPage || isOpen,
  });

  useEffect(() => {
    if (isPage) return;
    if (!isOpen) {
      setStep('form');
      setPayoutId('');
      setAmount('');
      setPending(false);
      setError('');
      setOtpModalOpen(false);
      pendingWithdrawRef.current = null;
    }
  }, [isOpen, isPage]);

  useEffect(() => {
    if (!isPage && !isOpen) return;
    if (payoutAccounts.length && !payoutId) {
      setPayoutId(payoutAccounts[0].id);
    }
  }, [isOpen, isPage, payoutAccounts, payoutId]);

  if (!isPage && !isOpen) return null;

  const runWithdraw = async (payload: { amount: number; payout_account_id: string; otp?: string }) => {
    if (!onConfirmWithdraw) return;
    await onConfirmWithdraw(payload);
    setStep('success');
    if (!isPage) {
      setTimeout(() => onClose?.(), 1500);
    }
  };

  const handleWithdraw = async () => {
    const n = Number(amount);
    if (!payoutId || !Number.isFinite(n) || n < 1 || n > walletBalance) return;
    setError('');
    if (!onConfirmWithdraw) return;

    const payload = { amount: n, payout_account_id: payoutId };
    const needsOtp = walletPub?.otp_for_withdrawals === true;

    if (needsOtp) {
      pendingWithdrawRef.current = payload;
      setOtpModalOpen(true);
      return;
    }

    setPending(true);
    try {
      await runWithdraw(payload);
    } catch (e) {
      if (isPortalOtpRequiredError(e)) {
        pendingWithdrawRef.current = payload;
        setOtpModalOpen(true);
        return;
      }
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setPending(false);
    }
  };

  const selected = payoutAccounts.find((a) => a.id === payoutId);

  const formInner = (
    <>
      {error ? (
        <p className="text-sm text-destructive mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      ) : null}
      <div
        className={
          isPage
            ? 'bg-gradient-to-r from-category-cafe to-category-cafe/80 rounded-xl p-4 text-white mb-6'
            : 'bg-gradient-to-r from-category-cafe to-category-cafe/80 rounded-xl p-4 text-white mb-6'
        }
      >
        <p className="text-sm opacity-80">Available Balance</p>
        <p className="text-2xl font-bold">Rs. {walletBalance.toLocaleString()}</p>
      </div>

      {step === 'form' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Funds stay in your wallet until an admin approves the request.
            {onNavigateToPayout ? (
              <>
                {' '}
                Manage payout accounts on the{' '}
                <button
                  type="button"
                  className="text-primary font-medium underline underline-offset-2"
                  onClick={onNavigateToPayout}
                >
                  Payout accounts
                </button>{' '}
                page.
              </>
            ) : (
              ' Add payout accounts from your wallet if needed.'
            )}
          </p>
          {payoutLoading ? (
            <p className="text-sm text-muted-foreground">Loading payout accounts…</p>
          ) : payoutAccounts.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Add a payout account before withdrawing.
              {onNavigateToPayout ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2"
                    onClick={onNavigateToPayout}
                  >
                    Go to Payout accounts
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Payout account</Label>
              <Select value={payoutId} onValueChange={setPayoutId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {payoutAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {accountLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount (Rs.)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={1}
              max={walletBalance}
            />
            <p className="text-xs text-muted-foreground">Max: Rs. {walletBalance.toLocaleString()}</p>
          </div>

          <Button
            type="button"
            className="w-full bg-category-cafe hover:bg-category-cafe/90"
            disabled={
              !payoutId ||
              !amount ||
              Number(amount) > walletBalance ||
              Number(amount) < 1 ||
              pending ||
              payoutLoading
            }
            onClick={() => void handleWithdraw()}
          >
            {pending ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-category-fresh/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-category-fresh" />
          </div>
          <h4 className="text-xl font-bold text-foreground mb-2">Request submitted</h4>
          <p className="text-muted-foreground">
            Rs. {Number(amount).toLocaleString()} — pending admin approval
            {selected ? ` to ${accountLabel(selected)}` : ''}.
          </p>
          {isPage ? (
            <Button type="button" variant="outline" className="mt-6" onClick={() => setStep('form')}>
              Submit another
            </Button>
          ) : null}
        </div>
      )}
    </>
  );

  const shell = (
    <>
      {formInner}
      <OtpVerificationModal
        open={otpModalOpen}
        onOpenChange={(o) => {
          setOtpModalOpen(o);
          if (!o) pendingWithdrawRef.current = null;
        }}
        variant="portal_wallet"
        walletPurpose="withdraw"
        portalPrefix={portalPrefix}
        onContinueWithOtp={async (otp) => {
          const p = pendingWithdrawRef.current;
          if (!p) throw new Error('No pending withdrawal.');
          setPending(true);
          setError('');
          try {
            await runWithdraw({ ...p, otp });
            pendingWithdrawRef.current = null;
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Withdrawal failed');
            throw e;
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );

  if (isPage) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownCircle className="w-5 h-5 text-category-cafe" />
          <h3 className="font-bold text-foreground">Request withdrawal</h3>
        </div>
        {shell}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-category-cafe" />
            <h3 className="font-bold text-foreground">Request withdrawal</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">{shell}</div>
      </div>
    </div>
  );
};

export default WalletWithdraw;
