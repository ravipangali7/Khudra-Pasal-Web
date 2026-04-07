import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '@/lib/api';
import MyReelsGrid from '@/modules/reels/vendor/MyReelsGrid';
import { buildVendorModulePath } from '../moduleRegistry';

/**
 * All reels for the authenticated vendor only (no global vendor directory).
 */
export default function VendorAllReelsModule() {
  const navigate = useNavigate();
  const { data: vMe } = useQuery({
    queryKey: ['vendor', 'me'],
    queryFn: () => vendorApi.me(),
  });
  const vendorId = vMe?.id != null ? String(vMe.id) : null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">All Reels</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your store&apos;s reels. Upload and manage content from My Reels — only your account is shown here.
        </p>
      </div>

      <MyReelsGrid
        useVendorPortal
        vendorId={vendorId}
        onNewReel={() => navigate(buildVendorModulePath('upload-reel'))}
      />
    </div>
  );
}
