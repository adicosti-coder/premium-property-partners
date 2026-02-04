/**
 * Backend client (Lovable Cloud)
 *
 * IMPORTANT:
 * - Do NOT hardcode real keys here. Even "public" keys can be flagged by
 *   secret scanners (JWT-shaped strings) and block production publishing.
 * - Primary source of truth is Vite env vars injected at build time.
 * - We keep a non-secret fallback so the app can still render (calls will fail).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Strip accidental quotes from CI/CD or secrets injection
  return trimmed.replace(/^['"]|['"]$/g, "");
};

type ClientConfig = {
  url: string;
  publishableKey: string;
  source: "vite_env" | "bootstrap" | "cache" | "fallback";
};

const ENV_URL = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const ENV_KEY = normalizeEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

// NOTE: Some environments still only inject ANON_KEY (JWT-shaped). We only use it
// as a last resort, and we never hardcode it to avoid secret scanners.
const ENV_ANON_KEY = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Non-secret fallback: keeps the UI from hard-crashing if env injection fails.
// Requests will fail, but the app can still render a helpful error state.
const FALLBACK_URL = "https://invalid.local";
const FALLBACK_PUBLISHABLE_KEY = "invalid-publishable-key";

const BOOTSTRAP_CACHE_KEY = "rt_backend_cfg_v1";
// Project ref is NOT a secret; it is required to reach backend functions even if env injection fails.
const PROJECT_REF = "mvzssjyzbwccioqvhjpo";
const BOOTSTRAP_URL = `https://${PROJECT_REF}.functions.supabase.co/functions/v1/get-client-config`;

const loadCachedConfig = (): ClientConfig | null => {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientConfig>;
    if (typeof parsed.url !== "string" || typeof parsed.publishableKey !== "string") return null;
    if (!parsed.url || !parsed.publishableKey) return null;
    return { url: parsed.url, publishableKey: parsed.publishableKey, source: "cache" };
  } catch {
    return null;
  }
};

/**
 * Synchronously resolve config: Vite env -> cache -> fallback.
 * Bootstrap is triggered lazily in background if needed.
 */
const resolveClientConfigSync = (): ClientConfig => {
  if (ENV_URL && ENV_KEY) {
    return { url: ENV_URL, publishableKey: ENV_KEY, source: "vite_env" };
  }

  // If Vite env is missing, try cached bootstrap first.
  const cached = loadCachedConfig();
  if (cached) return cached;

  // Last resort: if ANON key exists, use it with ENV_URL.
  if (ENV_URL && ENV_ANON_KEY) {
    return { url: ENV_URL, publishableKey: ENV_ANON_KEY, source: "vite_env" };
  }

  return { url: FALLBACK_URL, publishableKey: FALLBACK_PUBLISHABLE_KEY, source: "fallback" };
};

// Lazy bootstrap: fetch config from backend and cache it for next load.
const triggerBackgroundBootstrap = () => {
  fetch(BOOTSTRAP_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(async (resp) => {
      if (!resp.ok) return;
      const json = (await resp.json()) as { url?: string; publishableKey?: string };
      const url = normalizeEnvValue(json.url);
      const publishableKey = normalizeEnvValue(json.publishableKey);
      if (!url || !publishableKey) return;

      try {
        localStorage.setItem(
          BOOTSTRAP_CACHE_KEY,
          JSON.stringify({ url, publishableKey, source: "bootstrap" satisfies ClientConfig["source"] })
        );
      } catch {
        // ignore cache write errors
      }
    })
    .catch(() => {
      // Silent fail; we're using fallback already.
    });
};

// Resolve config synchronously
const clientConfig = resolveClientConfigSync();

const SUPABASE_URL = clientConfig.url;
const SUPABASE_PUBLISHABLE_KEY = clientConfig.publishableKey;

// If using fallback, trigger background bootstrap so next reload has real config.
if (clientConfig.source === "fallback") {
  triggerBackgroundBootstrap();
}

// Log a warning in development if using fallback values
if (import.meta.env.DEV && clientConfig.source !== "vite_env") {
  console.warn(
    "[Backend] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY; using non-secret fallback. API calls will fail until env vars are injected."
  );
}

// Create and export the Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Export the configuration for debugging purposes
export const supabaseConfig = {
  url: SUPABASE_URL,
  usingFallback: clientConfig.source === "fallback",
  source: clientConfig.source,
};

// Export publishable key for rare cases where fetch streaming needs it (SSE).
// This is a public key, but we still avoid hardcoding it.
export const supabasePublishableKey = SUPABASE_PUBLISHABLE_KEY;
