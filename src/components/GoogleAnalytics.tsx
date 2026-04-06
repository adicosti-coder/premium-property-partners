import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Loads Google Analytics 4 (gtag.js) eagerly on page load.
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

        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        script.async = true;
        document.head.appendChild(script);

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

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default GoogleAnalytics;
