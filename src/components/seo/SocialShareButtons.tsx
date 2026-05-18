import { useState } from 'react';
import { Copy, Facebook, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  buildBlogShareUrl,
  buildCmsShareUrl,
  buildProductShareUrl,
  facebookShareUrl,
  linkedInShareUrl,
  whatsAppShareUrl,
} from '@/lib/seo/shareUrls';
import { buildCanonicalUrl } from '@/lib/seo/metaTags';

export type ShareEntityKind = 'product' | 'blog' | 'cms';

type Props = {
  kind: ShareEntityKind;
  slug: string;
  title: string;
  description?: string;
  /** Icon-only trigger (product gallery). */
  variant?: 'icon' | 'button';
  className?: string;
};

function buildShareApiUrl(kind: ShareEntityKind, slug: string): string {
  switch (kind) {
    case 'product':
      return buildProductShareUrl(slug);
    case 'blog':
      return buildBlogShareUrl(slug);
    case 'cms':
      return buildCmsShareUrl(slug);
  }
}

function spaPath(kind: ShareEntityKind, slug: string): string {
  switch (kind) {
    case 'product':
      return `/product/${slug}`;
    case 'blog':
      return `/blog/${slug}`;
    case 'cms':
      return `/page/${slug}`;
  }
}

export default function SocialShareButtons({
  kind,
  slug,
  title,
  description,
  variant = 'button',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const shareApiUrl = buildShareApiUrl(kind, slug);
  const pageUrl = buildCanonicalUrl(spaPath(kind, slug));
  const shareText = description?.trim() || `Check out ${title} on Khudra Pasal`;

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Page link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareApiUrl,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    window.open(facebookShareUrl(shareApiUrl), '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        className={className ?? 'p-2 bg-card/90 backdrop-blur-sm rounded-full shadow-md hover:bg-card transition-colors'}
        aria-label="Share"
      >
        <Share2 className="w-5 h-5 text-foreground" />
      </button>
    ) : (
      <Button type="button" variant="outline" size="sm" className={className}>
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => {
            window.open(facebookShareUrl(shareApiUrl), '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(whatsAppShareUrl(shareApiUrl, shareText), '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(linkedInShareUrl(shareApiUrl), '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
        >
          <Link2 className="w-4 h-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void nativeShare();
            setOpen(false);
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          More options…
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void copyPageLink();
            setOpen(false);
          }}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy page link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
