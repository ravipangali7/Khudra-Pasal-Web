import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api';
import SupportTicketsHub from '@/components/support/SupportTicketsHub';
import FaqAccordionSection from '@/components/support/FaqAccordionSection';

export default function PortalSupportSection() {
  const { data: faqData, isLoading: faqLoading } = useQuery({
    queryKey: ['portal', 'support-faqs'],
    queryFn: () => portalApi.supportFaqs(),
  });

  const faqs = faqData?.results ?? [];

  return (
    <div className="w-full max-w-none space-y-8 md:space-y-10">
      <SupportTicketsHub
        variant="portal"
        listQueryKey={['portal', 'support-tickets']}
        title="Support"
        subtitle="FAQs below, or open a ticket and chat with our team."
      />

      <FaqAccordionSection faqs={faqs} isLoading={faqLoading} />
    </div>
  );
}
