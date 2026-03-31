import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'isomorphic-dompurify';
import { FileText, Edit, Trash2, MoreVertical, Eye } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { CmsRichTextEditor } from '@/components/admin/CmsRichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { slugifyText } from '../hooks/adminFormUtils';

type CmsPageRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  lastUpdated: string;
  seoTitle: string;
  seoDesc: string;
};

export default function CMSModule() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editItem, setEditItem] = useState<CmsPageRow | null>(null);
  const [previewItem, setPreviewItem] = useState<CmsPageRow | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    seoTitle: '',
    seoDesc: '',
    status: 'draft',
  });
  const [slugEdited, setSlugEdited] = useState(false);

  const { data: cmsPages = [], isLoading, isError } = useAdminList<CmsPageRow>(
    ['admin', 'cms-pages'],
    () => adminApi.cmsPages({ page_size: 200 }),
  );
  const createMutation = useAdminMutation(adminApi.createCmsPage, [['admin', 'cms-pages']]);
  const updateMutation = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateCmsPage(id, payload),
    [['admin', 'cms-pages']],
  );
  const deleteMutation = useAdminMutation(adminApi.deleteCmsPage, [['admin', 'cms-pages']]);

  const { data: editDetail, isLoading: editDetailLoading } = useQuery({
    queryKey: ['admin', 'cms-detail', editItem?.id],
    queryFn: () => adminApi.cmsPageDetail(editItem!.id),
    enabled: modalOpen && !!editItem?.id,
  });

  const { data: previewDetail } = useQuery({
    queryKey: ['admin', 'cms-detail', 'preview', previewItem?.id],
    queryFn: () => adminApi.cmsPageDetail(previewItem!.id),
    enabled: previewOpen && !!previewItem?.id,
  });

  useEffect(() => {
    if (!editDetail || !editItem) return;
    setForm({
      title: editDetail.title,
      slug: editDetail.slug,
      content: editDetail.content || '',
      seoTitle: editDetail.seoTitle || '',
      seoDesc: editDetail.seoDesc || '',
      status: editDetail.status,
    });
    setSlugEdited(true);
  }, [editDetail, editItem?.id]);

  const resetForm = () => {
    setForm({ title: '', slug: '', content: '', seoTitle: '', seoDesc: '', status: 'draft' });
    setSlugEdited(false);
  };

  const openEdit = (item: CmsPageRow) => {
    setEditItem(item);
    setForm({
      title: item.title,
      slug: item.slug,
      content: '',
      seoTitle: item.seoTitle ?? '',
      seoDesc: item.seoDesc ?? '',
      status: item.status,
    });
    setSlugEdited(true);
    setModalOpen(true);
  };

  const savePage = async () => {
    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      seo_title: form.seoTitle,
      seo_description: form.seoDesc,
      status: form.status,
    };
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModalOpen(false);
    setEditItem(null);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading CMS pages…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load CMS pages.</div>;
  }

  const previewHtml = previewDetail?.content
    ? DOMPurify.sanitize(previewDetail.content, { USE_PROFILES: { html: true } })
    : '';

  return (
    <div className="p-4 lg:p-6">
      <AdminTable title="CMS Pages" subtitle="Manage static pages — About, Terms, Privacy, Shipping Policy, Refund Policy"
        data={cmsPages}
        columns={[
          { key: 'title', label: 'Page', render: (p) => (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <div><span className="font-medium">{p.title}</span><p className="text-xs text-muted-foreground">{p.slug}</p></div>
            </div>
          )},
          { key: 'seoTitle', label: 'SEO Title', render: (p) => p.seoTitle || <span className="text-muted-foreground">—</span> },
          { key: 'lastUpdated', label: 'Last Updated' },
          { key: 'status', label: 'Status', render: (p) => (
            <Badge variant={p.status === 'published' ? 'default' : 'secondary'}
              className={cn("text-xs", p.status === 'published' && "bg-emerald-500")}>{p.status}</Badge>
          )},
          { key: 'actions', label: '', render: (p) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPreviewItem(p); setPreviewOpen(true); }}><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(p); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={() => { setEditItem(null); resetForm(); setModalOpen(true); }} addLabel="Add Page"
      />

      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); resetForm(); }}
        title={editItem ? 'Edit Page' : 'Add Page'}
        size="xl"
        onSave={savePage}
        loading={!!editItem && editDetailLoading}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {editItem && editDetailLoading ? (
            <p className="text-sm text-muted-foreground">Loading page content…</p>
          ) : null}
          <div><Label>Page Title</Label><Input placeholder="About Us" value={form.title} onChange={(e) => {
            const title = e.target.value;
            setForm((prev) => ({ ...prev, title, slug: slugEdited ? prev.slug : slugifyText(title) }));
          }} /></div>
          <div><Label>Slug</Label><Input placeholder="about" value={form.slug} onChange={(e) => {
            setSlugEdited(true);
            setForm((prev) => ({ ...prev, slug: slugifyText(e.target.value) }));
          }} /></div>
          <div>
            <Label>Content</Label>
            <div className="mt-2">
              <CmsRichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} />
            </div>
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">SEO Fields</h4>
            <div><Label>SEO Title</Label><Input placeholder="Meta title" value={form.seoTitle} onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))} /></div>
            <div><Label>Meta Description</Label><Textarea rows={2} placeholder="Meta description" value={form.seoDesc} onChange={(e) => setForm((prev) => ({ ...prev, seoDesc: e.target.value }))} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>Published</Label><Switch checked={form.status === 'published'} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, status: checked ? 'published' : 'draft' }))} /></div>
        </div>
      </CRUDModal>

      <CRUDModal open={previewOpen} onClose={() => { setPreviewOpen(false); setPreviewItem(null); }} title={`Preview: ${previewItem?.title || 'Page'}`} size="xl" onSave={() => { setPreviewOpen(false); setPreviewItem(null); }} saveLabel="Close">
        {previewItem && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Public URL: <code className="text-foreground">/page/{previewItem.slug}</code> (when published)
            </p>
            <div className="border rounded-lg p-6 bg-muted/20 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
              <h1 className="text-2xl font-bold mb-2">{previewDetail?.title ?? previewItem.title}</h1>
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-muted-foreground">No content yet.</p>
              )}
            </div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
        if (editItem) await deleteMutation.mutateAsync(editItem.id);
        setDeleteOpen(false);
        setEditItem(null);
      }} description="This will permanently delete this page." />
    </div>
  );
}
