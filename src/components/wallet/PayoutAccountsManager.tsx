import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PortalPayoutAccountRow } from '@/lib/api';

type PayoutType = 'esewa' | 'khalti' | 'bank';

export default function PayoutAccountsManager({
  accounts,
  loading,
  onCreate,
  onDelete,
  disabled,
}: {
  accounts: PortalPayoutAccountRow[];
  loading: boolean;
  onCreate: (fd: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [type, setType] = useState<PayoutType>('esewa');
  const [phone, setPhone] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    const fd = new FormData();
    fd.append('type', type);
    if (type === 'bank') {
      fd.append('bank_account_no', bankAccountNo.trim());
      fd.append('bank_account_holder', bankAccountHolder.trim());
      fd.append('bank_name', bankName.trim());
    } else {
      fd.append('phone', phone.trim());
      if (bankAccountHolder.trim()) fd.append('bank_account_holder', bankAccountHolder.trim());
    }
    if (qrFile) fd.append('qr_image', qrFile);
    setPending(true);
    try {
      await onCreate(fd);
      setPhone('');
      setBankAccountNo('');
      setBankAccountHolder('');
      setBankName('');
      setQrFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save payout account.');
    } finally {
      setPending(false);
    }
  };

  const labelFor = (a: PortalPayoutAccountRow) => {
    if (a.type === 'bank') return `${a.bank_name || 'Bank'} · …${(a.bank_account_no || '').slice(-4)}`;
    return `${a.type} · ${a.phone || '—'}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Payout accounts</h3>
        <p className="text-xs text-muted-foreground">
          Add at least one account before requesting a withdrawal. Admin will send funds to this destination after
          approval.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">No payout accounts yet. Add one below.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="truncate">{labelFor(a)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-destructive"
                disabled={disabled || pending}
                onClick={() => void onDelete(a.id)}
                aria-label="Remove payout account"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Add account</p>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as PayoutType)} disabled={disabled || pending}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="esewa">eSewa</SelectItem>
              <SelectItem value="khalti">Khalti</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === 'bank' ? (
          <>
            <div className="space-y-2">
              <Label>Bank name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={disabled || pending} />
            </div>
            <div className="space-y-2">
              <Label>Account number</Label>
              <Input
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                disabled={disabled || pending}
              />
            </div>
            <div className="space-y-2">
              <Label>Account holder</Label>
              <Input
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                disabled={disabled || pending}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Phone / wallet ID</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={disabled || pending} />
          </div>
        )}
        <div className="space-y-2">
          <Label>QR image (optional)</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={disabled || pending}
            onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="button" className="w-full" disabled={disabled || pending} onClick={() => void submit()}>
          {pending ? 'Saving…' : 'Save payout account'}
        </Button>
      </div>
    </div>
  );
}
