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
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "@radix-ui/react-tabs"],
            "vendor-motion": ["framer-motion"],
            "vendor-charts": ["recharts"],
            "vendor-supabase": ["@supabase/supabase-js"],
          },
        },
      },
      // Increase chunk size warning limit given vendor splitting
      chunkSizeWarningLimit: 600,
    },
  };
});
