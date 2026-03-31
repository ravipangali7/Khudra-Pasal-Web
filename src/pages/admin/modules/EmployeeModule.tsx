import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Shield, Ban, CheckCircle, Plus, Lock, Edit, Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AdminTable from '@/components/admin/AdminTable';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { ADMIN_ROLE_PERMISSION_KEYS, normalizeRolePermissions } from '@/lib/adminPermissionKeys';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError } from '../hooks/adminFormUtils';
import AuditLogsModule from './AuditLogsModule';

type EmployeeApiRow = {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  role_id?: string;
  role: string;
  status: string;
  modules_access?: string[];
};
type EmployeeUiRow = EmployeeApiRow & { modules: string; lastLogin: string };
type RoleApiRow = {
  id: string;
  name: string;
  status: string;
  is_system: boolean;
  permissions?: Record<string, boolean>;
  assigned_count?: number;
};
type RoleUiRow = { id: string; name: string; status: string; users: number; is_system: boolean; permissions?: Record<string, boolean> };

type AuditApiRow = {
  id: string;
  action: string;
  user: string;
  type: string;
  time: string;
  ip_address?: string | null;
};

interface EmployeeModuleProps {
  activeSection: string;
}

export default function EmployeeModule({ activeSection }: EmployeeModuleProps) {
  switch (activeSection) {
    case 'roles': return <RolesView />;
    case 'audit-logs': return <AuditLogsModule />;
    default: return <EmployeesView />;
  }
}

function EmployeesView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<EmployeeUiRow | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRoleId, setEmpRoleId] = useState('');
  const [empModules, setEmpModules] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empStatus, setEmpStatus] = useState('active');
  const [empErr, setEmpErr] = useState('');
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<EmployeeUiRow | null>(null);
  const [toggleErr, setToggleErr] = useState('');

  const { data: apiEmployees = [], isLoading, isError } = useAdminList<EmployeeApiRow>(
    ['admin', 'employees'],
    () => adminApi.employees({ page_size: 200 }),
  );
  const { data: rolesApi = [] } = useAdminList<RoleApiRow>(['admin', 'roles-count'], () => adminApi.roles({ page_size: 200 }));
  const { data: profile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
  });
  const canViewAuditSnippet =
    Boolean(profile?.is_superuser) || profile?.role === 'super_admin';
  const { data: auditApi = [] } = useAdminList<AuditApiRow>(
    ['admin', 'audit-logs-count'],
    () => adminApi.auditLogs({ page_size: 5 }),
    { enabled: canViewAuditSnippet },
  );
  const createEmp = useAdminMutation(
    adminApi.createEmployee,
    [['admin', 'employees']],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );
  const updateEmp = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateEmployee(id, payload),
    [['admin', 'employees']],
    () => [
      ['admin', 'audit-logs'],
      ['admin', 'employee-audit-logs'],
      ['admin', 'audit-logs-count'],
    ],
  );

  const employees: EmployeeUiRow[] = apiEmployees.map((e) => ({
    ...e,
    phone: e.phone || '—',
    modules: e.modules_access?.length ? e.modules_access.join(', ') : '—',
    lastLogin: '—',
  }));
  const roleNames = [...new Set(employees.map((e) => e.role))];

  const filtered = employees.filter((e) => {
    if (roleFilter !== 'all' && e.role !== roleFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const openEmp = (row: EmployeeUiRow | null) => {
    setEmpErr('');
    setEditRow(row);
    if (row) {
      setEmpName(row.name);
      setEmpEmail(row.email);
      setEmpPhone(row.phone === '—' ? '' : row.phone);
      setEmpRoleId(row.role_id || '');
      setEmpModules(row.modules_access?.join(', ') || '');
      setEmpPassword('');
      setEmpStatus(row.status || 'active');
    } else {
      setEmpName('');
      setEmpEmail('');
      setEmpPhone('');
      setEmpRoleId(rolesApi[0]?.id ?? '');
      setEmpModules(ADMIN_ROLE_PERMISSION_KEYS.map(([k]) => k).join(', '));
      setEmpPassword('');
      setEmpStatus('active');
    }
    setModalOpen(true);
  };

  const saveEmp = async () => {
    setEmpErr('');
    const modules_access = empModules
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      if (editRow) {
        if (!empName.trim() || !empPhone.trim() || !empRoleId) {
          setEmpErr('Name, phone, and role are required.');
          return;
        }
        const payload: Record<string, unknown> = {
          name: empName.trim(),
          email: empEmail.trim(),
          phone: empPhone.trim(),
          role_id: empRoleId,
          status: empStatus,
          modules_access,
        };
        if (empPassword.trim()) payload.password = empPassword.trim();
        await updateEmp.mutateAsync({
          id: editRow.id,
          payload,
        });
      } else {
        if (!empName.trim() || !empPhone.trim() || !empRoleId) {
          setEmpErr('Name, phone, and role are required.');
          return;
        }
        await createEmp.mutateAsync({
          name: empName.trim(),
          phone: empPhone.trim(),
          email: empEmail.trim(),
          password: empPassword || undefined,
          role_id: empRoleId,
          modules_access,
        });
      }
      setModalOpen(false);
      setEditRow(null);
    } catch (e) {
      setEmpErr(formatApiError(e));
    }
  };

  const confirmToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleErr('');
    try {
      await updateEmp.mutateAsync({
        id: toggleTarget.id,
        payload: { status: toggleTarget.status === 'active' ? 'inactive' : 'active' },
      });
      setToggleOpen(false);
      setToggleTarget(null);
    } catch (err) {
      setToggleErr(formatApiError(err));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading employees…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load employees.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {empErr ? <p className="text-sm text-destructive">{empErr}</p> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Users} title="Total Employees" value={employees.length} color="blue" />
        <AdminStatCard icon={CheckCircle} title="Active" value={employees.filter((e) => e.status === 'active').length} color="green" />
        <AdminStatCard icon={Shield} title="Roles" value={rolesApi.length} color="purple" />
        <AdminStatCard
          icon={Lock}
          title="Recent audit rows"
          value={canViewAuditSnippet ? String(auditApi.length) : '—'}
          color="orange"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Filter by Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleNames.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminTable
        title="Employees"
        subtitle="Manage staff accounts — assign roles, control module access"
        data={filtered}
        columns={[
          { key: 'name', label: 'Name', render: (e) => (
            <div><p className="font-medium text-sm">{e.name}</p><p className="text-xs text-muted-foreground">{e.email}</p></div>
          )},
          { key: 'role', label: 'Role', render: (e) => <Badge variant="outline" className="text-xs capitalize">{e.role.replace('_', ' ')}</Badge> },
          { key: 'phone', label: 'Phone' },
          { key: 'modules', label: 'Access', render: (e) => <span className="text-xs text-muted-foreground">{e.modules}</span> },
          { key: 'lastLogin', label: 'Last Login' },
          { key: 'status', label: 'Status', render: (e) => (
            <Badge variant={e.status === 'active' ? 'default' : 'destructive'}
              className={cn("text-xs", e.status === 'active' && "bg-emerald-500")}>
              {e.status}
            </Badge>
          )},
          { key: 'actions', label: '', render: (e) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => openEmp(e)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" className={cn('h-7', e.status === 'active' ? 'text-destructive' : 'text-emerald-600')} onClick={() => { setToggleErr(''); setToggleTarget(e); setToggleOpen(true); }}>
                {e.status === 'active' ? <><Ban className="w-3 h-3 mr-1" /> Disable</> : <><CheckCircle className="w-3 h-3 mr-1" /> Enable</>}
              </Button>
            </div>
          )},
        ]}
        onAdd={() => openEmp(null)} addLabel="Add Employee" onExport={() => {}} onFilter={() => {}}
      />

      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRow(null); setEmpErr(''); }}
        title={editRow ? 'Edit Employee' : 'Add Employee'}
        onSave={saveEmp}
        loading={createEmp.isPending || updateEmp.isPending}
        error={empErr}
      >
        <div className="space-y-4">
          <div><Label>Full Name</Label><Input value={empName} onChange={(ev) => setEmpName(ev.target.value)} placeholder="Employee name" /></div>
          <div><Label>Email</Label><Input type="email" value={empEmail} onChange={(ev) => setEmpEmail(ev.target.value)} placeholder="employee@khudra.com" /></div>
          <div><Label>Phone</Label><Input value={empPhone} onChange={(ev) => setEmpPhone(ev.target.value)} placeholder="98XXXXXXXX" /></div>
          <div><Label>{editRow ? 'New password (optional)' : 'Password'}</Label><Input type="password" value={empPassword} onChange={(ev) => setEmpPassword(ev.target.value)} placeholder={editRow ? 'Leave blank to keep current' : 'Initial password'} /></div>
          {editRow ? (
            <div><Label>Account status</Label>
              <Select value={empStatus} onValueChange={setEmpStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div><Label>Role</Label>
            <Select value={empRoleId || undefined} onValueChange={setEmpRoleId}>
              <SelectTrigger><SelectValue placeholder="Assign role" /></SelectTrigger>
              <SelectContent>
                {rolesApi.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}{r.is_system ? ' (system)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Module access (nav keys, comma-separated)</Label><Input value={empModules} onChange={(ev) => setEmpModules(ev.target.value)} placeholder="dashboard, products, orders" /></div>
        </div>
      </CRUDModal>

      <DeleteConfirm
        open={toggleOpen}
        onClose={() => { setToggleOpen(false); setToggleTarget(null); setToggleErr(''); }}
        onConfirm={() => { void confirmToggleStatus(); }}
        loading={updateEmp.isPending}
        title={toggleTarget?.status === 'active' ? `Disable "${toggleTarget?.name}"?` : `Enable "${toggleTarget?.name}"?`}
        description={toggleErr || (toggleTarget?.status === 'active'
          ? 'They will not be able to sign in until re-enabled.'
          : 'Their account will be marked active again.')}
      />
    </div>
  );
}

function emptyPermMap(): Record<string, boolean> {
  return Object.fromEntries(ADMIN_ROLE_PERMISSION_KEYS.map(([k]) => [k, false]));
}

function RolesView() {
  const permSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPermPayload = useRef<Record<string, Record<string, boolean>>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newPerm, setNewPerm] = useState<Record<string, boolean>>(() => emptyPermMap());
  const [permEdits, setPermEdits] = useState<Record<string, Record<string, boolean>>>({});
  const [roleErr, setRoleErr] = useState('');
  const [editRoleNameOpen, setEditRoleNameOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleUiRow | null>(null);
  const [editRoleNameInput, setEditRoleNameInput] = useState('');
  const [editRoleNameErr, setEditRoleNameErr] = useState('');
  const [roleDeleteOpen, setRoleDeleteOpen] = useState(false);
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<RoleUiRow | null>(null);
  const [roleDeleteErr, setRoleDeleteErr] = useState('');

  const { data: catalog } = useQuery({
    queryKey: ['admin', 'account-portal-catalog'],
    queryFn: () => adminApi.accountPortalCatalog(),
  });

  const { data: rolesRaw = [], isLoading, isError } = useAdminList<RoleApiRow>(
    ['admin', 'roles'],
    () => adminApi.roles({ page_size: 200 }),
  );
  const invalidateAuditListKeys = () =>
    [['admin', 'audit-logs'], ['admin', 'employee-audit-logs'], ['admin', 'audit-logs-count']] as const;
  const updateRoleMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateRole(id, payload),
    [['admin', 'roles'], ['admin', 'roles-count']],
    () => [...invalidateAuditListKeys()],
  );
  const createRoleMut = useAdminMutation(
    adminApi.createRole,
    [['admin', 'roles'], ['admin', 'roles-count']],
    () => [...invalidateAuditListKeys()],
  );
  const deleteRoleMut = useAdminMutation(
    adminApi.deleteRole,
    [['admin', 'roles'], ['admin', 'roles-count']],
    () => [...invalidateAuditListKeys()],
  );

  useEffect(() => {
    setPermEdits(() => {
      const next: Record<string, Record<string, boolean>> = {};
      for (const r of rolesRaw) {
        const fromApi = normalizeRolePermissions(
          r.permissions as Record<string, unknown> | undefined,
        );
        next[r.id] = { ...emptyPermMap(), ...fromApi };
      }
      return next;
    });
  }, [rolesRaw]);

  const roles: RoleUiRow[] = rolesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.is_system ? 'system' : r.status,
    users: typeof r.assigned_count === 'number' ? r.assigned_count : 0,
    is_system: r.is_system,
    permissions: r.permissions,
  }));

  const togglePerm = (roleId: string, key: string) => {
    setPermEdits((pe) => {
      const row = rolesRaw.find((r) => r.id === roleId);
      const base = normalizeRolePermissions(
        row?.permissions as Record<string, unknown> | undefined,
      );
      const prev = { ...emptyPermMap(), ...base, ...pe[roleId] };
      const next = { ...prev, [key]: !prev[key] };
      const mergedForApi = { ...base, ...next };
      const merged = { ...pe, [roleId]: next };
      pendingPermPayload.current[roleId] = mergedForApi;
      const prevT = permSaveTimers.current[roleId];
      if (prevT) clearTimeout(prevT);
      permSaveTimers.current[roleId] = setTimeout(async () => {
        const payload = pendingPermPayload.current[roleId];
        if (!payload) return;
        setSavingRoleId(roleId);
        setRoleErr('');
        try {
          await updateRoleMut.mutateAsync({ id: roleId, payload: { permissions: payload } });
        } catch (e) {
          setRoleErr(formatApiError(e));
        } finally {
          setSavingRoleId(null);
        }
      }, 350);
      return merged;
    });
  };

  const saveNewRole = async () => {
    setRoleErr('');
    if (!newRoleName.trim()) {
      setRoleErr('Role name is required.');
      return;
    }
    try {
      await createRoleMut.mutateAsync({ name: newRoleName.trim(), permissions: newPerm, status: 'active' });
      setAddRoleOpen(false);
      setNewRoleName('');
      setNewPerm(emptyPermMap());
    } catch (e) {
      setRoleErr(formatApiError(e));
    }
  };

  const submitEditRoleName = async () => {
    if (!editingRole) return;
    setEditRoleNameErr('');
    const nm = editRoleNameInput.trim();
    if (!nm) {
      setEditRoleNameErr('Role name is required.');
      return;
    }
    try {
      await updateRoleMut.mutateAsync({ id: editingRole.id, payload: { name: nm } });
      setEditRoleNameOpen(false);
      setEditingRole(null);
      setEditRoleNameInput('');
    } catch (e) {
      setEditRoleNameErr(formatApiError(e));
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleDeleteTarget) return;
    setRoleDeleteErr('');
    try {
      await deleteRoleMut.mutateAsync(roleDeleteTarget.id);
      setRoleDeleteOpen(false);
      setRoleDeleteTarget(null);
    } catch (e) {
      setRoleDeleteErr(formatApiError(e));
    }
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading roles…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load roles.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {roleErr ? <p className="text-sm text-destructive">{roleErr}</p> : null}
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold">Roles & Permissions</h2><p className="text-sm text-muted-foreground">Toggles map to admin nav keys (employee access)</p></div>
        <Button size="sm" onClick={() => { setRoleErr(''); setAddRoleOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Role</Button>
      </div>

      {catalog ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">End-user account types and portals</p>
          <p className="text-xs text-muted-foreground">Reference only — not staff roles. Data is loaded from the server.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Portal surfaces</p>
              <ul className="flex flex-wrap gap-2">
                {catalog.portal_surfaces.map((p) => (
                  <li key={p.id}><Badge variant="outline" className="text-xs font-normal">{p.label}</Badge></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">User account roles</p>
              <ul className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {catalog.user_account_roles.map((u) => (
                  <li key={u.value}><Badge variant="secondary" className="text-xs font-normal">{u.label}</Badge></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {role.users} user(s) assigned
                    {savingRoleId === role.id ? <span className="ml-2 text-primary">Saving…</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={role.status === 'system' ? 'secondary' : 'outline'} className="text-xs">{role.status}</Badge>
                  {!role.is_system && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3 h-3" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditRoleNameErr('');
                            setEditingRole(role);
                            setEditRoleNameInput(role.name);
                            setEditRoleNameOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-2" /> Edit role name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setRoleDeleteErr('');
                            setRoleDeleteTarget(role);
                            setRoleDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2" /> Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[min(24rem,55vh)] overflow-y-auto pr-1">
                {ADMIN_ROLE_PERMISSION_KEYS.map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 min-w-0">
                    <Switch
                      checked={!!permEdits[role.id]?.[key]}
                      className="scale-75 shrink-0"
                      onCheckedChange={() => togglePerm(role.id, key)}
                    />
                    <span className="text-xs leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CRUDModal
        open={addRoleOpen}
        onClose={() => { setAddRoleOpen(false); setRoleErr(''); }}
        title="Create New Role"
        onSave={saveNewRole}
        loading={createRoleMut.isPending}
        error={roleErr}
      >
        <div className="space-y-4">
          <div><Label>Role Name</Label><Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Content Manager" /></div>
          <div>
            <Label className="mb-2 block">Module Permissions</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-lg p-3 max-h-[min(20rem,50vh)] overflow-y-auto">
              {ADMIN_ROLE_PERMISSION_KEYS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 min-w-0">
                  <Switch
                    className="scale-75 shrink-0"
                    checked={!!newPerm[key]}
                    onCheckedChange={(v) => setNewPerm((p) => ({ ...p, [key]: v }))}
                  />
                  <span className="text-xs leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CRUDModal>

      <CRUDModal
        open={editRoleNameOpen}
        onClose={() => { setEditRoleNameOpen(false); setEditingRole(null); setEditRoleNameErr(''); }}
        title="Edit role name"
        onSave={() => { void submitEditRoleName(); }}
        loading={updateRoleMut.isPending}
        error={editRoleNameErr}
      >
        <div><Label>Role name</Label><Input value={editRoleNameInput} onChange={(e) => setEditRoleNameInput(e.target.value)} /></div>
      </CRUDModal>

      <DeleteConfirm
        open={roleDeleteOpen}
        onClose={() => { setRoleDeleteOpen(false); setRoleDeleteTarget(null); setRoleDeleteErr(''); }}
        onConfirm={() => { void confirmDeleteRole(); }}
        loading={deleteRoleMut.isPending}
        title={roleDeleteTarget ? `Delete role "${roleDeleteTarget.name}"?` : 'Delete role?'}
        description={roleDeleteErr || 'Staff roles in use cannot be deleted. This cannot be undone.'}
      />
    </div>
  );
}
