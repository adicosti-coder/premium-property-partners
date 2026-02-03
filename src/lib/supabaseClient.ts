/**
 * Supabase Client with Fallback Values
 * 
 * This file provides a robust Supabase client that will work even if
 * environment variables are not properly injected at build time.
 * 
 * IMPORTANT: This is a safety net for production. The primary source
 * of these values should be environment variables.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Hardcoded fallback values derived from the project configuration
// These are PUBLIC keys (anon key) and are safe to include in client code
const FALLBACK_PROJECT_ID = "mvzssjyzbwccioqvhjpo";
const FALLBACK_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

// Use environment variables if available, otherwise fall back to hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_ANON_KEY;

// Log a warning in development if using fallback values
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('[Supabase] Using fallback URL - VITE_SUPABASE_URL not set');
  }
  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    console.warn('[Supabase] Using fallback key - VITE_SUPABASE_PUBLISHABLE_KEY not set');
  }
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
  usingFallback: !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};
