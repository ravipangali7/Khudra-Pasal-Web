import { useEffect, useState } from 'react';
import { X, ArrowDownCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WithdrawMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface WalletWithdrawProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance?: number;
  onConfirmWithdraw?: (payload: {
    amount: number;
    method_account: string;
    bank_name?: string;
    account_holder?: string;
  }) => Promise<void>;
}

const WalletWithdraw = ({
  isOpen,
  onClose,
  walletBalance = 5000,
  onConfirmWithdraw,
}: WalletWithdrawProps) => {
  const [step, setStep] = useState<'method' | 'details' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('method');
      setSelectedMethod(null);
      setAmount('');
      setAccountId('');
      setPending(false);
      setError('');
    }
  }, [isOpen]);

  const withdrawMethods: WithdrawMethod[] = [
    { id: 'esewa', name: 'eSewa', icon: '💚', color: 'from-green-500 to-green-600' },
    { id: 'khalti', name: 'Khalti', icon: '💜', color: 'from-purple-500 to-purple-600' },
    { id: 'banking', name: 'Mobile Banking', icon: '🏦', color: 'from-blue-500 to-blue-600' },
  ];

  if (!isOpen) return null;

  const handleWithdraw = async () => {
    const n = Number(amount);
    if (!accountId.trim() || !Number.isFinite(n) || n < 1 || n > walletBalance) return;
    setError('');
    if (onConfirmWithdraw) {
      setPending(true);
      try {
        await onConfirmWithdraw({
          amount: n,
          method_account: accountId.trim(),
          bank_name: selectedMethod?.name,
        });
        setStep('success');
        setTimeout(() => onClose(), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Withdrawal failed');
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
      setAccountId('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full animate-scale-in">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-category-cafe" />
            <h3 className="font-bold text-foreground">Withdraw Balance</h3>
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
          {/* Balance Display */}
          <div className="bg-gradient-to-r from-category-cafe to-category-cafe/80 rounded-xl p-4 text-white mb-6">
            <p className="text-sm opacity-80">Available Balance</p>
            <p className="text-2xl font-bold">Rs. {walletBalance.toLocaleString()}</p>
          </div>

          {step === 'method' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select withdrawal method:</p>
              
              {withdrawMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethod(method);
                    setStep('details');
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

          {step === 'details' && selectedMethod && (
            <div className="space-y-4">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r text-white",
                selectedMethod.color
              )}>
                <span className="text-xl">{selectedMethod.icon}</span>
                <span className="font-semibold">{selectedMethod.name}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {selectedMethod.id === 'banking' ? 'Account Number' : `${selectedMethod.name} ID`}
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={selectedMethod.id === 'banking' ? 'Enter account number' : 'Enter phone number'}
                  className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Amount (Rs.)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={walletBalance}
                  className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Max: Rs. {walletBalance.toLocaleString()}</p>
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
                  onClick={() => void handleWithdraw()}
                  disabled={!accountId || !amount || Number(amount) > walletBalance || pending}
                  className="flex-1 px-4 py-3 bg-category-cafe text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? 'Processing…' : 'Withdraw'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-category-fresh/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-category-fresh" />
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">Withdrawal Initiated!</h4>
              <p className="text-muted-foreground">Rs. {Number(amount).toLocaleString()} will be sent to your {selectedMethod?.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletWithdraw;
