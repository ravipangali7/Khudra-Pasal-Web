import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import AuthBrandingPanelLogin, { type CategoryPill } from "./AuthBrandingPanelLogin";
import AuthSplitShell from "./AuthSplitShell";
import UnifiedLoginForm, { type UnifiedLoginFormProps } from "./UnifiedLoginForm";

export type UnifiedAuthLoginPageProps = {
  categoryPills?: CategoryPill[];
  formProps?: UnifiedLoginFormProps;
  /** Admin portal uses distinct copy; default is customer storefront login. */
  variant?: "default" | "admin";
};

export default function UnifiedAuthLoginPage({
  categoryPills,
  formProps,
  variant = "default",
}: UnifiedAuthLoginPageProps) {
  const isAdmin = variant === "admin";
  const backLabel = isAdmin ? "Back to store" : "Back to shop";
  const title = isAdmin ? "Admin sign-in" : "Welcome Back!";
  const subtitle = isAdmin
    ? "Sign in with an admin account to open the dashboard."
    : "Login to continue shopping";

  return (
    <AuthSplitShell
      left={<AuthBrandingPanelLogin categoryPills={categoryPills} />}
      right={
        <div className="flex-1 flex flex-col bg-white min-h-[50vh] lg:min-h-screen">
          <header className="p-4 lg:p-6 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors w-fit text-sm"
            >
              <ChevronLeft className="w-5 h-5" />
              {backLabel}
            </Link>
          </header>
          <main className="flex-1 flex items-center justify-center p-4 lg:p-8 pb-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8 lg:mb-10">
                <Link to="/" className="inline-block lg:hidden">
                  <img src={logo} alt="Khudra Pasal" className="h-14 w-auto mx-auto mb-4" />
                </Link>
                <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">{title}</h1>
                <p className="text-neutral-500">{subtitle}</p>
              </div>
              <UnifiedLoginForm {...formProps} />
            </div>
          </main>
        </div>
      }
    />
  );
}
