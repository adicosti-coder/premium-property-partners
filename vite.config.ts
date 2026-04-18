import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import vitePrerenderSeo from "./plugins/vite-prerender-seo";
// Note: viteAsyncCss removed — caused FOUC/CLS regression in PageSpeed.

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, "");
};

// Hardcoded fallback values for Supabase (ensures client.ts never crashes)
const FALLBACK_SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const FALLBACK_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files (if any) and merge with process.env (CI/hosting)
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const readEnv = (key: string) => fileEnv[key] ?? process.env[key];

  // Prefer publishable key (non-JWT) for client usage.
  const supabaseUrl = normalizeEnvValue(readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL")) || FALLBACK_SUPABASE_URL;
  const publishableKey = normalizeEnvValue(
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? readEnv("SUPABASE_PUBLISHABLE_KEY"),
  ) || FALLBACK_SUPABASE_KEY;

  // Mapbox public token (safe to embed - starts with pk.)
  const mapboxToken = normalizeEnvValue(readEnv("VITE_MAPBOX_PUBLIC_TOKEN"));

  // Always define the env vars with fallback values to prevent "supabaseUrl is required" error
  const defineEnv: Record<string, string> = {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
    ...(mapboxToken && { "import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN": JSON.stringify(mapboxToken) }),
  };

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: defineEnv,
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      ViteImageOptimizer({
        test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
        jpg: { quality: 55, progressive: true },
        jpeg: { quality: 55, progressive: true },
        png: { quality: 55 },
        webp: { quality: 35, effort: 6 },
        avif: { quality: 30, effort: 6 },
      }),
      mode === "production" && viteAsyncCss(),
      mode === "production" && vitePrerenderSeo(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "mapbox-gl"],
    },
    build: {
      // Fully disable modulepreload — prevents browser from eagerly fetching lazy chunks
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Core vendor libs loaded on every page — kept together
            // because react-router-dom depends on react/react-dom
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            // Embla carousel isolated — causes forced reflow (60ms);
            // separate chunk allows browser to parse it in its own task
            "vendor-embla": ["embla-carousel-react", "embla-carousel-autoplay"],
            // Heavy libs (framer-motion, recharts, mapbox-gl, supabase)
            // split naturally via lazy() imports — NOT listed here
          },
        },
      },
      // Increase chunk size warning limit given vendor splitting
      chunkSizeWarningLimit: 600,
      // Target modern browsers to reduce polyfill size
      target: 'es2020',
    },
  };
});
