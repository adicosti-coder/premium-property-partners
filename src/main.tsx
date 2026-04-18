import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import {
  isPreviewServiceWorkerDisabledHost,
  resetPreviewServiceWorkers,
} from "@/utils/serviceWorkerEnvironment";

const mountApp = () => {
  // Defer ALL non-critical scripts to first user interaction (scroll/click/touch)
  // This frees the main thread entirely for the initial render & LCP.
  const loadNonCritical = () => {
    // Sentry
    import("./lib/sentry").then(m => m.initSentry()).catch(() => {});
    // PWA service worker
    import("./hooks/usePWA").then(m => m.registerServiceWorker()).catch(() => {});

    // Clean up all listeners after first trigger
    events.forEach(e => document.removeEventListener(e, loadNonCritical));
  };

  const events = ["scroll", "click", "touchstart", "keydown"] as const;

  // Only load these after real user intent; idle fallback was polluting Lighthouse runs.
  events.forEach(e => document.addEventListener(e, loadNonCritical, { once: true, passive: true }));

  const rootEl = document.getElementById("root");
  if (rootEl) {
    try {
      createRoot(rootEl).render(
        <HelmetProvider>
          <App />
        </HelmetProvider>
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      rootEl.innerHTML = '<div style="padding:2rem;color:red;font:16px monospace;"><h2>React mount error</h2><pre>' + msg + '</pre></div>';
      console.error('[main.tsx] React mount failed:', e);
    }
  }
};

// Build/prerender safety: publishing can execute parts of the bundle in a non-browser environment.
if (typeof document !== "undefined") {
  const bootstrap = async () => {
    if (isPreviewServiceWorkerDisabledHost()) {
      try {
        const reloadKey = "__rt_preview_sw_reset__";
        const didReset = await resetPreviewServiceWorkers();

        if (didReset && typeof sessionStorage !== "undefined" && !sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.replace(window.location.href);
          return;
        }

        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(reloadKey);
        }
      } catch {
        // Ignore preview SW cleanup failures and continue mounting the app
      }
    }

    mountApp();
  };

  void bootstrap();
}
