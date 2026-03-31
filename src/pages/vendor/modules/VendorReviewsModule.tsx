import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { extractResults, vendorApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function VendorReviewsModule() {
  const qc = useQueryClient();
  const { data: reviewsResp } = useQuery({
    queryKey: ['vendor', 'reviews'],
    queryFn: () => vendorApi.reviews({ page_size: 100 }),
  });
  const reviews = useMemo(() => extractResults<Record<string, unknown>>(reviewsResp), [reviewsResp]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const replyMut = useMutation({
    mutationFn: () => vendorApi.updateReview(activeId!, { reply_text: replyText }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'reviews'] });
      toast.success('Reply saved');
      setReplyOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => vendorApi.updateReview(id, { mark_read: true }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['vendor', 'reviews'] }),
  });

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title="Product reviews"
        subtitle="Reply and mark as read"
        data={reviews}
        columns={[
          { key: 'product', label: 'Product', render: (r) => <span className="font-medium">{String(r.product)}</span> },
          { key: 'customer', label: 'Customer' },
          {
            key: 'rating',
            label: 'Rating',
            render: (r) => (
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn('w-3.5 h-3.5', i < Number(r.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted')}
                  />
                ))}
              </div>
            ),
          },
          { key: 'comment', label: 'Comment', className: 'max-w-xs truncate' },
          {
            key: 'read',
            label: 'Read',
            render: (r) => (
              <Badge variant={r.vendor_read_at ? 'default' : 'secondary'} className="text-xs">
                {r.vendor_read_at ? 'Read' : 'New'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex gap-1">
                {!r.vendor_read_at && (
                  <Button size="sm" variant="outline" className="h-7" onClick={() => readMut.mutate(String(r.id))}>
                    Mark read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => {
                    setActiveId(String(r.id));
                    setReplyText('');
                    setReplyOpen(true);
                  }}
                >
                  Reply
                </Button>
              </div>
            ),
          },
        ]}
      />
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to review</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Your reply…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => activeId && replyMut.mutate()} disabled={replyMut.isPending}>
              Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
