/**
 * Backend client (Lovable Cloud) - Hardcoded Config
 *
 * As requested: uses a fixed URL + anon/publishable key instead of reading env.
 * This avoids any custom-domain env injection issues.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Hardcoded public config (NOT secret)
// ============================================================================

const SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

// ============================================================================
// Utilities
// ============================================================================

/**
 * Detect if running on a custom domain (kept for backwards compatibility)
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

// ============================================================================
// Client (module singleton)
// ============================================================================

const storage = getBrowserStorage();

export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(storage ? { storage } : {}),
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================================================
// Compatibility exports
// ============================================================================

export const getSupabasePublishableKey = (): string => SUPABASE_ANON_KEY;

/**
 * For backwards compatibility with existing code that imports this directly.
 */
export const supabasePublishableKey: string = SUPABASE_ANON_KEY;

export const supabaseConfig = {
  url: SUPABASE_URL,
  usingFallback: false,
  source: "hardcoded" as const,
};
