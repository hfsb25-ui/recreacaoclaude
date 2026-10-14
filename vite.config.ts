import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Endereço do projeto Supabase vem do .env (VITE_SUPABASE_URL)
  const supabaseUrl = (env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const escaped = supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const restPattern = new RegExp(`^${escaped}/rest/v1/.*`, "i");
  const storagePattern = new RegExp(`^${escaped}/storage/v1/.*`, "i");
  // Endereço público do site, usado na prévia do link (WhatsApp, redes sociais).
  // Na Vercel vem automático; dá para forçar com VITE_SITE_URL.
  const siteHost =
    env.VITE_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "";
  const siteUrl = siteHost ? (siteHost.startsWith("http") ? siteHost : `https://${siteHost}`).replace(/\/+$/, "") : "";

  return {
  // Ambiente da Vercel (production / preview) — usado pelo modo manutenção
  define: {
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || "local"),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: "site-url-meta",
      transformIndexHtml: (html: string) => html.split("__SITE_URL__").join(siteUrl),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'apple-touch-icon.png'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Recreação Hotel',
        short_name: 'Recreação',
        description: 'App de programação de recreação do hotel',
        theme_color: '#00BCD4',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: restPattern,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: storagePattern,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "next-themes"],
  },
  optimizeDeps: {
    include: ["recharts", "next-themes"],
    exclude: [],
    esbuildOptions: {
      target: "esnext",
    },
  },
  };
});
