import { useEffect, useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, portalApi } from '@/lib/api';

type WalletPurpose = 'transfer' | 'withdraw';

export type OtpVerificationModalProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'portal_wallet';
      walletPurpose: WalletPurpose;
      portalPrefix: 'portal' | 'family-portal' | 'child-portal';
      title?: string;
      description?: string;
      onContinueWithOtp: (otp: string) => void | Promise<void>;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'family_invite';
      phone: string;
      inviteToken: string;
      title?: string;
      description?: string;
      onContinueWithOtp: (otp: string) => void | Promise<void>;
    };

export default function OtpVerificationModal(props: OtpVerificationModalProps) {
  const { open, onOpenChange, onContinueWithOtp } = props;
  const [otp, setOtp] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setOtp('');
      setError('');
      setSendBusy(false);
      setSubmitBusy(false);
    }
  }, [open]);

  const sendOtp = async () => {
    setError('');
    setSendBusy(true);
    try {
      if (props.variant === 'family_invite') {
        const r = await authApi.sendOtp({
          phone: props.phone.trim(),
          purpose: 'family_invite',
          invite_token: props.inviteToken,
        });
        if (r.debug_otp) console.info('[dev] family_invite OTP:', r.debug_otp);
      } else if (props.walletPurpose === 'transfer') {
        await portalApi.walletOtpForTransfer(props.portalPrefix);
      } else {
        await portalApi.walletOtpForWithdraw(props.portalPrefix);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP.');
    } finally {
      setSendBusy(false);
    }
  };

  const handleContinue = async () => {
    const code = otp.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError('');
    setSubmitBusy(true);
    try {
      await onContinueWithOtp(code);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setSubmitBusy(false);
    }
  };

  const title =
    props.title ??
    (props.variant === 'family_invite'
      ? 'Verify phone'
      : props.walletPurpose === 'transfer'
        ? 'Transfer verification'
        : 'Withdrawal verification');

  const description =
    props.description ??
    (props.variant === 'family_invite'
      ? 'We send a code to your phone to confirm this invite.'
      : props.walletPurpose === 'transfer'
        ? 'Send an SMS code to your phone, then enter it to authorize this transfer.'
        : 'Send an SMS code to your phone, then enter it to authorize this withdrawal.');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="otp-verify-input">One-time code</Label>
            <Input
              id="otp-verify-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest font-mono"
              placeholder="000000"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" disabled={sendBusy} onClick={() => void sendOtp()}>
            {sendBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send SMS code
          </Button>
          <Button type="button" disabled={submitBusy || otp.length !== 6} onClick={() => void handleContinue()}>
            {submitBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verify and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
