import { useMemo } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export type FaqAccordionItem = {
  id: string;
  question: string;
  answer: string;
  surface?: string;
};

function surfaceLabel(s: string) {
  if (s === 'vendor') return 'Vendor';
  if (s === 'customer') return 'Customer';
  if (s === 'general') return 'General';
  return s;
}

export default function FaqAccordionSection({
  faqs,
  title = 'Frequently asked questions',
  isLoading = false,
}: {
  faqs: FaqAccordionItem[];
  title?: string;
  isLoading?: boolean;
}) {
  const faqBySurface = useMemo(() => {
    const m = new Map<string, FaqAccordionItem[]>();
    for (const f of faqs) {
      const key = String(f.surface ?? 'general');
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(f);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [faqs]);

  return (
    <section className="w-full bg-card rounded-xl border border-border p-4 md:p-6 space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <HelpCircle className="w-5 h-5 shrink-0" />
        {title}
      </h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No FAQs published yet.</p>
      ) : (
        <div className="space-y-8 w-full">
          {faqBySurface.map(([surface, items]) => (
            <div key={surface}>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {surfaceLabel(surface)}
              </h4>
              <Accordion type="single" collapsible className="w-full">
                {items.map((f) => (
                  <AccordionItem key={f.id} value={`${surface}-${f.id}`}>
                    <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {f.answer}
                    </AccordionContent>
                </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
