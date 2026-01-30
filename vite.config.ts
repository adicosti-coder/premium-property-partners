import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// NOTE:
// The auto-generated Supabase client expects `import.meta.env.VITE_SUPABASE_URL`
// and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` to be defined.
// In some preview/build environments, these may not be injected correctly,
// causing a hard crash: "Error: supabaseUrl is required".
// These values are *publishable* and safe to ship to the client.
const FALLBACK_VITE_SUPABASE_URL = "https://mvzssjyzbwccioqvhjpo.supabase.co";
const FALLBACK_VITE_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    // Prefer env-injected values when present, otherwise fall back to safe publishable defaults.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || FALLBACK_VITE_SUPABASE_URL
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_VITE_SUPABASE_PUBLISHABLE_KEY
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
