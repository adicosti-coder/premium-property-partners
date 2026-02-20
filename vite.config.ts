import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
    // Web Worker support — enables new Worker(new URL('./worker', import.meta.url))
    worker: {
      format: 'es',
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "mapbox-gl"],
    },
    build: {
      // Use esbuild for faster, smaller output
      minify: "esbuild",
      // Reduce CSS code splitting overhead
      cssCodeSplit: true,
      // Source maps only in dev (saves ~30% bundle size in prod)
      sourcemap: false,
      // Target modern browsers — avoids polyfill overhead
      target: ["es2020", "chrome87", "firefox78", "safari14"],
      rollupOptions: {
        output: {
          // Granular manual chunks — keeps each async route lean
          manualChunks(id) {
            // Core React runtime — always first to load
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react/jsx-runtime")) {
              return "vendor-react";
            }
            // Router
            if (id.includes("node_modules/react-router-dom/") || id.includes("node_modules/@remix-run/")) {
              return "vendor-router";
            }
            // Data fetching
            if (id.includes("node_modules/@tanstack/")) {
              return "vendor-query";
            }
            // Supabase client
            if (id.includes("node_modules/@supabase/")) {
              return "vendor-supabase";
            }
            // Animation — heavy, only needed when visible
            if (id.includes("node_modules/framer-motion/")) {
              return "vendor-motion";
            }
            // Charts — only on /investitii + owner portal
            if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-")) {
              return "vendor-charts";
            }
            // Map — only on guest/POI pages
            if (id.includes("node_modules/mapbox-gl/")) {
              return "vendor-mapbox";
            }
            // PDF — only when download triggered
            if (id.includes("node_modules/jspdf/")) {
              return "vendor-pdf";
            }
            // Rich text editor — only in admin
            if (id.includes("node_modules/@tiptap/")) {
              return "vendor-tiptap";
            }
            // Date utilities
            if (id.includes("node_modules/date-fns/")) {
              return "vendor-dates";
            }
            // Radix UI primitives (split from heavy libs)
            if (id.includes("node_modules/@radix-ui/")) {
              return "vendor-radix";
            }
            // DnD kit — only in admin
            if (id.includes("node_modules/@dnd-kit/")) {
              return "vendor-dnd";
            }
            // ElevenLabs voice widget
            if (id.includes("node_modules/@elevenlabs/")) {
              return "vendor-elevenlabs";
            }
            // Carousel
            if (id.includes("node_modules/embla-carousel")) {
              return "vendor-carousel";
            }
            // Markdown rendering
            if (id.includes("node_modules/react-markdown/") || id.includes("node_modules/remark") || id.includes("node_modules/unified")) {
              return "vendor-markdown";
            }
            // Admin components — lazy loaded, separate chunk
            if (id.includes("/src/components/admin/")) {
              return "admin-components";
            }
            // Blog components — lazy loaded
            if (id.includes("/src/components/blog/")) {
              return "blog-components";
            }
            // Owner portal components
            if (id.includes("/src/components/owner/")) {
              return "owner-components";
            }
          },
          // Use content hashes for long-term caching
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
        // Safe tree-shaking — do NOT disable moduleSideEffects globally
        // (breaks React, CSS imports, and side-effect-dependent libs)
        treeshake: {
          preset: "recommended",
        },
      },
      // Increase warning limit since we've split aggressively
      chunkSizeWarningLimit: 400,
      // Optimize dep bundling
      commonjsOptions: {
        ignoreDynamicRequires: true,
      },
    },
    // Optimize dev server performance
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "@supabase/supabase-js",
      ],
      exclude: [
        "mapbox-gl",
        "jspdf",
        "@tiptap/react",
        "@dnd-kit/core",
        "@elevenlabs/react",
      ],
    },
  };
});
