import { createContext, useContext } from "react";
import type { AdminCrudAction } from "./moduleRegistry";

export type AdminRouteContextValue = {
  moduleId: string;
  action: AdminCrudAction;
  itemId?: string;
  navigateToList: () => void;
  navigateToAdd: () => void;
  navigateToEdit: (id: string) => void;
  navigateToView: (id: string) => void;
};

export const AdminRouteContext = createContext<AdminRouteContextValue | null>(null);

export function useAdminRouteContext() {
  return useContext(AdminRouteContext);
}
