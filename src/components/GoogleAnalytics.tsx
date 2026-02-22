import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads Google Analytics 4 (gtag.js) only after the user's first scroll.
 * This frees the main thread during the critical first 3 seconds.
 * Measurement ID is fetched from the backend to keep it out of source code.
 */
const GoogleAnalytics = () => {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      try {
        const { data, error } = await supabase.functions.invoke("get-ga4-config");
        if (error || !data?.measurementId || cancelled) return;

        const id = data.measurementId as string;

        // Inject gtag.js script with async (non-blocking)
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        script.async = true;
        document.head.appendChild(script);

        // Initialize dataLayer
        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
          (window as any).dataLayer.push(args);
        }
        gtag("js", new Date());
        gtag("config", id, { send_page_view: true });
      } catch {
        // Silently fail – analytics should never break the app
      }
    };

    // Delay-load: wait for first user scroll, then load GA4
    // This ensures the main thread is completely free during initial render
    const onFirstScroll = () => {
      // Small additional delay after scroll to avoid jank
      setTimeout(load, 100);
      cleanup();
    };

    // Fallback: load after 8s if user never scrolls
    const fallbackTimer = setTimeout(() => {
      load();
      cleanup();
    }, 8000);

    const cleanup = () => {
      window.removeEventListener("scroll", onFirstScroll);
      clearTimeout(fallbackTimer);
    };

    window.addEventListener("scroll", onFirstScroll, { once: true, passive: true });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
};

export default GoogleAnalytics;
