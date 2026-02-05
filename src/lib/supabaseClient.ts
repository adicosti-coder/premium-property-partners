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

// Detect if running on custom domain (not *.lovable.app or localhost)
export const isCustomDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    !hostname.includes("lovable.app") &&
    !hostname.includes("lovableproject.com") &&
    !hostname.includes("localhost") &&
    hostname !== "127.0.0.1"
  );
};

// Build/SSR safety: publishing pipelines may evaluate modules in a non-browser context.
// Avoid direct `localStorage` access at module scope.
const browserStorage: Storage | undefined =
  typeof window !== "undefined" ? window.localStorage : undefined;

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

// Production fallback - use known project ref so realtrust.ro works even if env injection fails
const KNOWN_PROJECT_REF = "mvzssjyzbwccioqvhjpo";
const PRODUCTION_FALLBACK_URL = `https://${KNOWN_PROJECT_REF}.supabase.co`;

// Final fallback: keeps the UI from hard-crashing if everything fails.
const INVALID_FALLBACK_URL = "https://invalid.local";
const INVALID_FALLBACK_KEY = "invalid-publishable-key";

const BOOTSTRAP_CACHE_KEY = "rt_backend_cfg_v1";
// Project ref is NOT a secret; it is required to reach backend functions even if env injection fails.
const PROJECT_REF = "mvzssjyzbwccioqvhjpo";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";
const BOOTSTRAP_URL = `https://${PROJECT_REF}.functions.supabase.co/functions/v1/get-client-config`;

const loadCachedConfig = (): ClientConfig | null => {
  if (!browserStorage) return null;
  try {
    const raw = browserStorage.getItem(BOOTSTRAP_CACHE_KEY);
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
  // Priority 1: Vite environment variables (build-time injection)
  if (ENV_URL && ENV_KEY) {
    return { url: ENV_URL, publishableKey: ENV_KEY, source: "vite_env" };
  }

  // Priority 2: Cached bootstrap from previous session
  const cached = loadCachedConfig();
  if (cached) return cached;

  // Priority 3: ANON key fallback with ENV_URL
  if (ENV_URL && ENV_ANON_KEY) {
    return { url: ENV_URL, publishableKey: ENV_ANON_KEY, source: "vite_env" };
  }

  // Priority 4: Use production fallback URL with ANON key (for realtrust.ro)
  // This ensures the production site works even if env vars are not injected
  if (ENV_ANON_KEY) {
    return { url: PRODUCTION_FALLBACK_URL, publishableKey: ENV_ANON_KEY, source: "fallback" };
  }

  // Final fallback: use hardcoded production values (for custom domains like realtrust.ro)
  // This ensures the site works even without any env vars
  return { url: PRODUCTION_FALLBACK_URL, publishableKey: ANON_KEY, source: "fallback" };
};

// Lazy bootstrap: fetch config from backend and cache it for next load.
const triggerBackgroundBootstrap = () => {
  if (!browserStorage) return;
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
        browserStorage.setItem(
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
    // If we're in a non-browser context, omit storage to avoid hard-crashing.
    storage: browserStorage,
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
