import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

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
        jpg: { quality: 75, progressive: true },
        jpeg: { quality: 75, progressive: true },
        png: { quality: 75 },
        webp: { quality: 75, effort: 4 },
        avif: { quality: 60, effort: 4 },
      }),
      // Convert render-blocking CSS <link> to async loading in production build
      {
        name: "async-css",
        enforce: "post" as const,
        transformIndexHtml(html: string) {
          if (mode !== "production") return html;
          return html.replace(
            /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
            (_match: string, href: string) =>
              `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'" crossorigin>` +
              `<noscript><link rel="stylesheet" href="${href}" crossorigin></noscript>`
          );
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "mapbox-gl"],
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // IMPORTANT: Do NOT separate React from its consumers.
            // Libraries like react-query call React.createContext at module scope,
            // so they MUST share the same React instance (same chunk or natural imports).

            // Core React runtime — includes react-query which calls createContext at init
            if (/node_modules\/(react|react-dom|scheduler|@tanstack\/react-query)\//.test(id)) {
              return "vendor-react";
            }
            // Router
            if (/node_modules\/(react-router|react-router-dom)\//.test(id)) {
              return "vendor-react";
            }
            // Supabase SDK
            if (/node_modules\/(@supabase\/supabase-js|@supabase\/)/.test(id)) {
              return "vendor-data";
            }
            // UI primitives: radix + shadcn deps
            if (/node_modules\/(@radix-ui\/|class-variance-authority|clsx|tailwind-merge|cmdk|vaul|input-otp|embla-carousel|sonner)/.test(id)) {
              return "vendor-ui";
            }
            // Lucide icons
            if (/node_modules\/lucide-react/.test(id)) {
              return "vendor-icons";
            }
            // Heavy optional libs
            if (/node_modules\/(framer-motion|recharts|d3-|victory-)/.test(id)) {
              return "vendor-heavy";
            }
            // Forms + validation
            if (/node_modules\/(react-hook-form|@hookform|zod|react-day-picker|date-fns)/.test(id)) {
              return "vendor-forms";
            }
          },
        },
      },
      // Increase chunk size warning limit given vendor splitting
      chunkSizeWarningLimit: 600,
    },
  };
});
