import { useQuery } from "@tanstack/react-query";
import { portalApi } from "@/lib/api";
import { portalRoleDisplayLabel } from "@/lib/portalRoleLabels";
import { cn } from "@/lib/utils";

type PortalActiveRoleBadgeProps = {
  className?: string;
};

/** Shows the current portal role from `/portal/me/` (updates after switch-portal). */
export default function PortalActiveRoleBadge({ className }: PortalActiveRoleBadgeProps) {
  const { data: me } = useQuery({
    queryKey: ["portal", "me", "active-role-badge"],
    queryFn: () => portalApi.me(),
    staleTime: 0,
  });

  const label = portalRoleDisplayLabel(me?.role);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      Active portal: {label}
    </div>
  );
}
