export const storefrontRoutes = {
  home: () => "/",
  products: () => "/products",
  brands: () => "/brands",
  category: (slug: string) => `/category/${encodeURIComponent(slug)}`,
};

