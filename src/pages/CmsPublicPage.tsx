import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'isomorphic-dompurify';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { websiteApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function CmsPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['website-cms', slug],
    queryFn: () => websiteApi.cmsPagePublic(slug || ''),
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
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-6">This page is unavailable or not published.</p>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const safe = DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <article>
          {data.featured_image_url ? (
            <img
              src={data.featured_image_url}
              alt=""
              className="w-full max-h-[min(24rem,50vh)] object-cover rounded-xl mb-6 border bg-muted/20"
            />
          ) : null}
          <h1 className="text-3xl font-bold text-foreground mb-2">{data.title}</h1>
          {data.seo_description ? (
            <p className="text-sm text-muted-foreground mb-8">{data.seo_description}</p>
          ) : null}
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
