import { createContext, useContext } from "react";
import type { VendorCrudAction } from "./moduleRegistry";

export type VendorRouteContextValue = {
  moduleId: string;
  action: VendorCrudAction;
  itemId?: string;
  navigateToList: () => void;
  navigateToAdd: () => void;
  navigateToEdit: (id: string) => void;
};

export const VendorRouteContext = createContext<VendorRouteContextValue | null>(null);

export function useVendorRouteContext() {
  return useContext(VendorRouteContext);
}
