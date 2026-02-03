import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env* files (if any) AND use process.env as fallback.
  // Critical: never "define" env keys to undefined, because it overrides Vite's runtime import.meta.env.
  const env = loadEnv(mode, process.cwd(), "");

  // Some build environments pass quoted values (e.g. "https://...").
  // If we JSON.stringify those, the quotes become part of the runtime string and Supabase rejects the URL.
  const normalizeEnvValue = (value: string | undefined) => {
    if (!value) return value;
    const v = value.trim();
    const isDoubleQuoted = v.length >= 2 && v.startsWith('"') && v.endsWith('"');
    const isSingleQuoted = v.length >= 2 && v.startsWith("'") && v.endsWith("'");
    return (isDoubleQuoted || isSingleQuoted) ? v.slice(1, -1) : v;
  };

  const supabaseUrl =
    normalizeEnvValue(env.VITE_SUPABASE_URL) ||
    normalizeEnvValue(process.env.VITE_SUPABASE_URL) ||
    normalizeEnvValue((env as Record<string, string>).SUPABASE_URL) ||
    normalizeEnvValue(process.env.SUPABASE_URL);

  const supabaseKey =
    normalizeEnvValue(env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    normalizeEnvValue(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    normalizeEnvValue((env as Record<string, string>).SUPABASE_PUBLISHABLE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    // Back-compat fallbacks
    normalizeEnvValue(env.VITE_SUPABASE_ANON_KEY) ||
    normalizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY) ||
    normalizeEnvValue((env as Record<string, string>).SUPABASE_ANON_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_ANON_KEY);

  const supabaseProjectId =
    normalizeEnvValue(env.VITE_SUPABASE_PROJECT_ID) ||
    normalizeEnvValue(process.env.VITE_SUPABASE_PROJECT_ID) ||
    normalizeEnvValue((env as Record<string, string>).SUPABASE_PROJECT_ID) ||
    normalizeEnvValue(process.env.SUPABASE_PROJECT_ID);

  // Fallback: in some hosted build environments the URL may not be injected,
  // but the project id is. Derive the canonical API URL from the project id.
  const supabaseUrlDerivedFromProjectId = supabaseProjectId
    ? `https://${supabaseProjectId}.supabase.co`
    : undefined;

  const resolvedSupabaseUrl = supabaseUrl || supabaseUrlDerivedFromProjectId;

  const defineEnv: Record<string, string> = {};
  if (resolvedSupabaseUrl) {
    defineEnv["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(resolvedSupabaseUrl);
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
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: defineEnv,
  };
});
