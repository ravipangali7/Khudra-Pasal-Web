import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export type PortalHeaderChromeValue = {
  toolbar: ReactNode;
  sidebar: ReactNode;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  /** Closes the mobile navigation drawer after a sidebar selection. */
  closeMobileMenu: () => void;
};

const PortalHeaderChromeContext = createContext<PortalHeaderChromeValue | null>(null);

export function usePortalHeaderChrome(): PortalHeaderChromeValue | null {
  return useContext(PortalHeaderChromeContext);
}

export { PortalHeaderChromeContext };
