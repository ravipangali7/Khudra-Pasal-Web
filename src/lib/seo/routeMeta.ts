import type { MetaInput } from '@/lib/seo/metaTags';

type RouteRule = {
  test: (pathname: string) => boolean;
  meta: MetaInput;
};

const rules: RouteRule[] = [
  {
    test: (p) => p === '/',
    meta: { ogType: 'website' },
  },
  {
    test: (p) => p === '/blog',
    meta: {
      title: 'Blog',
      description: 'News, tips, and updates from Khudra Pasal.',
      ogType: 'website',
    },
  },
  {
    test: (p) => p.startsWith('/blog/'),
    meta: { ogType: 'article' },
  },
  {
    test: (p) => p.startsWith('/product/'),
    meta: { ogType: 'product' },
  },
  {
    test: (p) => p.startsWith('/page/'),
    meta: { ogType: 'website' },
  },
  {
    test: (p) => p.startsWith('/category/') || p.startsWith('/products'),
    meta: {
      title: 'Shop',
      description: 'Browse products on Khudra Pasal.',
      ogType: 'website',
    },
  },
  {
    test: (p) => p === '/brands' || p.startsWith('/brands/'),
    meta: {
      title: 'Brands',
      description: 'Shop by brand on Khudra Pasal.',
      ogType: 'website',
    },
  },
  {
    test: (p) => p.startsWith('/store/'),
    meta: { ogType: 'website' },
  },
  {
    test: (p) => p === '/login' || p.startsWith('/login/'),
    meta: { title: 'Login', robots: 'noindex,follow' },
  },
  {
    test: (p) => p === '/signup' || p.startsWith('/signup/'),
    meta: { title: 'Sign up', robots: 'noindex,follow' },
  },
  {
    test: (p) => p === '/checkout',
    meta: { title: 'Checkout', robots: 'noindex,follow' },
  },
  {
    test: (p) => p.startsWith('/portal'),
    meta: { title: 'My account', robots: 'noindex,follow' },
  },
  {
    test: (p) => p.startsWith('/family-portal'),
    meta: { title: 'Family portal', robots: 'noindex,follow' },
  },
  {
    test: (p) => p.startsWith('/child-portal'),
    meta: { title: 'Child portal', robots: 'noindex,follow' },
  },
  {
    test: (p) => p.startsWith('/admin'),
    meta: { title: 'Admin', robots: 'noindex,nofollow' },
  },
  {
    test: (p) => p.startsWith('/vendor'),
    meta: { title: 'Vendor', robots: 'noindex,nofollow' },
  },
  {
    test: (p) => p.startsWith('/join-family'),
    meta: { title: 'Join family', robots: 'noindex,follow' },
  },
  {
    test: (p) => p === '/reels' || p.startsWith('/reels/'),
    meta: { title: 'Reels', robots: 'noindex,follow' },
  },
];

export function getRouteMeta(pathname: string): MetaInput {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const rule of rules) {
    if (rule.test(normalized)) return { ...rule.meta };
  }
  return { ogType: 'website' };
}
