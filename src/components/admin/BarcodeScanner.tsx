import { useState, useRef, useEffect, useCallback } from 'react';
import { Barcode, Volume2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { adminApi, extractResults } from '@/lib/api';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'notfound'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    const interval = setInterval(refocus, 500);
    inputRef.current?.focus();
    return () => clearInterval(interval);
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent fallback */ }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode.trim()) {
      e.preventDefault();
      const code = barcode.trim();
      setLastScanned(code);

      void (async () => {
        try {
          const res = await adminApi.products({ page_size: 10, search: code });
          const rows = extractResults<{ sku?: string }>(res);
          const match = rows.find((r) => String(r.sku) === code) ?? rows[0];
          if (match) {
            setScanStatus('success');
            playBeep();
            onScan(code);
          } else {
            setScanStatus('notfound');
          }
        } catch {
          setScanStatus('notfound');
        }
        setTimeout(() => setScanStatus('idle'), 2000);
      })();

      setBarcode('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="pl-9 font-mono"
          placeholder="Scan barcode or type SKU and press Enter"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      {lastScanned && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Last: {lastScanned}</span>
          {scanStatus === 'success' && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-600 gap-1">
              <CheckCircle className="w-3 h-3" /> Matched product
            </Badge>
          )}
          {scanStatus === 'notfound' && (
            <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1">
              <AlertTriangle className="w-3 h-3" /> No product for this code
            </Badge>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Volume2 className="w-3 h-3" />
        <span>Uses admin catalog search (requires admin login).</span>
      </div>
    </div>
  );
}
