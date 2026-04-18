import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Send, CheckCircle, Loader2, Search } from 'lucide-react';
import { isPortalOtpRequiredError, portalApi } from '@/lib/api';
import OtpVerificationModal from '@/components/wallet/OtpVerificationModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WalletTransferProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shown in the header; defaults to 0 when omitted. */
  walletBalance?: number;
  onConfirmTransfer?: (payload: { recipient: string; amount: number; otp?: string }) => Promise<void>;
}

const WalletTransfer = ({
  isOpen,
  onClose,
  walletBalance = 0,
  onConfirmTransfer,
}: WalletTransferProps) => {
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [recipientSelect, setRecipientSelect] = useState<string>('');
  const [manualRecipient, setManualRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['portal', 'wallet-transfer-recipients', debouncedQ],
    queryFn: () =>
      portalApi.walletTransferRecipients(debouncedQ ? { q: debouncedQ } : undefined),
    enabled: isOpen && Boolean(onConfirmTransfer),
    staleTime: 30_000,
  });

  const { data: walletPub } = useQuery({
    queryKey: ['wallet-settings-public', 'portal', 'transfer-modal'],
    queryFn: () => portalApi.walletSettingsPublic('portal'),
    enabled: isOpen && Boolean(onConfirmTransfer),
    staleTime: 60_000,
  });

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const pendingTransferRef = useRef<{ recipient: string; amount: number } | null>(null);

  const recipients = recipientsData?.results ?? [];

  useEffect(() => {
    if (!isOpen) {
      setStep('details');
      setRecipientSelect('');
      setManualRecipient('');
      setAmount('');
      setPending(false);
      setError('');
      setSearchQ('');
      setDebouncedQ('');
      setOtpModalOpen(false);
      pendingTransferRef.current = null;
    }
  }, [isOpen]);

  const resolvedRecipient = useMemo(() => {
    if (!onConfirmTransfer) {
      return manualRecipient.trim().replace(/^@+/, '');
    }
    if (!recipientSelect.startsWith('id:')) return '';
    return recipientSelect.slice(3);
  }, [onConfirmTransfer, recipientSelect, manualRecipient]);

  const recipientLabel = useMemo(() => {
    if (!onConfirmTransfer) {
      return manualRecipient.trim() || '—';
    }
    if (recipientSelect.startsWith('id:')) {
      const id = Number(recipientSelect.slice(3));
      const r = recipients.find((x) => x.user_id === id);
      if (r) return `${r.name} (${r.kid})`;
    }
    return resolvedRecipient || '—';
  }, [onConfirmTransfer, recipientSelect, manualRecipient, resolvedRecipient, recipients]);

  const transferOtpRequired = useMemo(() => {
    const n = Number(amount);
    const thr = walletPub?.otp_for_transfers_above ?? 0;
    if (!Number.isFinite(n) || n <= 0) return false;
    return n >= thr;
  }, [amount, walletPub?.otp_for_transfers_above]);

  if (!isOpen) return null;

  const canContinue =
    Boolean(resolvedRecipient) &&
    Number(amount) >= 1 &&
    (!onConfirmTransfer || recipientSelect.startsWith('id:'));

  const runTransfer = async (recipient: string, n: number, otp?: string) => {
    if (onConfirmTransfer) {
      await onConfirmTransfer({ recipient, amount: n, ...(otp?.trim() ? { otp: otp.trim() } : {}) });
      setStep('success');
      setTimeout(() => onClose(), 1500);
    }
  };

  const handleTransfer = async () => {
    const n = Number(amount);
    if (!resolvedRecipient || !Number.isFinite(n) || n < 1) return;
    setError('');
    if (onConfirmTransfer) {
      if (transferOtpRequired) {
        pendingTransferRef.current = { recipient: resolvedRecipient, amount: n };
        setOtpModalOpen(true);
        return;
      }
      setPending(true);
      try {
        await runTransfer(resolvedRecipient, n);
      } catch (e) {
        if (isPortalOtpRequiredError(e)) {
          pendingTransferRef.current = { recipient: resolvedRecipient, amount: n };
          setOtpModalOpen(true);
          return;
        }
        setError(e instanceof Error ? e.message : 'Transfer failed');
      } finally {
        setPending(false);
      }
      return;
    }
    setStep('success');
    setTimeout(() => {
      onClose();
      setStep('details');
      setRecipientSelect('');
      setManualRecipient('');
      setAmount('');
    }, 2000);
  };

  const showRecipientPicker = Boolean(onConfirmTransfer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-4 flex items-center justify-between border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Transfer</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <p className="text-sm text-destructive mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          ) : null}

          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-white mb-6">
            <p className="text-sm opacity-80">Available Balance</p>
            <p className="text-2xl font-bold">Rs. {walletBalance.toLocaleString()}</p>
          </div>

          {step === 'details' && (
            <div className="space-y-4">
              {showRecipientPicker ? (
                <>
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Filter recipients</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Search name, phone, KID, or username…"
                        className="pl-9"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Only active members of your family groups can receive transfers.
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">Recipient</Label>
                    {recipientsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <Select value={recipientSelect} onValueChange={setRecipientSelect}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select a family member" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipients.length === 0 ? (
                            <SelectItem value="__empty_hint__" disabled>
                              No family members — join a family group to transfer
                            </SelectItem>
                          ) : (
                            recipients.map((r) => (
                              <SelectItem key={r.user_id} value={`id:${r.user_id}`}>
                                <span className="font-medium">{r.name}</span>
                                <span className="text-muted-foreground text-xs ml-2">
                                  {r.kid} · {r.phone}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Recipient (KID, username, or ID)</Label>
                  <Input
                    value={manualRecipient}
                    onChange={(e) => setManualRecipient(e.target.value)}
                    placeholder="e.g. KP123456"
                    className="rounded-xl"
                  />
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Amount (Rs.)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="rounded-xl"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!canContinue}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Recipient</span>
                  <span className="font-medium text-foreground text-right break-all">{recipientLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">Rs. {Number(amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="flex-1 px-4 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleTransfer()}
                  disabled={pending}
                  className="flex-1 px-4 py-3 bg-category-fresh text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? 'Processing…' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-category-fresh/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-category-fresh" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">Transfer Successful!</h4>
              <p className="text-muted-foreground">
                Rs. {Number(amount).toLocaleString()} sent to {recipientLabel}
              </p>
            </div>
          )}
        </div>
      </div>
      {onConfirmTransfer ? (
        <OtpVerificationModal
          open={otpModalOpen}
          onOpenChange={(o) => {
            setOtpModalOpen(o);
            if (!o) pendingTransferRef.current = null;
          }}
          variant="portal_wallet"
          walletPurpose="transfer"
          portalPrefix="portal"
          onContinueWithOtp={async (otp) => {
            const p = pendingTransferRef.current;
            if (!p) throw new Error('No pending transfer.');
            setPending(true);
            setError('');
            try {
              await runTransfer(p.recipient, p.amount, otp);
              pendingTransferRef.current = null;
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Transfer failed');
              throw e;
            } finally {
              setPending(false);
            }
          }}
        />
      ) : null}
    </div>
  );
};

export default WalletTransfer;
