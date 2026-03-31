import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Truck, Eye, Ban, CheckCircle, DollarSign, Star, Phone,
  Edit, MapPin, X, Check, Camera, RefreshCw,
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { AdminStatCard } from '@/components/admin/AdminStats';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { AdminImageField } from '@/components/admin/AdminImageField';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError, resolveMediaUrl } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import { fetchUserAdminOptions, fetchShippingZoneAdminOptions } from '@/components/admin/adminRelationalPickers';

type DeliveryManRow = {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  status: string;
  zone: string;
  zone_id?: string;
  deliveries: number;
  rating: number;
  earning: number;
  pending: number;
  id_document_front?: string;
  id_document_back?: string;
  selfie?: string;
  emergency_contact?: string;
  license_number?: string;
};

function SelfieCapture({
  onCapture,
}: {
  onCapture: (file: File | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [streamOn, setStreamOn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamOn(false);
  }, []);

  const openCamera = useCallback(async () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    onCapture(null);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamOn(true);
    } catch {
      setStreamOn(false);
    }
  }, [facing, onCapture, stop]);

  const switchFacing = useCallback(async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamOn(true);
    } catch {
      setStreamOn(false);
    }
  }, [facing, stop]);

  const capturePhoto = useCallback(() => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        onCapture(file);
        stop();
      },
      'image/jpeg',
      0.92,
    );
  }, [onCapture, stop]);

  const retake = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    onCapture(null);
  }, [onCapture]);

  useEffect(
    () => () => {
      stop();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    },
    [stop],
  );

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label className="flex items-center gap-2">
        <Camera className="w-4 h-4" /> Selfie (camera)
      </Label>
      <div className="relative aspect-video max-h-52 bg-black rounded-md overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt="Captured preview" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        )}
        {previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/85 text-white pointer-events-none">
            <Check className="w-12 h-12" strokeWidth={2} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {!streamOn && !previewUrl ? (
          <Button type="button" size="sm" variant="default" onClick={openCamera}>
            <Camera className="w-4 h-4 mr-1" /> Open camera
          </Button>
        ) : null}
        {streamOn ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={switchFacing}>
              <RefreshCw className="w-4 h-4 mr-1" />
              {facing === 'user' ? 'Use back camera' : 'Use front camera'}
            </Button>
            <Button type="button" size="sm" onClick={capturePhoto}>
              Capture photo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={stop}>
              Close camera
            </Button>
          </>
        ) : null}
        {previewUrl ? (
          <Button type="button" size="sm" variant="outline" onClick={retake}>
            Retake
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function DeliveryModule() {
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<DeliveryManRow | null>(null);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [userId, setUserId] = useState('');
  const [userLabel, setUserLabel] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zoneLabel, setZoneLabel] = useState('');
  const [lic, setLic] = useState('');
  const [emergency, setEmergency] = useState('');
  const [frontF, setFrontF] = useState<File | null>(null);
  const [backF, setBackF] = useState<File | null>(null);
  const [selfieF, setSelfieF] = useState<File | null>(null);
  const [formErr, setFormErr] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editZone, setEditZone] = useState('');
  const [editZoneLabel, setEditZoneLabel] = useState('');
  const [editLic, setEditLic] = useState('');
  const [editEmergency, setEditEmergency] = useState('');

  const { data: deliveryMen = [], isLoading, isError } = useAdminList<DeliveryManRow>(
    ['admin', 'delivery-men'],
    () => adminApi.deliveryMen({ page_size: 200 }),
  );
  const createMut = useAdminMutation(adminApi.createDeliveryMan, [['admin', 'delivery-men']]);
  const updateMut = useAdminMutation(
    ({ id, fd }: { id: string; fd: FormData }) => adminApi.updateDeliveryMan(id, fd),
    [['admin', 'delivery-men']],
  );
  const deleteMut = useAdminMutation(adminApi.deleteDeliveryMan, [['admin', 'delivery-men']]);

  const filtered = deliveryMen.filter((d) => {
    if (zoneFilter !== 'all' && d.zone !== zoneFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (ratingFilter === 'high' && d.rating < 4.5) return false;
    if (ratingFilter === 'low' && d.rating >= 4.0) return false;
    return true;
  });

  const zones = [...new Set(deliveryMen.map((d) => d.zone).filter(Boolean))];

  const resetAdd = () => {
    setUserId('');
    setUserLabel('');
    setZoneId('');
    setZoneLabel('');
    setLic('');
    setEmergency('');
    setFrontF(null);
    setBackF(null);
    setSelfieF(null);
    setFormErr('');
  };

  const saveAdd = async () => {
    setFormErr('');
    if (!userId.trim()) {
      setFormErr('User ID is required (existing user account).');
      return;
    }
    const fd = new FormData();
    fd.append('user_id', userId.trim());
    if (zoneId) fd.append('zone_id', zoneId);
    if (lic) fd.append('license_number', lic);
    if (emergency) fd.append('emergency_contact', emergency);
    if (frontF) fd.append('id_document_front', frontF);
    if (backF) fd.append('id_document_back', backF);
    if (selfieF) fd.append('selfie', selfieF);
    try {
      await createMut.mutateAsync(fd);
      setAddOpen(false);
      resetAdd();
    } catch (e) {
      setFormErr(formatApiError(e));
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    setFormErr('');
    const fd = new FormData();
    fd.append('status', editStatus);
    if (editZone) fd.append('zone_id', editZone);
    fd.append('license_number', editLic);
    fd.append('emergency_contact', editEmergency);
    if (frontF) fd.append('id_document_front', frontF);
    if (backF) fd.append('id_document_back', backF);
    if (selfieF) fd.append('selfie', selfieF);
    try {
      await updateMut.mutateAsync({ id: selected.id, fd });
      setEditOpen(false);
      setFrontF(null);
      setBackF(null);
      setSelfieF(null);
    } catch (e) {
      setFormErr(formatApiError(e));
    }
  };

  useEffect(() => {
    if (selected && editOpen) {
      setEditStatus(selected.status);
      setEditZone(selected.zone_id || '');
      setEditZoneLabel(selected.zone || '');
      setEditLic(selected.license_number || '');
      setEditEmergency(selected.emergency_contact || '');
      setFrontF(null);
      setBackF(null);
      setSelfieF(null);
    }
  }, [selected, editOpen]);

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading delivery personnel…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load delivery personnel.</div>;
  }

  const avgRating = deliveryMen.length ? deliveryMen.reduce((a, d) => a + d.rating, 0) / deliveryMen.length : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon={Truck} title="Total Delivery Men" value={deliveryMen.length} color="blue" />
        <AdminStatCard icon={CheckCircle} title="Active" value={deliveryMen.filter((d) => d.status === 'active').length} color="green" />
        <AdminStatCard icon={DollarSign} title="Total Earnings" value={`Rs. ${(deliveryMen.reduce((a, d) => a + d.earning, 0) / 1000).toFixed(0)}K`} color="purple" />
        <AdminStatCard icon={Star} title="Avg Rating" value={deliveryMen.length ? avgRating.toFixed(1) : '—'} color="orange" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Rating" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="high">4.5+ Stars</SelectItem>
            <SelectItem value="low">Below 4.0</SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== 'all' || zoneFilter !== 'all' || ratingFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStatusFilter('all'); setZoneFilter('all'); setRatingFilter('all'); }}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <AdminTable
        title="Delivery Personnel"
        subtitle="Link existing users, upload KYC images, assign shipping zones"
        data={filtered}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (d) => (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {d.selfie ? (
                    <img src={resolveMediaUrl(d.selfie)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="text-xs">{d.name[0]}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.phone}</p>
                </div>
              </div>
            ),
          },
          { key: 'zone', label: 'Zone', render: (d) => <span className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-muted-foreground" />{d.zone || '—'}</span> },
          { key: 'deliveries', label: 'Deliveries', render: (d) => <span className="font-bold">{d.deliveries}</span> },
          {
            key: 'rating',
            label: 'Rating',
            render: (d) => (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-sm">{d.rating}</span>
              </div>
            ),
          },
          { key: 'earning', label: 'Earnings', render: (d) => <span className="font-semibold">Rs. {d.earning.toLocaleString()}</span> },
          {
            key: 'pending',
            label: 'Pending',
            render: (d) =>
              d.pending > 0 ? (
                <span className="text-orange-600 font-medium">Rs. {d.pending.toLocaleString()}</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (d) => (
              <Badge variant={d.status === 'active' ? 'default' : 'destructive'} className={cn('text-xs', d.status === 'active' && 'bg-emerald-500')}>
                {d.status}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (d) => (
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" className="h-7" onClick={() => { setSelected(d); setDetailOpen(true); }}>
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={async () => {
                    try {
                      const fd = new FormData();
                      fd.append('status', d.status === 'active' ? 'inactive' : 'active');
                      await updateMut.mutateAsync({ id: d.id, fd });
                    } catch {
                      /* */
                    }
                  }}
                >
                  {d.status === 'active' ? <Ban className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-destructive"
                  onClick={async () => {
                    if (!window.confirm('Delete this delivery profile?')) return;
                    await deleteMut.mutateAsync(d.id);
                  }}
                >
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        onAdd={() => { resetAdd(); setAddOpen(true); }}
        addLabel="Add Delivery Man"
        onExport={() => {}}
        onFilter={() => {}}
      />

      <CRUDModal
        open={addOpen}
        onClose={() => { setAddOpen(false); resetAdd(); }}
        title="Add Delivery Man"
        size="lg"
        onSave={saveAdd}
        loading={createMut.isPending}
        error={formErr}
      >
        <div className="space-y-4">
          <div>
            <Label>User</Label>
            <AdminSearchCombobox
              queryKeyPrefix="delivery-user"
              value={userId}
              selectedLabel={userLabel}
              onChange={(v, l) => { setUserId(v); setUserLabel(l ?? ''); }}
              fetchOptions={fetchUserAdminOptions}
              placeholder="Search user…"
              clearable
            />
          </div>
          <div>
            <Label>Zone</Label>
            <AdminSearchCombobox
              queryKeyPrefix="delivery-zone-add"
              value={zoneId}
              selectedLabel={zoneLabel}
              onChange={(v, l) => { setZoneId(v); setZoneLabel(l ?? ''); }}
              fetchOptions={fetchShippingZoneAdminOptions}
              emptyOption={{ label: 'None' }}
              placeholder="Search zone…"
              clearable
            />
          </div>
          <div><Label>License number</Label><Input value={lic} onChange={(e) => setLic(e.target.value)} /></div>
          <div><Label>Emergency contact phone</Label><Input value={emergency} onChange={(e) => setEmergency(e.target.value)} /></div>
          <AdminImageField label="ID front" file={frontF} onFileChange={setFrontF} />
          <AdminImageField label="ID back" file={backF} onFileChange={setBackF} />
          <SelfieCapture onCapture={setSelfieF} />
          {selfieF ? <p className="text-xs text-muted-foreground">Selfie file ready: {selfieF.name}</p> : null}
        </div>
      </CRUDModal>

      <CRUDModal open={detailOpen} onClose={() => setDetailOpen(false)} title="Delivery Man Details" onSave={() => setDetailOpen(false)} saveLabel="Close">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selected.id_document_front ? (
                <div className="text-xs"><p className="mb-1">ID front</p><img src={resolveMediaUrl(selected.id_document_front)} alt="" className="h-24 rounded border" /></div>
              ) : null}
              {selected.id_document_back ? (
                <div className="text-xs"><p className="mb-1">ID back</p><img src={resolveMediaUrl(selected.id_document_back)} alt="" className="h-24 rounded border" /></div>
              ) : null}
              {selected.selfie ? (
                <div className="text-xs"><p className="mb-1">Selfie</p><img src={resolveMediaUrl(selected.selfie)} alt="" className="h-24 rounded border" /></div>
              ) : null}
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <Avatar className="h-16 w-16 text-2xl">
                {selected.selfie ? <img src={resolveMediaUrl(selected.selfie)} alt="" className="h-full w-full object-cover" /> : <AvatarFallback>{selected.name[0]}</AvatarFallback>}
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">{selected.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selected.status === 'active' ? 'default' : 'destructive'} className={cn('text-xs', selected.status === 'active' && 'bg-emerald-500')}>{selected.status}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{selected.zone}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-foreground">{selected.deliveries}</p><p className="text-xs text-muted-foreground">Deliveries</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-500">{selected.rating}</p><p className="text-xs text-muted-foreground">Rating</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-600">Rs. {selected.earning.toLocaleString()}</p><p className="text-xs text-muted-foreground">Earnings</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-orange-500">Rs. {selected.pending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setDetailOpen(false); setEditOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
          </div>
        )}
      </CRUDModal>

      <CRUDModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Delivery Man" onSave={saveEdit} loading={updateMut.isPending} error={formErr}>
        {selected && (
          <div className="space-y-4">
            <div>
              <Label>Zone</Label>
              <AdminSearchCombobox
                queryKeyPrefix="delivery-zone-edit"
                value={editZone}
                selectedLabel={editZoneLabel}
                onChange={(v, l) => { setEditZone(v); setEditZoneLabel(l ?? ''); }}
                fetchOptions={fetchShippingZoneAdminOptions}
                emptyOption={{ label: 'None' }}
                placeholder="Search zone…"
                clearable
              />
            </div>
            <div><Label>License</Label><Input value={editLic} onChange={(e) => setEditLic(e.target.value)} /></div>
            <div><Label>Emergency contact</Label><Input value={editEmergency} onChange={(e) => setEditEmergency(e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AdminImageField label="Replace ID front" file={frontF} onFileChange={setFrontF} existingUrl={selected.id_document_front} />
            <AdminImageField label="Replace ID back" file={backF} onFileChange={setBackF} existingUrl={selected.id_document_back} />
            <AdminImageField label="Replace selfie" file={selfieF} onFileChange={setSelfieF} existingUrl={selected.selfie} />
            <SelfieCapture onCapture={setSelfieF} />
          </div>
        )}
      </CRUDModal>

    </div>
  );
}
