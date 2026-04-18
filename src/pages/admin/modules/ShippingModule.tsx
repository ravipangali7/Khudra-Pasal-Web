import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit, Trash2, Plus } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import { fetchShippingZoneAdminOptions } from '@/components/admin/adminRelationalPickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError } from '../hooks/adminFormUtils';

export type ShippingZoneRow = {
  id: string;
  name: string;
  areas: string;
  flatRate: number;
  freeAbove: number;
  status: 'active' | 'inactive';
};

type WeightRuleRow = {
  id: string;
  zone_id: string;
  zone: string;
  minWeight: number;
  maxWeight: number;
  ratePerKg: number;
};

interface ShippingModuleProps {
  activeSection: string;
}

export default function ShippingModule({ activeSection: _activeSection }: ShippingModuleProps) {
  return (
    <div className="space-y-6">
      <ShippingZonesView />
      <ShippingWeightRulesSection />
      <ShippingSettingsCard />
    </div>
  );
}

function ShippingWeightRulesSection() {
  const { data: apiRules = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'weight-rules'],
    () => adminApi.weightRules({ page_size: 500 }),
  );
  const [rules, setRules] = useState<WeightRuleRow[]>([]);
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

  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WeightRuleRow | null>(null);
  const [ruleForm, setRuleForm] = useState({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' });
  const [ruleErr, setRuleErr] = useState('');
  const [editRuleForm, setEditRuleForm] = useState({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' });
  const [editRuleErr, setEditRuleErr] = useState('');
  const [ruleDelOpen, setRuleDelOpen] = useState(false);
  const [ruleDelTarget, setRuleDelTarget] = useState<WeightRuleRow | null>(null);

  const invRules = [['admin', 'weight-rules'], ['admin', 'weight-rules', 'calc']] as const;
  const createRuleMut = useAdminMutation(adminApi.createWeightRule, invRules);
  const updateRuleMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateWeightRule(id, payload),
    invRules,
  );
  const deleteRuleMut = useAdminMutation((id: string) => adminApi.deleteWeightRule(id), invRules);

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
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weight-Based Rules</CardTitle>
              <CardDescription>Rs/kg rates by weight range and zone</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setRuleForm({ zone_id: '', zoneLabel: '', minWeight: '', maxWeight: '', ratePerKg: '' }); setRuleErr(''); setAddRuleOpen(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Add Rule
            </Button>
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
                {rules.map((rule) => (
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

function ShippingSettingsCard() {
  const { data: shipSettings } = useQuery({
    queryKey: ['admin', 'shipping-settings'],
    queryFn: () => adminApi.shippingSettings(),
  });
  const [sellerPays, setSellerPays] = useState(false);
  const [freeGlobal, setFreeGlobal] = useState(false);
  const [defaultCheckoutWeightKg, setDefaultCheckoutWeightKg] = useState('1');
  const [shipSetErr, setShipSetErr] = useState('');
  const [shipSetOk, setShipSetOk] = useState(false);
  useEffect(() => {
    if (!shipSettings) return;
    setSellerPays(!!shipSettings.seller_pays_shipping);
    setFreeGlobal(!!shipSettings.free_shipping_global);
    const w = shipSettings.default_checkout_weight_kg;
    setDefaultCheckoutWeightKg(
      typeof w === 'number' ? String(w) : String(w ?? '1'),
    );
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
        default_checkout_weight_kg: parseFloat(defaultCheckoutWeightKg) || 1,
      });
      setShipSetOk(true);
      setTimeout(() => setShipSetOk(false), 4000);
    } catch (e) {
      setShipSetErr(formatApiError(e));
    }
  };

  return (
    <div className="px-4 lg:px-6 pb-6">
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
          <div className="p-3 border rounded-lg space-y-2">
            <div>
              <p className="font-medium text-sm">Default checkout weight (kg)</p>
              <p className="text-xs text-muted-foreground">
                Used for storefront shipping quotes when products have no per-item weight (0–500).
              </p>
            </div>
            <Input
              type="number"
              min={0}
              max={500}
              step="0.001"
              className="max-w-[200px]"
              value={defaultCheckoutWeightKg}
              onChange={(e) => setDefaultCheckoutWeightKg(e.target.value)}
            />
          </div>
          {shipSetOk ? <p className="text-sm text-emerald-600">Saved.</p> : null}
          {shipSetErr ? <p className="text-sm text-destructive">{shipSetErr}</p> : null}
          <Button type="button" variant="outline" size="sm" onClick={() => { void submitShippingSettings(); }} disabled={saveShipSettings.isPending}>
            Save shipping settings
          </Button>
        </CardContent>
      </Card>
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
