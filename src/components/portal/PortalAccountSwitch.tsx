import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Baby, Check, Loader2, User, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { portalApi, type PortalSwitchTarget } from "@/lib/api";
import {
  buildPortalAccountSwitchOptions,
  isPortalSwitchOptionActive,
  portalAccountKycHref,
  portalAccountKycVerified,
  portalAccountSwitchConfirmCopy,
  portalAccountSwitchMenuEligible,
  type PortalAccountSurface,
  type PortalAccountSwitchOption,
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
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PortalAccountSwitchOption | null>(null);

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
  const menuEligible = portalAccountSwitchMenuEligible(me, switchCtx);
  const options = useMemo(() => buildPortalAccountSwitchOptions(switchCtx), [switchCtx]);
  const loading = meLoading || ctxLoading;

  const applySwitch = useMutation({
    mutationFn: (target: PortalSwitchTarget) => portalApi.applyPortalSwitch(target),
    onSuccess: async (data) => {
      setConfirmOpen(false);
      setPending(null);
      setMenuOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
      toast.success("Portal switched successfully.");
      navigate(data.redirect, { replace: true });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not switch portal.");
    },
  });

  const handleTrigger = () => {
    if (loading) return;
    if (!kycVerified) {
      toast.message("Complete KYC verification to switch portals.");
      navigate(portalAccountKycHref(currentSurface));
    }
  };

  const openConfirm = (opt: PortalAccountSwitchOption) => {
    if (isPortalSwitchOptionActive(opt, switchCtx, currentSurface)) return;
    if (!kycVerified) {
      toast.message("Complete KYC verification to switch portals.");
      navigate(portalAccountKycHref(currentSurface));
      return;
    }
    setPending(opt);
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const confirmCopy = pending ? portalAccountSwitchConfirmCopy(pending.target) : null;

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
        aria-label={kycVerified ? "Account switcher" : "Complete KYC to switch portals"}
        title={kycVerified ? "Account switcher" : "Complete KYC to switch portals"}
        onClick={handleTrigger}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={cn("h-9 w-9 shrink-0", className)}
            aria-label="Switch portal role"
            title="Switch portal"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Switch portal
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((opt) => {
            const Icon = surfaceIcon(opt.surface);
            const active = isPortalSwitchOptionActive(opt, switchCtx, currentSurface);
            return (
              <DropdownMenuItem
                key={opt.target}
                disabled={active || applySwitch.isPending}
                className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                onClick={() => openConfirm(opt)}
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
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!applySwitch.isPending) {
            setConfirmOpen(open);
            if (!open) setPending(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title ?? "Switch portal?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applySwitch.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applySwitch.isPending || !pending}
              onClick={(e) => {
                e.preventDefault();
                if (!pending) return;
                applySwitch.mutate(pending.target);
              }}
            >
              {applySwitch.isPending ? "Switching…" : "Confirm switch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
