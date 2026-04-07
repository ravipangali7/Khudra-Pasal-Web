import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MyReelsGrid from '@/modules/reels/vendor/MyReelsGrid';
import ReelUploadForm from '@/modules/reels/vendor/ReelUploadForm';
import { vendorApi } from '@/lib/api';
import { buildVendorModulePath } from '../moduleRegistry';
import { Button } from '@/components/ui/button';

export default function VendorReelsModule() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [manualUploadOpen, setManualUploadOpen] = useState(false);

  const uploadFromQuery = searchParams.get('upload') === '1';
  const showUpload = uploadFromQuery || manualUploadOpen;

  const { data: vMe } = useQuery({ queryKey: ['vendor', 'me'], queryFn: () => vendorApi.me() });
  const vendorId = vMe?.id != null ? String(vMe.id) : null;

  const closeUpload = useCallback(() => {
    setManualUploadOpen(false);
    if (searchParams.get('upload') === '1') {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('upload');
          return p;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const myReelsPath = useMemo(() => buildVendorModulePath('my-reels'), []);

  const handlePublished = useCallback(() => {
    setManualUploadOpen(false);
    navigate(myReelsPath, { replace: true });
  }, [navigate, myReelsPath]);

  if (showUpload) {
    return (
      <div className="p-4 lg:p-6 vendor-reels-light space-y-4">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 gap-2" onClick={closeUpload}>
          <ArrowLeft className="h-4 w-4" />
          Back to My Reels
        </Button>
        <ReelUploadForm vendorId={vendorId} variant="portal" onPublished={handlePublished} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 vendor-reels-light">
      <MyReelsGrid
        useVendorPortal
        vendorId={vendorId}
        onNewReel={() => setManualUploadOpen(true)}
      />
    </div>
  );
}
