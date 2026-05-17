import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MessageDeliveryTicks({ ticks }: { ticks: 1 | 2 | 3 }) {
  const title = ticks === 3 ? 'Read' : ticks === 2 ? 'Delivered' : 'Sent';
  return (
    <span className="inline-flex items-center shrink-0" title={title} aria-hidden>
      {ticks === 1 ? (
        <Check className="h-3.5 w-3.5 opacity-85" strokeWidth={2.5} />
      ) : (
        <CheckCheck
          className={cn('h-3.5 w-3.5 opacity-95', ticks === 3 && 'text-sky-300')}
          strokeWidth={2.5}
        />
      )}
    </span>
  );
}
