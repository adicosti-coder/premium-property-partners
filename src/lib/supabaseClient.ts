/**
 * Backend client (Lovable Cloud)
 *
 * IMPORTANT:
 * - Do NOT hardcode real keys here. Even "public" keys can be flagged by
 *   secret scanners (JWT-shaped strings) and block production publishing.
 * - Primary source of truth is Vite env vars injected at build time.
 * - We keep a non-secret fallback so the app can still render (calls will fail).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Strip accidental quotes from CI/CD or secrets injection
  return trimmed.replace(/^['"]|['"]$/g, "");
};

const ENV_URL = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const ENV_KEY = normalizeEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const hasEnv = Boolean(ENV_URL && ENV_KEY);

// Non-secret fallback: keeps the UI from hard-crashing if env injection fails.
// Requests will fail, but the app can still render a helpful error state.
const FALLBACK_URL = "https://invalid.local";
const FALLBACK_PUBLISHABLE_KEY = "invalid-publishable-key";

const SUPABASE_URL = hasEnv ? ENV_URL! : FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY = hasEnv ? ENV_KEY! : FALLBACK_PUBLISHABLE_KEY;

// Log a warning in development if using fallback values
if (import.meta.env.DEV && !hasEnv) {
  console.warn(
    "[Backend] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY; using non-secret fallback. API calls will fail until env vars are injected.",
  );
}

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export the configuration for debugging purposes
export const supabaseConfig = {
  url: SUPABASE_URL,
  usingFallback: !hasEnv,
};
