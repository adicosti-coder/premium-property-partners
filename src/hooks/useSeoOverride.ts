import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SeoOverride {
  title: string | null;
  meta_description: string | null;
  extra_keywords: Array<{ keyword: string; reason?: string }>;
}

/**
 * Reads SEO override (auto-applied from SEO AI Optimizer) for a given URL path.
 * Falls back to nothing if no active override exists.
 */
export function useSeoOverride(pathname?: string): SeoOverride | null {
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = (pathname || (typeof window !== "undefined" ? window.location.pathname : "/"))
      .replace(/\/{2,}/g, "/")
      .replace(/\/$/, "") || "/";

    (async () => {
      try {
        const { data, error } = await supabase
          .from("seo_overrides")
          .select("title, meta_description, extra_keywords")
          .eq("url_path", path)
          .eq("is_active", true)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setOverride({
            title: data.title,
            meta_description: data.meta_description,
            extra_keywords: Array.isArray(data.extra_keywords)
              ? (data.extra_keywords as any[])
              : [],
          });
        } else if (!cancelled) {
          setOverride(null);
        }
      } catch {
        if (!cancelled) setOverride(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return override;
}
