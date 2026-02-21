import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
// Build/prerender safety: publishing can execute parts of the bundle in a non-browser environment.
if (typeof document !== "undefined") {

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

  // Use 'once' pattern: attach listeners, fire once, then auto-remove
  if ("requestIdleCallback" in window) {
    // Fallback: load after idle if user never interacts within 10s
    const idleId = requestIdleCallback(() => loadNonCritical(), { timeout: 10000 });
    const wrappedLoad = () => { cancelIdleCallback(idleId); loadNonCritical(); };
    events.forEach(e => document.addEventListener(e, wrappedLoad, { once: true, passive: true }));
  } else {
    const timeoutId = setTimeout(loadNonCritical, 10000);
    const wrappedLoad = () => { clearTimeout(timeoutId); loadNonCritical(); };
    events.forEach(e => document.addEventListener(e, wrappedLoad, { once: true, passive: true }));
  }

  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  }
}
