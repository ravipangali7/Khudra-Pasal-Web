import type { ReactNode } from "react";

type AuthSplitShellProps = {
  left: ReactNode;
  right: ReactNode;
};

export default function AuthSplitShell({ left, right }: AuthSplitShellProps) {
  return <div className="min-h-screen flex flex-col lg:flex-row">{left}{right}</div>;
}
