import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // IMPORTANT: Această linie permite browserului să găsească scripturile corect pe server
  base: './', 
  
  server: {
    host: "::",
    port: 8080,
  },
  
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  
  define: {
    // Valorile Supabase injectate din mediu sau fallback-uri sigure
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || "https://mvzssjyzbwccisqvujps.supabase.co"
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    ),
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // CONFIGURAȚIA PENTRU DEPLOYMENT FTP
  build: {
    outDir: 'dist',         // Folderul pe care robotul tău îl caută
    emptyOutDir: true,      // Curăță folderul vechi înainte de un build nou
    sourcemap: false,       // Dezactivat pentru a reduce dimensiunea fișierelor pe server
    assetsDir: 'assets',    // Pune CSS și JS în folderul assets
  }
}));
