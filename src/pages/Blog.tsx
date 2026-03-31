import { useState } from 'react';
import { Calendar, User, ChevronRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileFooterNav from '@/components/layout/MobileFooterNav';
import ScrollToTop from '@/components/ui/ScrollToTop';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
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

const Blog = () => {
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: posts = [], isLoading, isError } = useQuery({
    queryKey: ['website', 'blog-posts', searchQuery],
    queryFn: () =>
      websiteApi.blogPosts(searchQuery.trim() ? { search: searchQuery.trim() } : undefined),
  });

  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header cartCount={cartCount} />

      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Khudra Blog</h1>
          <p className="text-muted-foreground">Articles from our team — published from the admin panel</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles…"
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-12">Loading articles…</p>}

        {isError && (
          <p className="text-center text-destructive py-12">Could not load articles. Please try again later.</p>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No published articles yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Add posts in Django admin when you are ready.</p>
          </div>
        )}

        {!isLoading && !isError && featuredPost && (
          <div className="mb-12">
            <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
              <div className="grid md:grid-cols-2">
                <div className="aspect-video md:aspect-auto bg-muted">
                  <img
                    src={featuredPost.cover_image_url || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover min-h-[200px]"
                  />
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4 w-fit">
                    Latest
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{featuredPost.title}</h2>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {featuredPost.excerpt || 'Read the full article.'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                    {featuredPost.author_name ? (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {featuredPost.author_name}
                      </span>
                    ) : null}
                    {formatPostDate(featuredPost.published_at) ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatPostDate(featuredPost.published_at)}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    to={`/blog/${encodeURIComponent(featuredPost.slug)}`}
                    className="flex items-center gap-2 text-primary font-semibold hover:underline w-fit"
                  >
                    Read more <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {gridPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <article
                key={post.id}
                className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
              >
                <Link to={`/blog/${encodeURIComponent(post.slug)}`} className="block">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={post.cover_image_url || '/placeholder.svg'}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {post.excerpt || 'Read the full article.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {formatPostDate(post.published_at) ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatPostDate(post.published_at)}
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <ScrollToTop />
      <MobileFooterNav />
    </div>
  );
};

export default Blog;
