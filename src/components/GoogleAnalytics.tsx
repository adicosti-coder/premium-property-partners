import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads Google Analytics 4 (gtag.js) asynchronously.
 * Measurement ID is fetched from the backend to keep it out of source code.
 */
const GoogleAnalytics = () => {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-ga4-config");
        if (error || !data?.measurementId || cancelled) return;

        const id = data.measurementId as string;

        // Inject gtag.js script
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

    // Defer analytics loading to not block initial render
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(load);
    } else {
      setTimeout(load, 2000);
    }

    return () => { cancelled = true; };
  }, []);

  return null;
};

export default GoogleAnalytics;
