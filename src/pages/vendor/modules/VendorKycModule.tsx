import { useNavigate } from 'react-router-dom';
import PortalKycSection from '@/components/portal/PortalKycSection';

export default function VendorKycModule() {
  const navigate = useNavigate();
  return <PortalKycSection onBack={() => navigate('/vendor/withdrawals')} />;
}
