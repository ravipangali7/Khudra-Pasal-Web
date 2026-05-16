import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'isomorphic-dompurify';
import { Newspaper, Edit, Trash2, MoreVertical, Eye } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { CmsRichTextEditor } from '@/components/admin/CmsRichTextEditor';
import { SeoFields } from '@/components/admin/SeoFields';
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
import { stripHtml } from '@/lib/seoUtils';

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  seoTitle: string;
  seoDesc: string;
  publishedAt: string;
  authorName: string;
  coverUrl?: string;
};

export default function BlogModule() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editItem, setEditItem] = useState<BlogRow | null>(null);
  const [previewItem, setPreviewItem] = useState<BlogRow | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    seoTitle: '',
    seoDesc: '',
    status: 'draft',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverCleared, setCoverCleared] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const { data: posts = [], isLoading, isError } = useAdminList<BlogRow>(
    ['admin', 'blog-posts'],
    () => adminApi.blogPosts({ page_size: 200 }),
  );
  const createMutation = useAdminMutation(adminApi.createBlogPost, [['admin', 'blog-posts']]);
  const updateMutation = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> | FormData }) =>
      adminApi.updateBlogPost(id, payload),
    [['admin', 'blog-posts']],
  );
  const deleteMutation = useAdminMutation(adminApi.deleteBlogPost, [['admin', 'blog-posts']]);

  const { data: editDetail, isLoading: editDetailLoading } = useQuery({
    queryKey: ['admin', 'blog-detail', editItem?.id],
    queryFn: () => adminApi.blogPostDetail(editItem!.id),
    enabled: modalOpen && !!editItem?.id,
  });

  const { data: previewDetail } = useQuery({
    queryKey: ['admin', 'blog-detail', 'preview', previewItem?.id],
    queryFn: () => adminApi.blogPostDetail(previewItem!.id),
    enabled: previewOpen && !!previewItem?.id,
  });

  useEffect(() => {
    if (!coverFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    if (!editDetail || !editItem) return;
    setForm({
      title: editDetail.title,
      slug: editDetail.slug,
      excerpt: editDetail.excerpt || '',
      content: editDetail.content || '',
      seoTitle: editDetail.seoTitle || '',
      seoDesc: editDetail.seoDesc || '',
      status: editDetail.status,
    });
    setSlugEdited(true);
    setCoverFile(null);
    setCoverCleared(false);
  }, [editDetail, editItem?.id]);

  const resetForm = () => {
    setForm({ title: '', slug: '', excerpt: '', content: '', seoTitle: '', seoDesc: '', status: 'draft' });
    setSlugEdited(false);
    setCoverFile(null);
    setCoverCleared(false);
  };

  const openEdit = (item: BlogRow) => {
    setEditItem(item);
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? '',
      content: '',
      seoTitle: item.seoTitle ?? '',
      seoDesc: item.seoDesc ?? '',
      status: item.status,
    });
    setSlugEdited(true);
    setCoverFile(null);
    setCoverCleared(false);
    setModalOpen(true);
  };

  const suggestSeoFromTitle = (title: string) => {
    const t = title.trim();
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      seoTitle: prev.seoTitle || t.slice(0, 70),
      seoDesc: prev.seoDesc || t.slice(0, 160),
    }));
  };

  const buildPayload = () => ({
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    seo_title: form.seoTitle,
    seo_description: form.seoDesc,
    status: form.status,
  });

  const savePost = async () => {
    const base = buildPayload();
    if (coverFile) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append('cover_image', coverFile);
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, payload: fd });
      } else {
        await createMutation.mutateAsync(fd);
      }
    } else if (editItem && coverCleared) {
      await updateMutation.mutateAsync({
        id: editItem.id,
        payload: { ...base, clear_cover_image: true },
      });
    } else if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, payload: base });
    } else {
      await createMutation.mutateAsync(base);
    }
    await queryClient.invalidateQueries({ queryKey: ['website', 'blog-posts'] });
    setModalOpen(false);
    setEditItem(null);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading blog posts…</div>;
  }
  if (isError) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load blog posts.</div>;
  }

  const previewHtml = previewDetail?.content
    ? DOMPurify.sanitize(previewDetail.content, { USE_PROFILES: { html: true } })
    : '';

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title="Blog"
        subtitle="Articles for /blog — rich content with SEO meta"
        data={posts}
        columns={[
          {
            key: 'title',
            label: 'Post',
            render: (p) => (
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" />
                <div>
                  <span className="font-medium">{p.title}</span>
                  <p className="text-xs text-muted-foreground">{p.slug}</p>
                </div>
              </div>
            ),
          },
          { key: 'authorName', label: 'Author' },
          { key: 'publishedAt', label: 'Published' },
          {
            key: 'status',
            label: 'Status',
            render: (p) => (
              <Badge
                variant={p.status === 'published' ? 'default' : 'secondary'}
                className={cn('text-xs', p.status === 'published' && 'bg-emerald-500')}
              >
                {p.status}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (p) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(p)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setPreviewItem(p); setPreviewOpen(true); }}>
                    <Eye className="w-4 h-4 mr-2" /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => { setEditItem(p); setDeleteOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
        onAdd={() => { setEditItem(null); resetForm(); setModalOpen(true); }}
        addLabel="Add post"
      />

      <CRUDModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); resetForm(); }}
        title={editItem ? 'Edit post' : 'Add post'}
        size="xl"
        onSave={savePost}
        loading={!!editItem && editDetailLoading}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {editItem && editDetailLoading ? (
            <p className="text-sm text-muted-foreground">Loading post…</p>
          ) : null}
          <div>
            <Label>Title</Label>
            <Input
              placeholder="Article title"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: slugEdited ? prev.slug : slugifyText(title),
                }));
                if (!form.seoTitle) suggestSeoFromTitle(title);
              }}
            />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              placeholder="article-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setForm((prev) => ({ ...prev, slug: slugifyText(e.target.value) }));
              }}
            />
          </div>
          <div>
            <Label>Excerpt</Label>
            <Textarea
              rows={2}
              placeholder="Short summary for blog listing"
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value.slice(0, 500) }))}
            />
          </div>
          <div>
            <Label>Content</Label>
            <div className="mt-2">
              <CmsRichTextEditor
                value={form.content}
                minHeight="280px"
                onChange={(html) => {
                  setForm((prev) => {
                    const plain = stripHtml(html);
                    return {
                      ...prev,
                      content: html,
                      seoDesc: prev.seoDesc || plain.slice(0, 160),
                      excerpt: prev.excerpt || plain.slice(0, 500),
                    };
                  });
                }}
              />
            </div>
          </div>
          <div>
            <Label>Cover image</Label>
            <Input
              type="file"
              accept="image/*"
              className="cursor-pointer mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCoverFile(f);
                  setCoverCleared(false);
                }
                e.target.value = '';
              }}
            />
            {localPreviewUrl || (!coverCleared && editDetail?.coverUrl) ? (
              <div className="mt-3 space-y-2">
                <img
                  src={localPreviewUrl || editDetail?.coverUrl || ''}
                  alt=""
                  className="max-h-40 rounded-md border object-contain bg-muted/30"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverCleared(true);
                  }}
                >
                  Remove cover
                </Button>
              </div>
            ) : null}
          </div>
          <SeoFields
            title={form.seoTitle}
            description={form.seoDesc}
            onTitleChange={(seoTitle) => setForm((prev) => ({ ...prev, seoTitle }))}
            onDescriptionChange={(seoDesc) => setForm((prev) => ({ ...prev, seoDesc }))}
          />
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch
              checked={form.status === 'published'}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, status: checked ? 'published' : 'draft' }))
              }
            />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewItem(null); }}
        title={`Preview: ${previewItem?.title || 'Post'}`}
        size="xl"
        onSave={() => { setPreviewOpen(false); setPreviewItem(null); }}
        saveLabel="Close"
      >
        {previewItem ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Public URL: <code className="text-foreground">/blog/{previewItem.slug}</code>
            </p>
            <div className="border rounded-lg p-6 bg-muted/20 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
              {previewDetail?.coverUrl ? (
                <img
                  src={previewDetail.coverUrl}
                  alt=""
                  className="w-full max-h-48 object-cover rounded-md mb-4 not-prose"
                />
              ) : null}
              <h1 className="text-2xl font-bold mb-2">{previewDetail?.title ?? previewItem.title}</h1>
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-muted-foreground">No content yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </CRUDModal>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (editItem) await deleteMutation.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }}
        description="This will permanently delete this blog post."
      />
    </div>
  );
}
