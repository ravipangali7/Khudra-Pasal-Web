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

/**
 * Share the public storefront URL (e.g. /product/slug).
 * Social crawlers must receive OG HTML via nginx / Netlify _redirects / Cloudflare Worker
 * (see deploy/nginx-storefront-seo-bots.conf).
 */
export default function SocialShareButtons({
  kind,
  slug,
  title,
  description,
  variant = 'button',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const pageUrl = buildCanonicalUrl(spaPath(kind, slug));
  const shareText = description?.trim() || `Check out ${title} on Khudra Pasal`;

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Link copied — paste in Facebook, WhatsApp, or Messenger');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: pageUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copyPageLink();
  };

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        className={
          className ??
          'p-2 bg-card/90 backdrop-blur-sm rounded-full shadow-md hover:bg-card transition-colors'
        }
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => {
            window.open(facebookShareUrl(pageUrl), '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(whatsAppShareUrl(pageUrl, shareText), '_blank', 'noopener,noreferrer');
            setOpen(false);
          }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(linkedInShareUrl(pageUrl), '_blank', 'noopener,noreferrer');
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
          Share / copy link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void copyPageLink();
            setOpen(false);
          }}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy product link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
