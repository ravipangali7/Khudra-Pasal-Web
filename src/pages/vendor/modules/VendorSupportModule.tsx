import SupportTicketsHub from '@/components/support/SupportTicketsHub';

export default function VendorSupportModule() {
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
