import { useEffect, useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, Calculator, Edit, Trash2, Plus, ChevronDown,
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import { fetchShippingZoneAdminOptions } from '@/components/admin/adminRelationalPickers';

export type ShippingMethodRow = {
  id: string;
  name: string;
  type: string;
  cost: number;
  threshold: number;
  status: 'active' | 'inactive';
};

export type WeightRuleRow = {
  id: string;
  zone_id: string;
  zone: string;
  minWeight: number;
  maxWeight: number;
  ratePerKg: number;
};

export type ShippingZoneRow = {
  id: string;
  name: string;
  areas: string;
  flatRate: number;
  freeAbove: number;
  status: 'active' | 'inactive';
};

interface ShippingModuleProps {
  activeSection: string;
}

export default function ShippingModule({ activeSection }: ShippingModuleProps) {
  switch (activeSection) {
    case 'shipping-zones': return <ShippingZonesView />;
    case 'shipping-calculator': return <ShippingCalculatorView />;
    default: return <ShippingMethodsView />;
  }
}

function ShippingMethodsView() {
  const { data: apiMethods = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'shipping-methods'],
    () => adminApi.shippingMethods({ page_size: 200 }),
  );
  const { data: apiRules = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'weight-rules'],
    () => adminApi.weightRules({ page_size: 500 }),
  );
  const [methods, setMethods] = useState<ShippingMethodRow[]>([]);
  const [rules, setRules] = useState<WeightRuleRow[]>([]);

  useEffect(() => {
    setMethods(
      apiMethods.map((m) => ({
        id: String(m.id),
        name: String(m.name ?? ''),
        type: String(m.type ?? 'flat'),
        cost: Number(m.cost ?? 0),
        threshold: Number(m.threshold ?? 0),
        status: (m.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      })),
    );
  }, [apiMethods]);

  useEffect(() => {
    setRules(
      apiRules.map((r) => ({
        id: String(r.id),
        zone_id: String(r.zone_id ?? ''),
        zone: String(r.zone ?? ''),
        minWeight: Number(r.minWeight ?? 0),
        maxWeight: Number(r.maxWeight ?? 0),
        ratePerKg: Number(r.ratePerKg ?? 0),
      })),
    );
  }, [apiRules]);

  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [editMethodOpen, setEditMethodOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethodRow | null>(null);
  const [selectedRule, setSelectedRule] = useState<WeightRuleRow | null>(null);

  // Method form state
  const [methodForm, setMethodForm] = useState({ name: '', type: '', cost: '', threshold: '' });
  const [methodErr, setMethodErr] = useState('');
  const [ruleForm, setRuleForm] = useState({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' });
  const [ruleErr, setRuleErr] = useState('');
  const [editRuleForm, setEditRuleForm] = useState({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' });
  const [editRuleErr, setEditRuleErr] = useState('');
  const [methodDelOpen, setMethodDelOpen] = useState(false);
  const [methodDelTarget, setMethodDelTarget] = useState<ShippingMethodRow | null>(null);
  const [ruleDelOpen, setRuleDelOpen] = useState(false);
  const [ruleDelTarget, setRuleDelTarget] = useState<WeightRuleRow | null>(null);

  const invMethods = [['admin', 'shipping-methods']] as const;
  const invRules = [['admin', 'weight-rules'], ['admin', 'weight-rules', 'calc']] as const;
  const createMethodMut = useAdminMutation(adminApi.createShippingMethod, invMethods);
  const updateMethodMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateShippingMethod(id, payload),
    invMethods,
  );
  const deleteMethodMut = useAdminMutation((id: string) => adminApi.deleteShippingMethod(id), invMethods);
  const createRuleMut = useAdminMutation(adminApi.createWeightRule, invRules);
  const updateRuleMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateWeightRule(id, payload),
    invRules,
  );
  const deleteRuleMut = useAdminMutation((id: string) => adminApi.deleteWeightRule(id), invRules);

  const { data: shipSettings } = useQuery({
    queryKey: ['admin', 'shipping-settings'],
    queryFn: () => adminApi.shippingSettings(),
  });
  const [sellerPays, setSellerPays] = useState(false);
  const [freeGlobal, setFreeGlobal] = useState(false);
  const [shipSetErr, setShipSetErr] = useState('');
  const [shipSetOk, setShipSetOk] = useState(false);
  useEffect(() => {
    if (!shipSettings) return;
    setSellerPays(!!shipSettings.seller_pays_shipping);
    setFreeGlobal(!!shipSettings.free_shipping_global);
    setShipSetErr('');
  }, [shipSettings]);
  const saveShipSettings = useAdminMutation(adminApi.updateShippingSettings, [['admin', 'shipping-settings']]);

  const submitShippingSettings = async () => {
    setShipSetErr('');
    setShipSetOk(false);
    try {
      await saveShipSettings.mutateAsync({
        seller_pays_shipping: sellerPays,
        free_shipping_global: freeGlobal,
      });
      setShipSetOk(true);
      setTimeout(() => setShipSetOk(false), 4000);
    } catch (e) {
      setShipSetErr(formatApiError(e));
    }
  };

  const toggleMethod = async (m: ShippingMethodRow) => {
    const next = m.status === 'active' ? 'inactive' : 'active';
    try {
      await updateMethodMut.mutateAsync({ id: m.id, payload: { status: next } });
    } catch {
      /* list refetches on success */
    }
  };

  const deleteMethod = async (id: string) => {
    try {
      await deleteMethodMut.mutateAsync(id);
    } catch {
      /* noop */
    }
  };

  const saveNewMethod = async () => {
    setMethodErr('');
    try {
      await createMethodMut.mutateAsync({
        name: (methodForm.name || 'New Method').trim(),
        type: methodForm.type || 'flat',
        cost: parseFloat(methodForm.cost) || 0,
        threshold: parseFloat(methodForm.threshold) || 0,
        status: 'active',
      });
      setAddMethodOpen(false);
      setMethodForm({ name: '', type: '', cost: '', threshold: '' });
    } catch (e) {
      setMethodErr(formatApiError(e));
    }
  };

  const saveEditMethod = async () => {
    if (!selectedMethod) return;
    setMethodErr('');
    try {
      await updateMethodMut.mutateAsync({
        id: selectedMethod.id,
        payload: {
          name: (methodForm.name || selectedMethod.name).trim(),
          type: methodForm.type || selectedMethod.type,
          cost: parseFloat(methodForm.cost) || selectedMethod.cost,
          threshold: parseFloat(methodForm.threshold) || selectedMethod.threshold,
        },
      });
      setEditMethodOpen(false);
    } catch (e) {
      setMethodErr(formatApiError(e));
    }
  };

  const saveNewRule = async () => {
    setRuleErr('');
    if (!ruleForm.zone_id) {
      setRuleErr('Select a zone.');
      return;
    }
    try {
      await createRuleMut.mutateAsync({
        zone_id: Number(ruleForm.zone_id),
        minWeight: parseFloat(ruleForm.minWeight) || 0,
        maxWeight: parseFloat(ruleForm.maxWeight) || 0,
        ratePerKg: parseFloat(ruleForm.ratePerKg) || 0,
      });
      setAddRuleOpen(false);
      setRuleForm({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' });
    } catch (e) {
      setRuleErr(formatApiError(e));
    }
  };

  const saveEditRule = async () => {
    if (!selectedRule) return;
    setEditRuleErr('');
    try {
      await updateRuleMut.mutateAsync({
        id: selectedRule.id,
        payload: {
          zone_id: editRuleForm.zone_id || selectedRule.zone_id,
          minWeight: parseFloat(editRuleForm.minWeight) || 0,
          maxWeight: parseFloat(editRuleForm.maxWeight) || 0,
          ratePerKg: parseFloat(editRuleForm.ratePerKg) || 0,
        },
      });
      setEditRuleOpen(false);
    } catch (e) {
      setEditRuleErr(formatApiError(e));
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await deleteRuleMut.mutateAsync(id);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-foreground">Shipping Methods</h2><p className="text-sm text-muted-foreground">Configure shipping options — free, flat rate, local pickup, weight-based</p></div>
        <Button onClick={() => { setMethodForm({ name: '', type: '', cost: '', threshold: '' }); setAddMethodOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Method
        </Button>
      </div>
      
      <div className="grid gap-3">
        {methods.map(method => (
          <Card key={method.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.type === 'free' ? `Free above Rs. ${method.threshold}` :
                       method.type === 'flat' ? `Rs. ${method.cost} per order` :
                       method.type === 'pickup' ? 'Customer picks up' :
                       `Rs. ${method.cost}/kg (weight-based)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={method.status === 'active' ? 'default' : 'secondary'}
                    className={cn("text-xs", method.status === 'active' && "bg-emerald-500")}>{method.status}</Badge>
                  <Switch checked={method.status === 'active'} onCheckedChange={() => { void toggleMethod(method); }} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setSelectedMethod(method);
                    setMethodForm({ name: method.name, type: method.type, cost: method.cost.toString(), threshold: (method.threshold || 0).toString() });
                    setEditMethodOpen(true);
                  }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setMethodDelTarget(method); setMethodDelOpen(true); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weight Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-base">Weight-Based Rules</CardTitle><CardDescription>Rs/kg rates by weight range and zone</CardDescription></div>
            <Button size="sm" variant="outline" onClick={() => { setRuleForm({ zone_id: '', minWeight: '', maxWeight: '', ratePerKg: '' }); setRuleErr(''); setAddRuleOpen(true); }}><Plus className="w-3 h-3 mr-1" /> Add Rule</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Zone</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Min Weight (kg)</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Max Weight (kg)</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Rate (Rs/kg)</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">{rule.zone}</td>
                    <td className="px-4 py-2">{rule.minWeight}</td>
                    <td className="px-4 py-2">{rule.maxWeight}</td>
                    <td className="px-4 py-2 font-medium">Rs. {rule.ratePerKg}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setSelectedRule(rule);
                          setEditRuleForm({
                            zone_id: rule.zone_id,
                            zoneLabel: rule.zone,
                            minWeight: String(rule.minWeight),
                            maxWeight: String(rule.maxWeight),
                            ratePerKg: String(rule.ratePerKg),
                          });
                          setEditRuleErr('');
                          setEditRuleOpen(true);
                        }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setRuleDelTarget(rule); setRuleDelOpen(true); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Seller Shipping */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Global shipping settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium text-sm">Seller pays shipping</p><p className="text-xs text-muted-foreground">When enabled, label notes seller bears delivery cost</p></div>
            <Switch checked={sellerPays} onCheckedChange={(v) => setSellerPays(!!v)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium text-sm">Global free shipping</p><p className="text-xs text-muted-foreground">Applies platform-wide free shipping when order total &gt; 0 (see API rules)</p></div>
            <Switch checked={freeGlobal} onCheckedChange={(v) => setFreeGlobal(!!v)} />
          </div>
          {shipSetOk ? <p className="text-sm text-emerald-600">Saved.</p> : null}
          {shipSetErr ? <p className="text-sm text-destructive">{shipSetErr}</p> : null}
          <Button type="button" variant="outline" size="sm" onClick={() => { void submitShippingSettings(); }} disabled={saveShipSettings.isPending}>
            Save shipping settings
          </Button>
        </CardContent>
      </Card>

      {/* Add Method Modal */}
      <CRUDModal open={addMethodOpen} onClose={() => { setAddMethodOpen(false); setMethodErr(''); }} title="Add Shipping Method" onSave={() => { void saveNewMethod(); }} loading={createMethodMut.isPending} error={methodErr}>
        <div className="space-y-4">
          <div><Label>Method Name</Label><Input placeholder="e.g. Express Delivery" value={methodForm.name} onChange={e => setMethodForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Type</Label>
            <Select value={methodForm.type} onValueChange={v => setMethodForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free Shipping</SelectItem>
                <SelectItem value="flat">Flat Rate</SelectItem>
                <SelectItem value="pickup">Local Pickup</SelectItem>
                <SelectItem value="weight">Weight-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cost (Rs.)</Label><Input type="number" placeholder="0" value={methodForm.cost} onChange={e => setMethodForm(f => ({ ...f, cost: e.target.value }))} /></div>
          <div><Label>Free Shipping Threshold (Rs.)</Label><Input type="number" placeholder="2000" value={methodForm.threshold} onChange={e => setMethodForm(f => ({ ...f, threshold: e.target.value }))} /></div>
        </div>
      </CRUDModal>

      {/* Edit Method Modal */}
      <CRUDModal open={editMethodOpen} onClose={() => { setEditMethodOpen(false); setMethodErr(''); }} title="Edit Shipping Method" onSave={() => { void saveEditMethod(); }} loading={updateMethodMut.isPending} error={methodErr}>
        <div className="space-y-4">
          <div><Label>Method Name</Label><Input value={methodForm.name} onChange={e => setMethodForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Type</Label>
            <Select value={methodForm.type} onValueChange={v => setMethodForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free Shipping</SelectItem>
                <SelectItem value="flat">Flat Rate</SelectItem>
                <SelectItem value="pickup">Local Pickup</SelectItem>
                <SelectItem value="weight">Weight-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cost (Rs.)</Label><Input type="number" value={methodForm.cost} onChange={e => setMethodForm(f => ({ ...f, cost: e.target.value }))} /></div>
          <div><Label>Free Shipping Threshold (Rs.)</Label><Input type="number" value={methodForm.threshold} onChange={e => setMethodForm(f => ({ ...f, threshold: e.target.value }))} /></div>
        </div>
      </CRUDModal>

      {/* Add Rule Modal */}
      <CRUDModal open={addRuleOpen} onClose={() => { setAddRuleOpen(false); setRuleErr(''); }} title="Add Weight Rule" onSave={() => { void saveNewRule(); }} loading={createRuleMut.isPending} error={ruleErr}>
        <div className="space-y-4">
          <div>
            <Label>Zone</Label>
            <AdminSearchCombobox
              queryKeyPrefix="weight-rule-zone-add"
              value={ruleForm.zone_id}
              selectedLabel={ruleForm.zoneLabel}
              onChange={(v, l) => setRuleForm((f) => ({ ...f, zone_id: v, zoneLabel: l ?? '' }))}
              fetchOptions={fetchShippingZoneAdminOptions}
              placeholder="Search zone…"
              clearable
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Min Weight (kg)</Label><Input type="number" placeholder="0" value={ruleForm.minWeight} onChange={(e) => setRuleForm((f) => ({ ...f, minWeight: e.target.value }))} /></div>
            <div><Label>Max Weight (kg)</Label><Input type="number" placeholder="5" value={ruleForm.maxWeight} onChange={(e) => setRuleForm((f) => ({ ...f, maxWeight: e.target.value }))} /></div>
          </div>
          <div><Label>Rate (Rs/kg)</Label><Input type="number" placeholder="50" value={ruleForm.ratePerKg} onChange={(e) => setRuleForm((f) => ({ ...f, ratePerKg: e.target.value }))} /></div>
        </div>
      </CRUDModal>

      {/* Edit Rule Modal */}
      <CRUDModal open={editRuleOpen} onClose={() => { setEditRuleOpen(false); setEditRuleErr(''); }} title="Edit Weight Rule" onSave={() => { void saveEditRule(); }} loading={updateRuleMut.isPending} error={editRuleErr}>
        {selectedRule && (
          <div className="space-y-4">
            <div>
              <Label>Zone</Label>
              <AdminSearchCombobox
                queryKeyPrefix="weight-rule-zone-edit"
                value={editRuleForm.zone_id}
                selectedLabel={editRuleForm.zoneLabel}
                onChange={(v, l) => setEditRuleForm((f) => ({ ...f, zone_id: v, zoneLabel: l ?? '' }))}
                fetchOptions={fetchShippingZoneAdminOptions}
                placeholder="Search zone…"
                clearable
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Weight (kg)</Label><Input type="number" value={editRuleForm.minWeight} onChange={(e) => setEditRuleForm((f) => ({ ...f, minWeight: e.target.value }))} /></div>
              <div><Label>Max Weight (kg)</Label><Input type="number" value={editRuleForm.maxWeight} onChange={(e) => setEditRuleForm((f) => ({ ...f, maxWeight: e.target.value }))} /></div>
            </div>
            <div><Label>Rate (Rs/kg)</Label><Input type="number" value={editRuleForm.ratePerKg} onChange={(e) => setEditRuleForm((f) => ({ ...f, ratePerKg: e.target.value }))} /></div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirm
        open={methodDelOpen}
        onClose={() => { setMethodDelOpen(false); setMethodDelTarget(null); }}
        onConfirm={() => {
          if (!methodDelTarget) return;
          void (async () => {
            try {
              await deleteMethodMut.mutateAsync(methodDelTarget.id);
              setMethodDelOpen(false);
              setMethodDelTarget(null);
            } catch {
              /* list refetches on success */
            }
          })();
        }}
        loading={deleteMethodMut.isPending}
        title={methodDelTarget ? `Delete shipping method "${methodDelTarget.name}"?` : 'Delete method?'}
        description="This removes the method from checkout configuration."
      />
      <DeleteConfirm
        open={ruleDelOpen}
        onClose={() => { setRuleDelOpen(false); setRuleDelTarget(null); }}
        onConfirm={() => {
          if (!ruleDelTarget) return;
          void (async () => {
            try {
              await deleteRuleMut.mutateAsync(ruleDelTarget.id);
              setRuleDelOpen(false);
              setRuleDelTarget(null);
            } catch {
              /* noop */
            }
          })();
        }}
        loading={deleteRuleMut.isPending}
        title={ruleDelTarget ? `Delete weight rule for ${ruleDelTarget.zone}?` : 'Delete rule?'}
        description="This removes the weight-based rate row for that zone."
      />
    </div>
  );
}

function ShippingZonesView() {
  const { data: apiZones = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'shipping-zones'],
    () => adminApi.shippingZones({ page_size: 200 }),
  );
  const [zones, setZones] = useState<ShippingZoneRow[]>([]);
  useEffect(() => {
    setZones(
      apiZones.map((z) => ({
        id: String(z.id),
        name: String(z.name ?? ''),
        areas: String(z.areas ?? ''),
        flatRate: Number(z.flatRate ?? 0),
        freeAbove: Number(z.freeAbove ?? 0),
        status: (z.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      })),
    );
  }, [apiZones]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ShippingZoneRow | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', areas: '', flatRate: '', freeAbove: '' });
  const [editZoneForm, setEditZoneForm] = useState(zoneForm);
  const [zoneErr, setZoneErr] = useState('');

  const invZones = [['admin', 'shipping-zones'], ['admin', 'shipping-zones', 'calc'], ['admin', 'shipping-zones', 'method-form']] as const;
  const createZoneMut = useAdminMutation(adminApi.createShippingZone, invZones);
  const updateZoneMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateShippingZone(id, payload),
    invZones,
  );
  const deleteZoneMut = useAdminMutation((id: string) => adminApi.deleteShippingZone(id), invZones);

  const saveNewZone = async () => {
    setZoneErr('');
    try {
      await createZoneMut.mutateAsync({
        name: (zoneForm.name || 'New Zone').trim(),
        areas: zoneForm.areas || '',
        flatRate: parseFloat(zoneForm.flatRate) || 0,
        freeAbove: zoneForm.freeAbove === '' ? 0 : parseFloat(zoneForm.freeAbove) || 0,
        status: 'active',
      });
      setAddOpen(false);
      setZoneForm({ name: '', areas: '', flatRate: '', freeAbove: '' });
    } catch (e) {
      setZoneErr(formatApiError(e));
    }
  };

  const saveEditZone = async () => {
    if (!selected) return;
    setZoneErr('');
    try {
      await updateZoneMut.mutateAsync({
        id: selected.id,
        payload: {
          name: (editZoneForm.name || selected.name).trim(),
          areas: editZoneForm.areas,
          flatRate: parseFloat(editZoneForm.flatRate) || 0,
          freeAbove: editZoneForm.freeAbove === '' ? 0 : parseFloat(editZoneForm.freeAbove) || 0,
        },
      });
      setEditOpen(false);
    } catch (e) {
      setZoneErr(formatApiError(e));
    }
  };

  const deleteZone = async (id: string) => {
    try {
      await deleteZoneMut.mutateAsync(id);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="Shipping Zones & Rates" subtitle="Configure zone-based shipping rates"
        data={zones}
        columns={[
          { key: 'name', label: 'Zone', render: (z) => <span className="font-medium">{z.name}</span> },
          { key: 'areas', label: 'Areas Covered' },
          { key: 'flatRate', label: 'Flat Rate', render: (z) => <span className="font-medium">Rs. {z.flatRate}</span> },
          { key: 'freeAbove', label: 'Free Above', render: (z) => z.freeAbove > 0 ? `Rs. ${z.freeAbove}` : <span className="text-muted-foreground">N/A</span> },
          { key: 'status', label: 'Status', render: (z) => (
            <Badge variant={z.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", z.status === 'active' && "bg-emerald-500")}>{z.status}</Badge>
          )},
          { key: 'actions', label: '', render: (z) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                setSelected(z);
                setEditZoneForm({
                  name: z.name,
                  areas: z.areas,
                  flatRate: String(z.flatRate),
                  freeAbove: z.freeAbove ? String(z.freeAbove) : '',
                });
                setZoneErr('');
                setEditOpen(true);
              }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { void deleteZone(z.id); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          )}
        ]}
        onAdd={() => { setZoneForm({ name: '', areas: '', flatRate: '', freeAbove: '' }); setZoneErr(''); setAddOpen(true); }} addLabel="Add Zone"
      />

      <CRUDModal open={addOpen} onClose={() => { setAddOpen(false); setZoneErr(''); }} title="Add Shipping Zone" onSave={() => { void saveNewZone(); }} loading={createZoneMut.isPending} error={zoneErr}>
        <div className="space-y-4">
          <div><Label>Zone Name</Label><Input placeholder="e.g. Kathmandu Valley" value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Areas Covered</Label><Input placeholder="Kathmandu, Lalitpur, Bhaktapur" value={zoneForm.areas} onChange={(e) => setZoneForm((f) => ({ ...f, areas: e.target.value }))} /></div>
          <div><Label>Flat Rate (Rs.)</Label><Input type="number" placeholder="100" value={zoneForm.flatRate} onChange={(e) => setZoneForm((f) => ({ ...f, flatRate: e.target.value }))} /></div>
          <div><Label>Free Shipping Above (Rs.)</Label><Input type="number" placeholder="2000" value={zoneForm.freeAbove} onChange={(e) => setZoneForm((f) => ({ ...f, freeAbove: e.target.value }))} /></div>
        </div>
      </CRUDModal>

      <CRUDModal open={editOpen} onClose={() => { setEditOpen(false); setZoneErr(''); }} title="Edit Shipping Zone" onSave={() => { void saveEditZone(); }} loading={updateZoneMut.isPending} error={zoneErr}>
        {selected && (
          <div className="space-y-4">
            <div><Label>Zone Name</Label><Input value={editZoneForm.name} onChange={(e) => setEditZoneForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Areas Covered</Label><Input value={editZoneForm.areas} onChange={(e) => setEditZoneForm((f) => ({ ...f, areas: e.target.value }))} /></div>
            <div><Label>Flat Rate (Rs.)</Label><Input type="number" value={editZoneForm.flatRate} onChange={(e) => setEditZoneForm((f) => ({ ...f, flatRate: e.target.value }))} /></div>
            <div><Label>Free Shipping Above (Rs.)</Label><Input type="number" value={editZoneForm.freeAbove} onChange={(e) => setEditZoneForm((f) => ({ ...f, freeAbove: e.target.value }))} /></div>
          </div>
        )}
      </CRUDModal>
    </div>
  );
}

type ShippingCalcExplainedBlock = {
  step: string;
  title: string;
  lines: string[];
};

type ShippingCalcInputs = {
  order_total: number;
  weight_kg: number;
  zone_id: string;
  zone_name: string;
  method_id: string | null;
  method_name: string | null;
  free_shipping_global: boolean;
  seller_pays_shipping: boolean;
};

type ShippingCalcResult = {
  fee: number;
  breakdown: Array<Record<string, unknown>>;
  breakdown_explained?: ShippingCalcExplainedBlock[];
  inputs?: ShippingCalcInputs;
  zone: { id: string; name: string };
};

function fmtRs(n: number): string {
  return `Rs. ${Number(n).toFixed(2)}`;
}

/** Fallback when API has no `breakdown_explained` (older server). */
function fallbackShippingBreakdownExplained(
  breakdown: Array<Record<string, unknown>>,
  ctx: { zoneName: string; weightKg: number; orderTotal: number; fee: number },
): ShippingCalcExplainedBlock[] {
  const { zoneName, weightKg, orderTotal, fee } = ctx;
  const zn = zoneName || 'this zone';
  return breakdown.map((b) => {
    const step = String(b.step ?? '');
    switch (step) {
      case 'global_free':
        return {
          step,
          title: 'Global free shipping',
          lines: [
            'Store-wide free shipping is enabled in shipping settings.',
            `Order total is ${fmtRs(orderTotal)} (greater than zero), so shipping is ${fmtRs(0)}.`,
          ],
        };
      case 'method_free_threshold': {
        const thr = Number(b.threshold ?? 0);
        return {
          step,
          title: 'Shipping method: free threshold met',
          lines: [
            `Order total ${fmtRs(orderTotal)} is at or above the method’s free-shipping threshold of ${fmtRs(thr)}.`,
            `Shipping charge: ${fmtRs(0)}.`,
          ],
        };
      }
      case 'method_free_not_met_flat': {
        const amt = Number(b.amount ?? 0);
        return {
          step,
          title: 'Shipping method: threshold not met',
          lines: [
            `Order total ${fmtRs(orderTotal)} is below the method’s free-shipping threshold.`,
            `A flat fallback charge applies: ${fmtRs(amt)}.`,
          ],
        };
      }
      case 'flat': {
        const amt = Number(b.amount ?? 0);
        return {
          step,
          title: 'Shipping method: flat rate',
          lines: [`Flat rate from the selected method: ${fmtRs(amt)}.`],
        };
      }
      case 'pickup':
        return {
          step,
          title: 'Local pickup',
          lines: [`Pickup is selected; delivery shipping is ${fmtRs(0)}.`],
        };
      case 'zone_flat': {
        const amt = Number(b.amount ?? 0);
        return {
          step,
          title: `Zone base charge (${zn})`,
          lines: [`Base flat component for zone “${zn}”: ${fmtRs(amt)}.`],
        };
      }
      case 'weight_band': {
        const amt = Number(b.amount ?? 0);
        const wkg = b.weight_kg != null ? Number(b.weight_kg) : weightKg;
        const rpk = b.rate_per_kg != null ? Number(b.rate_per_kg) : undefined;
        const mn = b.min_weight != null ? Number(b.min_weight) : undefined;
        const mx = b.max_weight != null ? Number(b.max_weight) : undefined;
        const lines: string[] = [];
        if (rpk != null && !Number.isNaN(rpk)) {
          lines.push(`Weight charge: ${wkg} kg × ${fmtRs(rpk)} per kg = ${fmtRs(amt)}.`);
        } else {
          lines.push(`Weight-based component: ${fmtRs(amt)}.`);
        }
        if (mn != null && mx != null) {
          lines.push(`This uses the weight band from ${mn} kg up to ${mx} kg (inclusive).`);
        }
        return { step, title: 'Weight-based charge', lines };
      }
      case 'zone_flat_no_weight_rule': {
        const amt = Number(b.amount ?? 0);
        return {
          step,
          title: `No matching weight rule (${zn})`,
          lines: [
            `No weight rule covers ${weightKg} kg for zone “${zn}”.`,
            `Only the zone flat rate applies: ${fmtRs(amt)}.`,
          ],
        };
      }
      case 'zone_flat_only': {
        const amt = Number(b.amount ?? 0);
        return {
          step,
          title: `Zone flat only (${zn})`,
          lines: [
            `No weight rule includes ${weightKg} kg for zone “${zn}”.`,
            `Shipping is the zone flat rate only: ${fmtRs(amt)} (no per-kg add-on).`,
          ],
        };
      }
      case 'zone_free_above': {
        const fa = Number(b.free_above ?? 0);
        const sub = b.subtotal_before_free != null ? Number(b.subtotal_before_free) : undefined;
        const lines = [
          `Zone “${zn}” offers free shipping when the order total is at or above ${fmtRs(fa)}.`,
          `Your order total is ${fmtRs(orderTotal)}, so this rule applies.`,
        ];
        if (sub != null && !Number.isNaN(sub)) {
          lines.push(
            `Subtotal from the steps above was ${fmtRs(sub)}; that amount is waived. Final shipping: ${fmtRs(0)}.`,
          );
        } else {
          lines.push(`Final shipping charge: ${fmtRs(0)} (previous components superseded).`);
        }
        return { step, title: 'Zone free shipping (order value)', lines };
      }
      case 'seller_pays':
        return {
          step,
          title: 'Seller pays shipping',
          lines: [
            `The fee shown (${fmtRs(fee)}) is what the customer would see if they paid shipping; in settings, the seller bears this cost.`,
          ],
        };
      default:
        return {
          step,
          title: step || 'Step',
          lines: [JSON.stringify(b)],
        };
    }
  });
}

function ShippingCalculatorView() {
  const { data: apiMethods = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'shipping-methods', 'calc'],
    () => adminApi.shippingMethods({ page_size: 200 }),
  );

  const [orderValue, setOrderValue] = useState('');
  const [weight, setWeight] = useState('');
  const [zone, setZone] = useState('');
  const [zoneLabel, setZoneLabel] = useState('');
  const [methodId, setMethodId] = useState('');
  const [calcResult, setCalcResult] = useState<ShippingCalcResult | null>(null);
  const [calcErr, setCalcErr] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);

  const explainedBlocks = useMemo(() => {
    if (!calcResult) return [];
    if (calcResult.breakdown_explained && calcResult.breakdown_explained.length > 0) {
      return calcResult.breakdown_explained;
    }
    const orderTotal = calcResult.inputs?.order_total ?? (parseFloat(orderValue) || 0);
    const weightKg = calcResult.inputs?.weight_kg ?? (parseFloat(weight) || 0);
    return fallbackShippingBreakdownExplained(calcResult.breakdown, {
      zoneName: calcResult.zone.name,
      weightKg,
      orderTotal,
      fee: calcResult.fee,
    });
  }, [calcResult, orderValue, weight]);

  const calculate = async () => {
    const ov = parseFloat(orderValue) || 0;
    const w = parseFloat(weight) || 0;
    if (!zone) {
      setCalcErr('Select a zone.');
      return;
    }
    setCalcErr('');
    setCalcLoading(true);
    try {
      const res = await adminApi.shippingCalculate({
        zone_id: zone,
        order_total: ov,
        weight_kg: w,
        ...(methodId ? { method_id: methodId } : {}),
      });
      setCalcResult(res as ShippingCalcResult);
    } catch (e) {
      setCalcErr(formatApiError(e));
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h2 className="text-lg font-bold text-foreground">Shipping Cost Calculator</h2><p className="text-sm text-muted-foreground">Calculate shipping costs based on order value, weight, and zone</p></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Calculate Shipping</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Order Value (Rs.)</Label><Input type="number" placeholder="5000" value={orderValue} onChange={e => setOrderValue(e.target.value)} /></div>
            <div><Label>Total Weight (kg)</Label><Input type="number" placeholder="2.5" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></div>
            <div>
              <Label>Zone</Label>
              <AdminSearchCombobox
                queryKeyPrefix="shipping-calc-zone"
                value={zone}
                selectedLabel={zoneLabel}
                onChange={(v, l) => { setZone(v); setZoneLabel(l ?? ''); }}
                fetchOptions={fetchShippingZoneAdminOptions}
                placeholder="Search zone…"
                clearable
              />
            </div>
            <div>
              <Label>Shipping method (optional)</Label>
              <Select value={methodId || '__none'} onValueChange={(v) => setMethodId(v === '__none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Any / zone rules only" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None (zone + weight rules) —</SelectItem>
                  {apiMethods.map((m) => (
                    <SelectItem key={String(m.id)} value={String(m.id)}>{String(m.name ?? m.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {calcErr ? <p className="text-sm text-destructive">{calcErr}</p> : null}
            <Button className="w-full" onClick={() => { void calculate(); }} disabled={!zone || calcLoading}>
              <Calculator className="w-4 h-4 mr-2" /> {calcLoading ? 'Calculating…' : 'Calculate'}
            </Button>
          </CardContent>
        </Card>

        {calcResult && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Shipping Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Zone: {calcResult.zone.name}</p>
              {calcResult.inputs ? (
                <div className="text-xs text-muted-foreground space-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                  <p><span className="font-medium text-foreground">Inputs used:</span> order {fmtRs(calcResult.inputs.order_total)}, weight {calcResult.inputs.weight_kg} kg</p>
                  {calcResult.inputs.method_name ? (
                    <p>Method: {calcResult.inputs.method_name}</p>
                  ) : (
                    <p>Method: none (zone + weight rules only)</p>
                  )}
                  <p>
                    Settings: {calcResult.inputs.free_shipping_global ? 'global free shipping on' : 'global free shipping off'}
                    {calcResult.inputs.seller_pays_shipping ? '; seller pays shipping' : ''}
                  </p>
                </div>
              ) : null}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                {explainedBlocks.map((block, i) => (
                  <div key={`${block.step}-${i}`} className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{block.title}</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {block.lines.map((line, j) => (
                        <li key={j}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <Collapsible className="rounded-md border border-border/50">
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/40">
                  Raw steps (debug)
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <div className="space-y-1 rounded-md bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {calcResult.breakdown.map((line, i) => (
                      <p key={i} className="break-all">{JSON.stringify(line)}</p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Shipping Cost</p>
                <p className="text-2xl font-bold text-primary">Rs. {calcResult.fee.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
