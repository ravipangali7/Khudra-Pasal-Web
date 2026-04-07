import { useQuery } from '@tanstack/react-query';
import MyReelsGrid from '@/modules/reels/vendor/MyReelsGrid';
import ReelUploadForm from '@/modules/reels/vendor/ReelUploadForm';
import { vendorApi } from '@/lib/api';
import { buildVendorModulePath } from '../moduleRegistry';
import { useNavigate } from 'react-router-dom';

export default function VendorReelsModule({ activeSection }: { activeSection: string }) {
  const navigate = useNavigate();
  const { data: vMe } = useQuery({ queryKey: ['vendor', 'me'], queryFn: () => vendorApi.me() });
  const vendorId = vMe?.id != null ? String(vMe.id) : null;

  if (activeSection === 'upload-reel') {
    return (
      <div className="p-4 lg:p-6">
        <ReelUploadForm
          vendorId={vendorId}
          variant="portal"
          onPublished={() => navigate(buildVendorModulePath('my-reels'))}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <MyReelsGrid
        useVendorPortal
        vendorId={vendorId}
        onNewReel={() => navigate(buildVendorModulePath('upload-reel'))}
      />
    </div>
  );
}
