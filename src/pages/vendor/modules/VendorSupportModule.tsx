import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '@/lib/api';
import SupportTicketsHub from '@/components/support/SupportTicketsHub';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function VendorSupportModule({ activeSection }: { activeSection: string }) {
  const isFaq = activeSection === 'faq';

  const { data: faqData } = useQuery({
    queryKey: ['vendor', 'faqs'],
    queryFn: () => vendorApi.faqs(),
    enabled: isFaq,
  });
  const faqs = faqData?.results ?? [];

  const faqBySurface = useMemo(() => {
    const m = new Map<string, typeof faqs>();
    for (const f of faqs) {
      const key = String(f.surface ?? 'general');
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(f);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [faqs]);

  const surfaceLabel = (s: string) => {
    if (s === 'vendor') return 'Vendor';
    if (s === 'customer') return 'Customer';
    if (s === 'general') return 'General';
    return s;
  };

  if (isFaq) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl space-y-8">
        <h2 className="text-lg font-semibold">FAQs</h2>
        {faqBySurface.map(([surface, items]) => (
          <section key={surface}>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {surfaceLabel(surface)}
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {items.map((f) => (
                <AccordionItem key={String(f.id)} value={`${surface}-${String(f.id)}`}>
                  <AccordionTrigger className="text-left">{String(f.question)}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                    {String(f.answer)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">No FAQs published yet.</p>}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <SupportTicketsHub
        variant="vendor"
        listQueryKey={['vendor', 'tickets']}
        title="Support tickets"
        subtitle="Open a ticket and message the Khudra Pasal team."
      />
    </div>
  );
}
