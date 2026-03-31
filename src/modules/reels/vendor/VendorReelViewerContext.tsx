import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import VendorReelsViewerOverlay from './VendorReelsViewerOverlay';

type VendorReelViewerContextValue = {
  openReelViewer: (reelId: number) => void;
};

const VendorReelViewerContext = createContext<VendorReelViewerContextValue | null>(null);

export function useVendorReelViewer(): VendorReelViewerContextValue | null {
  return useContext(VendorReelViewerContext);
}

type ProviderProps = {
  children: React.ReactNode;
  vendorNumericId: number | null;
};

export function VendorReelViewerProvider({ children, vendorNumericId }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [initialReelId, setInitialReelId] = useState<number | null>(null);

  const openReelViewer = useCallback((reelId: number) => {
    setInitialReelId(reelId);
    setOpen(true);
  }, []);

  const closeReelViewer = useCallback(() => {
    setOpen(false);
    setInitialReelId(null);
  }, []);

  const value = useMemo(() => ({ openReelViewer }), [openReelViewer]);

  return (
    <VendorReelViewerContext.Provider value={value}>
      {children}
      {vendorNumericId != null && open && initialReelId != null && (
        <VendorReelsViewerOverlay
          vendorId={vendorNumericId}
          initialReelId={initialReelId}
          onClose={closeReelViewer}
        />
      )}
    </VendorReelViewerContext.Provider>
  );
}
