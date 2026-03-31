import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PortalApiError,
  portalApi,
  type PortalKycSchemaField,
  type PortalKycSchemaResponse,
  type PortalKycStatusResponse,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type PortalKycSectionProps = {
  onBack?: () => void;
};

function resolveChoices(
  schema: PortalKycSchemaResponse,
  field: PortalKycSchemaField & { type: 'choice' },
): Array<{ value: string; label: string }> {
  if (field.choices_key === 'document_type_choices') {
    return schema.document_type_choices;
  }
  return [];
}

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso.slice(0, 16);
  }
}

function DocumentsTable({ st }: { st: PortalKycStatusResponse }) {
  if (!st.documents?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your submissions</CardTitle>
        <CardDescription>Document type and current status for each upload.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {st.documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="capitalize font-medium">
                  {d.document_type.replace(/_/g, ' ')}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      d.status === 'approved'
                        ? 'default'
                        : d.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={cn('capitalize', d.status === 'approved' && 'bg-emerald-600')}
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {formatSubmitted(d.submitted_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function PortalKycSection({ onBack }: PortalKycSectionProps) {
  const queryClient = useQueryClient();
  const schemaQ = useQuery({
    queryKey: ['portal', 'kyc', 'schema'],
    queryFn: () => portalApi.kycSchema(),
  });
  const statusQ = useQuery({
    queryKey: ['portal', 'kyc', 'status'],
    queryFn: () => portalApi.kycStatus(),
  });

  const schema = schemaQ.data;
  const firstType = schema?.document_type_choices?.[0]?.value ?? 'citizenship';
  const [documentType, setDocumentType] = useState(firstType);
  const [idNumber, setIdNumber] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    const v = schemaQ.data?.document_type_choices?.[0]?.value;
    if (v) setDocumentType((prev) => (prev ? prev : v));
  }, [schemaQ.data]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('document_type', documentType || firstType);
      if (idNumber.trim()) fd.append('document_id_number', idNumber.trim());
      if (frontFile) fd.append('document_image', frontFile);
      if (backFile) fd.append('document_back', backFile);
      if (pdfFile) fd.append('document_file', pdfFile);
      return portalApi.kycSubmit(fd);
    },
    onSuccess: () => {
      toast.success('KYC submitted. Your documents are pending review.');
      void queryClient.invalidateQueries({ queryKey: ['portal', 'kyc', 'status'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'me'] });
      setFrontFile(null);
      setBackFile(null);
      setPdfFile(null);
    },
    onError: (e: Error) => {
      if (e instanceof PortalApiError) {
        toast.error(e.message || 'Could not submit KYC.');
        return;
      }
      toast.error(e.message || 'Could not submit KYC.');
    },
  });

  const st = statusQ.data;
  const kycRequired = st?.kyc_required !== false;
  const isVerified = st?.kyc_status === 'verified';
  const isReview = st?.kyc_status === 'review';
  const isRejected = st?.kyc_status === 'rejected';
  const showForm = Boolean(st?.can_submit);
  const extHint = schema?.allowed_extensions?.length
    ? `.${schema.allowed_extensions.join(', .')}`
    : '';

  const renderSubmitForm = () => {
    if (!schema) return null;
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Submit documents</CardTitle>
          <CardDescription>
            Provide a clear photo or PDF of your ID. Max{' '}
            {Math.round((schema.max_upload_bytes || 0) / (1024 * 1024)) || 8} MB per file. {extHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.fields.map((field) => {
            if (field.type === 'choice') {
              const choices = resolveChoices(schema, field);
              return (
                <div key={field.name} className="space-y-2">
                  <Label>Document type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {choices.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (field.type === 'text') {
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor="kyc-id-num">{field.label}</Label>
                  <Input
                    id="kyc-id-num"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.slice(0, field.max_length))}
                    maxLength={field.max_length}
                    placeholder="As shown on document"
                  />
                </div>
              );
            }
            if (field.type === 'image') {
              const fid = `kyc-file-${field.name}`;
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={fid}>{field.label}</Label>
                  <Input
                    id={fid}
                    type="file"
                    accept="image/*"
                    className="cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (field.name === 'document_image') setFrontFile(f);
                      else if (field.name === 'document_back') setBackFile(f);
                    }}
                  />
                </div>
              );
            }
            if (field.type === 'file') {
              const fid = `kyc-file-${field.name}`;
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={fid}>{field.label}</Label>
                  <Input
                    id={fid}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="cursor-pointer"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              );
            }
            return null;
          })}

          <Button
            type="button"
            className="w-full"
            disabled={submitMut.isPending}
            onClick={() => submitMut.mutate()}
          >
            {submitMut.isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (schemaQ.isLoading || statusQ.isLoading) {
    return (
      <div className="w-full max-w-none px-4 sm:px-6 py-8 text-sm text-muted-foreground">
        Loading verification…
      </div>
    );
  }
  if (schemaQ.isError || !schema) {
    return (
      <div className="w-full max-w-none px-4 sm:px-6 py-8 text-sm text-destructive">
        Could not load KYC. Try again later.
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-4 sm:px-6 py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : null}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                KYC verification
              </h1>
              <p className="text-sm text-muted-foreground">
                {kycRequired ? 'Required to withdraw wallet balance' : 'Identity verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!kycRequired ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            KYC is not required for withdrawals on this site. You can return to your wallet.
            {onBack ? (
              <div className="mt-4">
                <Button type="button" variant="secondary" onClick={onBack}>
                  Back to wallet
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {kycRequired && isVerified && st ? (
        <div className="space-y-6">
          <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/15 p-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-foreground">KYC approved</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your identity is verified. You can withdraw from your wallet and use related features.
              </p>
              {onBack ? (
                <Button type="button" className="mt-2 bg-emerald-600 hover:bg-emerald-700" onClick={onBack}>
                  Back to wallet
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <DocumentsTable st={st} />
        </div>
      ) : null}

      {kycRequired && isReview && st ? (
        <div className="space-y-6">
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Clock className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="space-y-2 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground">KYC under review</h2>
                  <p className="text-sm text-muted-foreground">
                    Your documents were received and are pending admin review. You will be able to withdraw after
                    approval. No further action is needed right now.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <DocumentsTable st={st} />
        </div>
      ) : null}

      {kycRequired && isRejected && st ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
          <div className="space-y-6 min-w-0">
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base text-destructive">KYC rejected</CardTitle>
                <CardDescription>
                  Please read the reason below and submit updated documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {st.rejection_reason ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border bg-background p-4">
                    {st.rejection_reason}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No reason was provided. Please resubmit clear documents.</p>
                )}
              </CardContent>
            </Card>
            <DocumentsTable st={st} />
          </div>
          {showForm ? <div className="min-w-0">{renderSubmitForm()}</div> : null}
        </div>
      ) : null}

      {kycRequired && !isVerified && !isReview && !isRejected ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
          <div className="space-y-4 min-w-0">
            <Card className="bg-muted/30 border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Get started</CardTitle>
                <CardDescription>
                  Upload a valid government ID (citizenship, passport, or driving license). Ensure text and photo are
                  readable.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          {showForm ? <div className="min-w-0">{renderSubmitForm()}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
