export const storefrontRoutes = {
  home: () => "/",
  products: () => "/products",
  brands: () => "/brands",
  brandDetail: (id: number | string) => `/brands/${encodeURIComponent(String(id))}`,
  category: (slug: string) => `/category/${encodeURIComponent(slug)}`,
};

