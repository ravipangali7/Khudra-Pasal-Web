import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Baby, Check, Loader2, User, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { portalApi } from "@/lib/api";
import {
  buildPortalAccountSwitchOptions,
  portalAccountDashboardHref,
  portalAccountKycHref,
  portalAccountKycVerified,
  portalAccountSwitchMenuEligible,
  type PortalAccountSurface,
} from "@/lib/portalAccountSwitch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PortalAccountSwitchProps = {
  currentSurface: PortalAccountSurface;
  className?: string;
};

function surfaceIcon(surface: PortalAccountSurface) {
  if (surface === "family") return UsersRound;
  if (surface === "child") return Baby;
  return User;
}

export default function PortalAccountSwitch({ currentSurface, className }: PortalAccountSwitchProps) {
  const navigate = useNavigate();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["portal", "me", "account-switch"],
    queryFn: () => portalApi.me(),
    staleTime: 30_000,
  });

  const { data: switchCtx, isLoading: ctxLoading } = useQuery({
    queryKey: ["portal", "switch-portal-context", "account-switch"],
    queryFn: () => portalApi.switchPortalContext(),
    staleTime: 30_000,
  });

  const kycVerified = portalAccountKycVerified(me);
  const menuEligible = portalAccountSwitchMenuEligible(me, switchCtx, currentSurface);
  const options = useMemo(() => buildPortalAccountSwitchOptions(switchCtx), [switchCtx]);
  const loading = meLoading || ctxLoading;

  const handleTrigger = () => {
    if (loading) return;
    if (!kycVerified) {
      toast.message("Complete KYC verification to switch accounts.");
      navigate(portalAccountKycHref(currentSurface));
      return;
    }
    if (!options.some((o) => o.surface !== currentSurface)) {
      toast.message("No other account types are available for your profile.");
    }
  };

  const handleSelect = (surface: PortalAccountSurface, href: string) => {
    if (surface === currentSurface) return;
    if (!kycVerified) {
      toast.message("Complete KYC verification to switch accounts.");
      navigate(portalAccountKycHref(currentSurface));
      return;
    }
    navigate(href);
  };

  if (loading) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={cn("h-9 w-9 shrink-0", className)}
        disabled
        aria-label="Loading account switcher"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!menuEligible) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={cn("h-9 w-9 shrink-0", className)}
        aria-label={kycVerified ? "Account switcher" : "Complete KYC to switch accounts"}
        title={kycVerified ? "Account switcher" : "Complete KYC to switch accounts"}
        onClick={handleTrigger}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn("h-9 w-9 shrink-0", className)}
          aria-label="Switch account type"
          title="Switch account"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Switch account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => {
          const Icon = surfaceIcon(opt.surface);
          const active = opt.surface === currentSurface;
          return (
            <DropdownMenuItem
              key={opt.surface}
              disabled={active}
              className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
              onClick={() => handleSelect(opt.surface, opt.href)}
            >
              <span className="flex w-full items-center gap-2 font-medium">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{opt.label}</span>
                {active ? <Check className="h-4 w-4 text-emerald-600" /> : null}
              </span>
              <span className="pl-6 text-xs text-muted-foreground font-normal">{opt.description}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs text-muted-foreground"
          onClick={() => navigate(portalAccountDashboardHref(currentSurface))}
        >
          Stay on current portal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
