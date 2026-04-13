import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api';
import SupportTicketsHub, { type SupportTicketsHubHandle } from '@/components/support/SupportTicketsHub';
import SupportSuperAdminSidebarCard from '@/components/support/SupportSuperAdminSidebarCard';
import FaqAccordionSection from '@/components/support/FaqAccordionSection';

export default function PortalSupportSection() {
  const hubRef = useRef<SupportTicketsHubHandle>(null);
  const { data: faqData, isLoading: faqLoading } = useQuery({
    queryKey: ['portal', 'support-faqs'],
    queryFn: () => portalApi.supportFaqs(),
  });

  const faqs = faqData?.results ?? [];

  return (
    <div className="w-full max-w-none space-y-8 md:space-y-10">
      <SupportSuperAdminSidebarCard
        variant="portal"
        className="max-w-xl"
        onOpenMessages={() => hubRef.current?.openMessages()}
      />

      <SupportTicketsHub
        ref={hubRef}
        variant="portal"
        listQueryKey={['portal', 'support-tickets']}
        title="Support"
        subtitle="FAQs below, or open a ticket and chat with our team."
      />

      <FaqAccordionSection faqs={faqs} isLoading={faqLoading} />
    </div>
  );
}
