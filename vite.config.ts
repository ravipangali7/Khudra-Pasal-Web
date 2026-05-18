import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { seoCrawlerProxyPlugin } from "./plugins/seoCrawlerProxy";

function seoBuildPlugin(): Plugin {
  const siteOrigin = (
    process.env.VITE_PUBLIC_APP_URL || "https://khudrapasal.360winx.com"
  ).replace(/\/$/, "");
  return {
    name: "khudra-seo-build",
    transformIndexHtml(html) {
      return html
        .replace(/https:\/\/khudrapasal\.360winx\.com/g, siteOrigin)
        .replace(
          'href="https://khudrapasal.360winx.com/"',
          `href="${siteOrigin}/"`,
        );
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${siteOrigin}/api/meta/sitemap.xml
`,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "https://khudrapasalserver.360winx.com",
        changeOrigin: true,
        secure: true,
      },
      "/media": {
        target: "https://khudrapasalserver.360winx.com",
        changeOrigin: true,
        secure: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    seoCrawlerProxyPlugin(),
    seoBuildPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "vendor-ui";
          }
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          if (
            id.includes("/react/") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));
