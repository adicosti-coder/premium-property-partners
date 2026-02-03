import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd(), "");

  // Prefer build-time env variables (no hardcoded fallbacks to avoid secret-scanner/publish failures)
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    (env as Record<string, string>).SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (env as Record<string, string>).SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    // Back-compat for older pipelines
    env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    (env as Record<string, string>).SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  const supabaseProjectId =
    env.VITE_SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    (env as Record<string, string>).SUPABASE_PROJECT_ID ||
    process.env.SUPABASE_PROJECT_ID;

  const defineEnv: Record<string, string> = {};
  if (supabaseUrl) {
    defineEnv["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(supabaseUrl);
  }
  if (supabaseKey) {
    defineEnv["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(supabaseKey);
  }
  if (supabaseProjectId) {
    defineEnv["import.meta.env.VITE_SUPABASE_PROJECT_ID"] = JSON.stringify(supabaseProjectId);
  }
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: defineEnv,
  };
});
