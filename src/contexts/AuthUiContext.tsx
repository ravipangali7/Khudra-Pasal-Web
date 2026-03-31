import { createContext, useCallback, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

type AuthUiContextValue = {
  openLoginSheet: () => void;
  openSignupSheet: () => void;
  closeLoginSheet: () => void;
};

const AuthUiContext = createContext<AuthUiContextValue | null>(null);

export function AuthUiProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const openLoginSheet = useCallback(() => navigate("/login"), [navigate]);
  const openSignupSheet = useCallback(() => navigate("/signup"), [navigate]);
  const closeLoginSheet = useCallback(() => {}, []);

  const value = useMemo(
    () => ({ openLoginSheet, openSignupSheet, closeLoginSheet }),
    [openLoginSheet, openSignupSheet, closeLoginSheet],
  );

  return <AuthUiContext.Provider value={value}>{children}</AuthUiContext.Provider>;
}

export function useAuthUi() {
  const ctx = useContext(AuthUiContext);
  if (!ctx) {
    throw new Error("useAuthUi must be used within AuthUiProvider");
  }
  return ctx;
}
