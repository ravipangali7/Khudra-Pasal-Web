import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Eye,
  Users,
} from 'lucide-react';
import {
  adminApi,
  type AdminCustomerGroupHierarchy,
  type AdminCustomerHierarchyUser,
} from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { resolveMediaUrlForDisplay } from '@/pages/admin/hooks/adminFormUtils';

type CustomerGroupsHierarchyProps = {
  onViewCustomer?: (userId: string) => void;
};

function KycBadge({ status }: { status: string }) {
  const verified = status === 'verified';
  return (
    <Badge variant={verified ? 'outline' : 'secondary'} className="text-xs shrink-0">
      {verified ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );
}

function CustomerAccountRow({
  user,
  depth,
  onView,
}: {
  user: AdminCustomerHierarchyUser;
  depth: number;
  onView?: (id: string) => void;
}) {
  const av = user.avatar ? resolveMediaUrlForDisplay(user.avatar) : '';
  const membership = user.membership_role || user.role;
  const balance = Number(user.wallet_balance ?? 0);
  const orders = Number(user.order_count ?? 0);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 sm:gap-3 py-2.5 px-3 rounded-lg border bg-card/50',
        depth === 1 && 'border-l-2 border-l-primary/30',
        depth === 2 && 'border-l-2 border-l-muted-foreground/25',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        {av ? <AvatarImage src={av} alt="" className="object-cover" /> : null}
        <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-[140px]">
        <p className="font-medium text-sm leading-tight">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.phone}</p>
        {user.email ? <p className="text-xs text-muted-foreground truncate">{user.email}</p> : null}
      </div>
      <Badge variant={user.role === 'parent' ? 'default' : 'secondary'} className="text-xs capitalize shrink-0">
        {membership}
      </Badge>
      <KycBadge status={user.kyc_status} />
      <span className="text-xs text-muted-foreground hidden sm:inline">Rs. {balance.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground hidden md:inline">{orders} orders</span>
      {onView ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 ml-auto"
          onClick={() => onView(String(user.id))}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ) : null}
    </div>
  );
}

function ParentBranch({
  parent,
  onView,
}: {
  parent: AdminCustomerHierarchyUser;
  onView?: (id: string) => void;
}) {
  const children = parent.children ?? [];
  const [open, setOpen] = useState(true);

  if (!children.length) {
    return (
      <div className="ml-4 sm:ml-6">
        <CustomerAccountRow user={parent} depth={1} onView={onView} />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="ml-4 sm:ml-6">
      <div className="flex items-start gap-1">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 mt-2">
            {open ? (
              <ChevronDown className="w-4 h-4 text-primary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <div className="flex-1 space-y-2">
          <CustomerAccountRow user={parent} depth={1} onView={onView} />
          <CollapsibleContent className="space-y-2 pl-2">
            {children.map((child) => (
              <CustomerAccountRow key={child.id} user={child} depth={2} onView={onView} />
            ))}
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}

function GroupBranch({
  group,
  onView,
}: {
  group: AdminCustomerGroupHierarchy;
  onView?: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const parentCount = group.parents.length;
  const childCount = useMemo(
    () => group.parents.reduce((n, p) => n + (p.children?.length ?? 0), 0),
    [group.parents],
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-muted/20">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between h-auto min-h-12 px-4 py-3 rounded-xl hover:bg-muted/40"
        >
          <div className="flex items-center gap-2 text-left">
            {open ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-primary" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            )}
            <Users className="w-4 h-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-sm">{group.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {group.type} · {parentCount} parent{parentCount === 1 ? '' : 's'}
                {childCount > 0 ? ` · ${childCount} child${childCount === 1 ? '' : 'ren'}` : ''}
              </p>
            </div>
          </div>
          <Badge variant={group.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize shrink-0">
            {group.status}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-2">
        {group.parents.map((parent) => (
          <ParentBranch key={`${group.id}-${parent.id}`} parent={parent} onView={onView} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CustomerGroupsHierarchy({ onViewCustomer }: CustomerGroupsHierarchyProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-customers-grouped'],
    queryFn: () => adminApi.customerGroupsHierarchy(),
    staleTime: 60_000,
  });

  const groups = data?.groups ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Family groups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading groups…</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !groups.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Family groups</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customers organized by group, parent account, and child accounts.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => (
          <GroupBranch key={group.id} group={group} onView={onViewCustomer} />
        ))}
      </CardContent>
    </Card>
  );
}
