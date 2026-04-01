import { useEffect, useState } from 'react';
import { X, Plus, Upload, CheckCircle, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddMoneyMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface WalletAddMoneyProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, credits wallet via API; otherwise uses demo success timer. */
  onConfirmTopup?: (payload: { amount: number; method: string }) => Promise<void>;
  /** When opening (e.g. quick-add), prefill amount field. */
  defaultAmount?: string;
}

const WalletAddMoney = ({ isOpen, onClose, onConfirmTopup, defaultAmount }: WalletAddMoneyProps) => {
  const [step, setStep] = useState<'method' | 'amount' | 'qr' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = useState<AddMoneyMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('method');
      setSelectedMethod(null);
      setAmount('');
      setPending(false);
      setError('');
    } else if (defaultAmount) {
      setAmount(defaultAmount);
      setStep('method');
      setSelectedMethod(null);
    }
  }, [isOpen, defaultAmount]);

  const addMethods: AddMoneyMethod[] = [
    { id: 'esewa', name: 'eSewa', icon: '💚', color: 'from-green-500 to-green-600' },
    { id: 'khalti', name: 'Khalti', icon: '💜', color: 'from-purple-500 to-purple-600' },
    { id: 'connectips', name: 'Connect IPS', icon: '🔗', color: 'from-amber-500 to-amber-600' },
    { id: 'qr', name: 'Manual QR Upload', icon: '📱', color: 'from-gray-600 to-gray-700' },
  ];

  const quickAmounts = [500, 1000, 2000, 5000];

  if (!isOpen) return null;

  const handleAddMoney = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 1) return;
    setError('');
    if (onConfirmTopup) {
      setPending(true);
      try {
        const method = selectedMethod?.id ?? 'topup';
        await onConfirmTopup({ amount: n, method });
        setStep('success');
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Top-up failed');
      } finally {
        setPending(false);
      }
      return;
    }
    setStep('success');
    setTimeout(() => {
      onClose();
      setStep('method');
      setSelectedMethod(null);
      setAmount('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-category-fresh" />
            <h3 className="font-bold text-foreground">Add Money to Wallet</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <p className="text-sm text-destructive mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          ) : null}
          {step === 'method' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select payment method:</p>
              
              {addMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method);
                    setStep(method.id === 'qr' ? 'qr' : 'amount');
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                    `bg-gradient-to-r ${method.color} text-white`
                  )}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="font-semibold">{method.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'amount' && selectedMethod && (
            <div className="space-y-4">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r text-white",
                selectedMethod.color
              )}>
                <span className="text-xl">{selectedMethod.icon}</span>
                <span className="font-semibold">{selectedMethod.name}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Enter Amount (Rs.)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                />
              </div>

              {/* Quick Amounts */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(String(amt))}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      amount === String(amt)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border hover:border-primary/50"
                    )}
                  >
                    Rs. {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setStep('method');
                    setSelectedMethod(null);
                  }}
                  className="flex-1 px-4 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => void handleAddMoney()}
                  disabled={!amount || Number(amount) < 1 || pending}
                  className="flex-1 px-4 py-3 bg-category-fresh text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? 'Processing…' : `Add Rs. ${Number(amount || 0).toLocaleString()}`}
                </button>
              </div>
            </div>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                <span className="text-xl">📱</span>
                <span className="font-semibold">Manual QR Upload</span>
              </div>

              {/* QR Image Display */}
              <div className="p-4 bg-muted/30 rounded-xl text-center">
                <QrCode className="w-20 h-20 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">KhudraPasal QR Code</p>
                <p className="text-xs text-muted-foreground">Scan this QR using your banking or wallet app</p>
                <div className="mt-2 p-2 bg-card rounded-lg border">
                  <p className="font-mono text-xs text-muted-foreground">A/C: Khudra Pasal Pvt. Ltd.</p>
                  <p className="font-mono text-xs text-muted-foreground">Bank: NIC Asia | A/C# 0123456789</p>
                </div>
              </div>

              {/* Screenshot Upload */}
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">Upload Payment Screenshot</p>
                <p className="text-sm text-muted-foreground mb-3">
                  After making payment, upload the screenshot as proof
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="qr-screenshot-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Screenshot uploaded:', file.name);
                    }
                  }}
                />
                <label htmlFor="qr-screenshot-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer font-medium text-sm hover:opacity-90 transition-opacity">
                  <Upload className="w-4 h-4" />
                  Choose File
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Amount Paid (Rs.)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                <p className="text-xs text-amber-800 dark:text-amber-200">⏳ Manual QR payments are verified within 1-24 hours. You'll receive a notification once confirmed.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setStep('method');
                    setSelectedMethod(null);
                  }}
                  className="flex-1 px-4 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => void handleAddMoney()}
                  disabled={!amount || Number(amount) < 1 || pending}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? 'Processing…' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-category-fresh/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-category-fresh" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">Money Added!</h4>
              <p className="text-muted-foreground">Rs. {Number(amount).toLocaleString()} added to your wallet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletAddMoney;
