import { useEffect, useState } from 'react';
import {
  AlertTriangle, Ban, ShieldAlert, Lock, Globe,
  Eye, CheckCircle, Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { adminApi, type AdminSecuritySummary } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError } from '../hooks/adminFormUtils';

type FlaggedRow = {
  id: string;
  user: string;
  type: string;
  severity: string;
  time: string;
  status?: string;
};
type AuditRow = {
  id: string;
  action: string;
  user: string;
  type: string;
  time: string;
  ip_address?: string | null;
};

export default function SecurityModule() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<FlaggedRow | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [secErr, setSecErr] = useState('');
  const [secOk, setSecOk] = useState(false);

  const { data: secSum } = useQuery<AdminSecuritySummary>({
    queryKey: ['admin', 'security', 'summary'],
    queryFn: () => adminApi.securitySummary(),
  });
  const { data: secSettings, isLoading: secLoading } = useQuery({
    queryKey: ['admin', 'security-settings'],
    queryFn: () => adminApi.securitySettings(),
  });
  const updateSec = useAdminMutation(adminApi.updateSecuritySettings, [['admin', 'security-settings']]);
  const patchFlag = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateFlaggedActivity(id, payload),
    [
      ['admin', 'flagged'],
      ['admin', 'security', 'summary'],
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
    ],
  );

  const [rbac, setRbac] = useState(true);
  const [dupPrev, setDupPrev] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [rateLimit, setRateLimit] = useState(true);

  useEffect(() => {
    if (!secSettings) return;
    setRbac(!!secSettings.rbac_enforced);
    setDupPrev(!!secSettings.duplicate_prevention);
    setAutoLock(!!secSettings.auto_lock_failed_logins);
    setRateLimit(!!secSettings.ip_rate_limiting);
    setSecErr('');
  }, [secSettings]);

  const saveSecuritySettings = async () => {
    setSecErr('');
    setSecOk(false);
    try {
      await updateSec.mutateAsync({
        otp_sensitive_crud: false,
        rbac_enforced: rbac,
        duplicate_prevention: dupPrev,
        auto_lock_failed_logins: autoLock,
        ip_rate_limiting: rateLimit,
      });
      setSecOk(true);
      setTimeout(() => setSecOk(false), 4000);
    } catch (e) {
      setSecErr(formatApiError(e));
    }
  };

  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });
  const canViewAuditTrail =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';

  const { data: flaggedActivities = [] } = useAdminList<FlaggedRow>(
    ['admin', 'flagged'],
    () => adminApi.flagged({ page_size: 200 }),
  );
  const { data: auditLogs = [], isError: auditErr } = useAdminList<AuditRow>(
    ['admin', 'audit-logs'],
    () => adminApi.auditLogs({ page_size: 200 }),
    { enabled: canViewAuditTrail },
  );

  const filtered = flaggedActivities.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const resolveFlag = async (id: string) => {
    try {
      await patchFlag.mutateAsync({ id, payload: { status: 'resolved' } });
    } catch (e) {
      setSecErr(formatApiError(e));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Security & Flags</h2>
        <p className="text-sm text-muted-foreground">Monitor security issues — data from the server</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <AdminStatCard
          icon={AlertTriangle}
          title="Open flags"
          value={secSum != null ? String(secSum.flagged_open) : '—'}
          color="red"
        />
        <AdminStatCard
          icon={Ban}
          title="Blocked users (inactive)"
          value={secSum != null ? String(secSum.blocked_users) : '—'}
          color="orange"
        />
        <AdminStatCard
          icon={ShieldAlert}
          title="Security audit (24h)"
          value={secSum != null ? String(secSum.security_audit_logs_24h) : '—'}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        <AdminStatCard
          icon={ShieldAlert}
          title="Flagged / blocked wallet txns"
          value={secSum != null ? String(secSum.flagged_wallet_txns) : '—'}
          color="cyan"
        />
        <AdminStatCard
          icon={CheckCircle}
          title="Resolved flags"
          value={secSum != null ? String(secSum.flagged_resolved) : '—'}
          color="green"
        />
        <AdminStatCard
          icon={Eye}
          title="Reviewed flags"
          value={secSum != null ? String(secSum.flagged_reviewed) : '—'}
          color="blue"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Security controls (persisted)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {secLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {[
                ['Role-based access', 'Enforce staff permissions', rbac, setRbac] as const,
                ['Duplicate prevention', 'Check duplicate users / vendors', dupPrev, setDupPrev] as const,
                ['Auto-lock failed logins', 'Lock accounts after repeated failures', autoLock, setAutoLock] as const,
                ['IP rate limiting', 'Throttle API abuse', rateLimit, setRateLimit] as const,
              ].map(([label, desc, on, setOn]) => (
                <div key={label} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => setOn(!!v)} />
                </div>
              ))}
              {secOk ? <p className="text-sm text-emerald-600">Saved.</p> : null}
              {secErr ? <p className="text-sm text-destructive">{secErr}</p> : null}
              <Button type="button" onClick={() => { void saveSecuritySettings(); }} disabled={updateSec.isPending}>
                Save security settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Flagged Activity Review</CardTitle>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No flagged activities matching filter.</p>
          )}
          {filtered.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    activity.severity === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : activity.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
                  )}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{activity.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.user} • {activity.time}
                    {activity.status ? ` • ${activity.status}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activity.severity === 'high'
                      ? 'destructive'
                      : activity.severity === 'medium'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {activity.severity}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(activity);
                    setReviewOpen(true);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" /> Review
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600"
                  disabled={patchFlag.isPending || activity.status === 'resolved'}
                  onClick={() => {
                    void resolveFlag(activity.id);
                  }}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" /> Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!canViewAuditTrail ? (
            <p className="text-sm text-muted-foreground py-2">
              Audit trail is only visible to super administrators. Open Audit Logs in the sidebar for the full history.
            </p>
          ) : auditErr ? (
            <p className="text-sm text-destructive py-2">Could not load audit trail.</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No audit entries yet.</p>
          ) : (
            auditLogs.map((log) => {
              const ip =
                log.ip_address != null && String(log.ip_address) !== ''
                  ? String(log.ip_address)
                  : '—';
              return (
                <div key={log.id} className="flex items-center justify-between p-2 text-sm border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                      {log.type}
                    </Badge>
                    <p className="text-foreground truncate">{log.action}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">by {log.user}</span>
                    <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">IP: {ip}</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CRUDModal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review Flagged Activity" onSave={() => setReviewOpen(false)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Activity Type</p>
                <p className="font-bold">{selected.type}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">User</p>
                <p className="font-bold">{selected.user}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Severity</p>
                <Badge variant={selected.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                  {selected.severity}
                </Badge>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-bold">{selected.time}</p>
              </div>
            </div>
            <div>
              <Label>Resolution Note</Label>
              <Textarea placeholder="Document your review…" rows={3} />
            </div>
            <div>
              <Label className="mb-2 block">Action</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    void resolveFlag(selected.id);
                    setReviewOpen(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                </Button>
                <Button variant="destructive" type="button" disabled>
                  <Ban className="w-4 h-4 mr-2" /> Block User
                </Button>
                <Button variant="outline" type="button" disabled>
                  <Globe className="w-4 h-4 mr-2" /> Block IP
                </Button>
                <Button variant="outline" type="button" disabled>
                  <Trash2 className="w-4 h-4 mr-2" /> Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}
