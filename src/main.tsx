import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./hooks/usePWA";
import { initSentry } from "./lib/sentry";

// Initialize Sentry error tracking (only in browser environments)
if (typeof window !== "undefined") {
  // Fire-and-forget; initSentry internally guards and loads lazily.
  void initSentry();
}

// Build/prerender safety: publishing can execute parts of the bundle in a non-browser environment.
if (typeof document !== "undefined") {
  // Register PWA service worker
  registerServiceWorker();

  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  }
}
