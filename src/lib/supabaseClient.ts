/**
 * Backend client (Lovable Cloud) - Lazy Singleton Pattern
 *
 * Uses lazy initialization to ensure environment variables are read at runtime.
 * Critical for custom domains (realtrust.ro) where env vars may not be available
 * at module load time during SSR/build.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Constants
// ============================================================================

// Production constants - NOT secrets, required for custom domain fallback
const PROJECT_REF = "mvzssjyzbwccioqvhjpo";
const PRODUCTION_URL = `https://${PROJECT_REF}.supabase.co`;
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";
const BOOTSTRAP_CACHE_KEY = "rt_backend_cfg_v2";

// ============================================================================
// Types
// ============================================================================

type ClientConfig = {
  url: string;
  publishableKey: string;
  source: "vite_env" | "bootstrap" | "cache" | "fallback";
};

// ============================================================================
// Singleton State
// ============================================================================

let _supabaseClient: SupabaseClient<Database> | null = null;
let _clientConfig: ClientConfig | null = null;
let _publishableKey: string = ANON_KEY; // Default fallback, updated on init
let _bootstrapTriggered = false;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect if running on custom domain
 */
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

/**
 * Get browser storage safely (SSR-safe)
 */
const getBrowserStorage = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * Normalize environment variable values
 */
const normalizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, "");
};

/**
 * Read environment variables at runtime
 */
const getEnvVars = () => ({
  url: normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL),
  key: normalizeEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  anonKey: normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY),
});

/**
 * Load cached config from localStorage
 */
const loadCachedConfig = (): ClientConfig | null => {
  const storage = getBrowserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientConfig>;
    if (!parsed.url || !parsed.publishableKey) return null;
    return { url: parsed.url, publishableKey: parsed.publishableKey, source: "cache" };
  } catch {
    return null;
  }
};

/**
 * Resolve client configuration at runtime
 */
const resolveClientConfig = (): ClientConfig => {
  const env = getEnvVars();

  // Priority 1: Vite environment variables
  if (env.url && env.key) {
    return { url: env.url, publishableKey: env.key, source: "vite_env" };
  }

  // Priority 2: Cached bootstrap
  const cached = loadCachedConfig();
  if (cached) return cached;

  // Priority 3: ANON key fallback with env URL
  if (env.url && env.anonKey) {
    return { url: env.url, publishableKey: env.anonKey, source: "vite_env" };
  }

  // Priority 4: Production fallback
  if (env.anonKey) {
    return { url: PRODUCTION_URL, publishableKey: env.anonKey, source: "fallback" };
  }

  // Final fallback: hardcoded production values
  return { url: PRODUCTION_URL, publishableKey: ANON_KEY, source: "fallback" };
};

/**
 * Trigger background bootstrap to fetch config from Edge Function
 */
const triggerBackgroundBootstrap = () => {
  if (_bootstrapTriggered) return;
  _bootstrapTriggered = true;

  const storage = getBrowserStorage();
  if (!storage) return;

  fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/get-client-config`, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(async (resp) => {
      if (!resp.ok) return;
      const json = (await resp.json()) as { url?: string; publishableKey?: string };
      const url = normalizeEnvValue(json.url);
      const publishableKey = normalizeEnvValue(json.publishableKey);
      if (!url || !publishableKey) return;
      storage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify({ url, publishableKey, source: "bootstrap" }));
    })
    .catch(() => {});
};

/**
 * Initialize and get the Supabase client (lazy singleton)
 */
const getSupabaseClient = (): SupabaseClient<Database> => {
  if (_supabaseClient) return _supabaseClient;

  // Resolve config at runtime
  _clientConfig = resolveClientConfig();
  _publishableKey = _clientConfig.publishableKey;

  // Create client
  const storage = getBrowserStorage();
  _supabaseClient = createClient<Database>(_clientConfig.url, _clientConfig.publishableKey, {
    auth: {
      storage: storage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // Dev warning
  if (import.meta.env.DEV && _clientConfig.source !== "vite_env") {
    console.warn("[Backend] Using fallback config:", _clientConfig.source);
  }

  // Background bootstrap if using fallback
  if (_clientConfig.source === "fallback") {
    triggerBackgroundBootstrap();
  }

  return _supabaseClient;
};

// ============================================================================
// Exports
// ============================================================================

/**
 * Supabase client - uses Proxy for lazy initialization
 */
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/**
 * Get the publishable key (initializes client if needed)
 */
export const getSupabasePublishableKey = (): string => {
  if (!_clientConfig) getSupabaseClient();
  return _publishableKey;
};

/**
 * Publishable key - directly exported string (initialized on first client access)
 * For backwards compatibility with existing code that imports this directly
 */
export const supabasePublishableKey: string = ANON_KEY;

/**
 * Configuration info
 */
export const supabaseConfig = {
  get url() {
    if (!_clientConfig) getSupabaseClient();
    return _clientConfig!.url;
  },
  get usingFallback() {
    if (!_clientConfig) getSupabaseClient();
    return _clientConfig!.source === "fallback";
  },
  get source() {
    if (!_clientConfig) getSupabaseClient();
    return _clientConfig!.source;
  },
};
