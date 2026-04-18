import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, QrCode, RefreshCw, Send, Upload } from 'lucide-react';
import { isPortalOtpRequiredError, portalApi, PortalApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import OtpVerificationModal from '@/components/wallet/OtpVerificationModal';

export type WalletHubPortalPrefix = 'portal' | 'family-portal' | 'child-portal';

const QR_PAYLOAD_PREFIX = 'khudrapasal://transfer?code=';

export function parseTransferCodeFromScan(raw: string): string {
  const t = raw.trim();
  try {
    if (t.includes('://') || t.startsWith('http')) {
      const u = new URL(t.includes('://') ? t : `https://${t}`);
      const c = u.searchParams.get('code') || u.searchParams.get('transfer_id');
      if (c) return c.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }
  } catch {
    /* ignore */
  }
  const m = t.match(/(?:^|[?&])code=([^&]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return t.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

interface WalletHubPanelProps {
  portalPrefix: WalletHubPortalPrefix;
  onSent?: () => void;
}

const WalletHubPanel = ({ portalPrefix, onSent }: WalletHubPanelProps) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [recipientCode, setRecipientCode] = useState('');
  const [amount, setAmount] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const pendingTransferRef = useRef<{ c: string; n: number; idemKey: string } | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [preview, setPreview] = useState<{ display_name: string; code: string } | null>(null);
  const [sendError, setSendError] = useState('');

  const { data: pub } = useQuery({
    queryKey: ['wallet-settings-public', portalPrefix],
    queryFn: () => portalApi.walletSettingsPublic(portalPrefix),
    staleTime: 60_000,
  });

  const hubEnabled = pub?.cross_portal_transfer_by_code_enabled === true;

  const {
    data: myCode,
    error: myCodeErr,
    isLoading: myCodeLoading,
    refetch: refetchMyCode,
  } = useQuery({
    queryKey: ['wallet-hub', 'transfer-id-me'],
    queryFn: () => portalApi.walletHubTransferIdMe(),
    enabled: hubEnabled,
    retry: false,
  });

  const my404 = myCodeErr instanceof PortalApiError && myCodeErr.status === 404;

  const qrValue = useMemo(() => {
    if (!myCode?.code) return '';
    return `${QR_PAYLOAD_PREFIX}${encodeURIComponent(myCode.code)}`;
  }, [myCode?.code]);

  const otpRequired = useMemo(() => {
    const n = Number(amount);
    const thr = pub?.otp_for_transfers_above ?? 0;
    if (!Number.isFinite(n) || n <= 0) return false;
    return n >= thr;
  }, [amount, pub?.otp_for_transfers_above]);

  const invalidateHub = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['wallet-hub', 'transfer-id-me'] });
  }, [qc]);

  const handleCreateOrRefresh = async (regenerate: boolean) => {
    setCreateBusy(true);
    try {
      const fd = new FormData();
      if (regenerate) fd.append('regenerate', 'true');
      await portalApi.walletHubTransferIdCreate(fd);
      toast.success(regenerate ? 'Transfer ID regenerated' : 'Transfer ID ready');
      invalidateHub();
      await refetchMyCode();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update transfer ID');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleUploadQr = async (file: File | null) => {
    if (!file) return;
    setCreateBusy(true);
    try {
      const fd = new FormData();
      fd.append('qr_image', file);
      await portalApi.walletHubTransferIdCreate(fd);
      toast.success('QR image saved');
      invalidateHub();
      await refetchMyCode();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setCreateBusy(false);
    }
  };

  const handleLookup = async () => {
    const c = recipientCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (c.length < 6) {
      setPreview(null);
      return;
    }
    setLookupBusy(true);
    setPreview(null);
    try {
      const row = await portalApi.walletHubTransferIdLookup(c);
      setPreview({ display_name: row.display_name, code: row.code });
    } catch {
      setPreview(null);
      toast.error('Transfer ID not found');
    } finally {
      setLookupBusy(false);
    }
  };

  const handleScanFile = async (file: File | null) => {
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const decoded = await Html5Qrcode.scanFile(file, false);
      const parsed = parseTransferCodeFromScan(decoded);
      if (parsed.length >= 6) {
        setRecipientCode(parsed);
        toast.message('Code filled from image');
      } else {
        toast.error('No transfer code found in image');
      }
    } catch {
      toast.error('Could not read QR from image');
    }
  };

  const executeHubTransfer = async (c: string, n: number, idemKey: string, otp?: string) => {
    await portalApi.walletHubWalletTransfer(
      { transfer_id: c, amount: n, ...(otp?.trim() ? { otp: otp.trim() } : {}) },
      idemKey,
    );
    toast.success('Transfer sent');
    setRecipientCode('');
    setAmount('');
    setPreview(null);
    onSent?.();
  };

  const handleSend = async () => {
    const c = recipientCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const n = Number(amount);
    setSendError('');
    if (c.length < 6 || !Number.isFinite(n) || n < 1) {
      setSendError('Enter a valid transfer ID and amount.');
      return;
    }
    const key =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (otpRequired) {
      pendingTransferRef.current = { c, n, idemKey: key };
      setOtpModalOpen(true);
      return;
    }
    setSendBusy(true);
    try {
      await executeHubTransfer(c, n, key);
    } catch (e) {
      if (e instanceof PortalApiError && isPortalOtpRequiredError(e)) {
        pendingTransferRef.current = { c, n, idemKey: key };
        setOtpModalOpen(true);
        return;
      }
      setSendError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSendBusy(false);
    }
  };

  if (!hubEnabled) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Transfer by transfer ID is not enabled. Ask an administrator to turn on{' '}
        <span className="font-medium text-foreground">cross_portal_transfer_by_code_enabled</span> in wallet
        settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          My transfer ID
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Share this ID or QR so anyone can send you money from another portal.
        </p>
      </div>

      {myCodeLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : my404 || !myCode ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={createBusy} onClick={() => void handleCreateOrRefresh(false)}>
            {createBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create transfer ID'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="rounded-lg bg-white p-2 shrink-0">
            {qrValue ? (
              <QRCodeSVG value={qrValue} size={140} level="M" includeMargin />
            ) : null}
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <p className="font-mono text-lg tracking-wider break-all">{myCode.code}</p>
            {myCode.qr_image_url ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Your uploaded QR</p>
                <img
                  src={myCode.qr_image_url}
                  alt="Transfer QR"
                  className="max-h-32 rounded border border-border"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createBusy}
                onClick={() => void handleCreateOrRefresh(true)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                New code
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createBusy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload QR image
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleUploadQr(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send by transfer ID
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hub-recipient">Recipient transfer ID</Label>
            <div className="flex gap-2">
              <Input
                id="hub-recipient"
                value={recipientCode}
                onChange={(e) => setRecipientCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4E5F6"
                className="font-mono"
              />
              <Button type="button" variant="secondary" disabled={lookupBusy} onClick={() => void handleLookup()}>
                {lookupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-xs text-muted-foreground max-w-full"
                onChange={(e) => void handleScanFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {preview ? (
              <p className="text-xs text-muted-foreground">
                Sending to <span className="font-medium text-foreground">{preview.display_name}</span>
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hub-amount">Amount (Rs.)</Label>
            <Input
              id="hub-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        {otpRequired ? (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
            This amount needs SMS OTP. When you tap Send money, a verification window opens to request the code and
            continue.
          </p>
        ) : null}
        {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
        <Button type="button" disabled={sendBusy} onClick={() => void handleSend()}>
          {sendBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Send money
        </Button>
      </div>
      <OtpVerificationModal
        open={otpModalOpen}
        onOpenChange={(o) => {
          setOtpModalOpen(o);
          if (!o) pendingTransferRef.current = null;
        }}
        variant="portal_wallet"
        walletPurpose="transfer"
        portalPrefix={portalPrefix}
        onContinueWithOtp={async (code) => {
          const p = pendingTransferRef.current;
          if (!p) throw new Error('No pending transfer.');
          await executeHubTransfer(p.c, p.n, p.idemKey, code);
          pendingTransferRef.current = null;
        }}
      />
    </div>
  );
};

export default WalletHubPanel;
