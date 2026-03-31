import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'isomorphic-dompurify';
import { Calendar, User, ChevronLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { websiteApi } from '@/lib/api';

function formatPostDate(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function BlogPostDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['website', 'blog-post', slug],
    queryFn: () => websiteApi.blogPost(slug || ''),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-muted-foreground">Loading…</main>
        <Footer />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-12 text-center max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Article not found</h1>
          <p className="text-muted-foreground mb-6">This post is unavailable or not published.</p>
          <Button asChild variant="outline">
            <Link to="/blog">Back to blog</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const safe = DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Button asChild variant="ghost" className="mb-6 -ml-2">
          <Link to="/blog" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            All articles
          </Link>
        </Button>
        {data.cover_image_url ? (
          <div className="rounded-2xl overflow-hidden border border-border mb-8 aspect-video bg-muted">
            <img src={data.cover_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : null}
        <article>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            {data.author_name ? (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {data.author_name}
              </span>
            ) : null}
            {formatPostDate(data.published_at) ? (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatPostDate(data.published_at)}
              </span>
            ) : null}
          </div>
          {data.excerpt ? <p className="text-lg text-muted-foreground mb-8">{data.excerpt}</p> : null}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        </article>
      </main>
      <Footer />
    </div>
  );
}
