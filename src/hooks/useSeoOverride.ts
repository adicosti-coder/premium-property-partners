import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface SeoOverride {
  title: string | null;
  meta_description: string | null;
  json_ld: Record<string, unknown> | Record<string, unknown>[] | null;
  extra_keywords: Array<{ keyword: string; reason?: string }>;
  ab_enabled?: boolean;
  ab_variant_b?: {
    title?: string | null;
    meta_description?: string | null;
    json_ld?: Record<string, unknown> | Record<string, unknown>[] | null;
    extra_keywords?: Array<{ keyword: string; reason?: string }>;
  } | null;
  active_variant?: "A" | "B";
}

const VARIANT_COOKIE = "rt_seo_var";

const getOrAssignVariant = (): "A" | "B" => {
  if (typeof document === "undefined") return "A";
  const m = document.cookie.match(new RegExp(`${VARIANT_COOKIE}=([AB])`));
  if (m) return m[1] as "A" | "B";
  const v: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
  // 30 days
  document.cookie = `${VARIANT_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  return v;
};

/**
 * Reads SEO override (auto-applied from SEO AI Optimizer) for a given URL path.
 * Honors A/B variant assignment via cookie when ab_enabled.
 */
export function useSeoOverride(pathname?: string): SeoOverride | null {
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = (pathname || (typeof window !== "undefined" ? window.location.pathname : "/"))
      .replace(/\/{2,}/g, "/")
      .replace(/(.+)\/$/, "$1") || "/";

    (async () => {
      try {
        const { data, error } = await supabase
          .from("seo_overrides")
          .select("title, meta_description, extra_keywords, json_ld, ab_enabled, ab_variant_b")
          .eq("url_path", path)
          .eq("is_active", true)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setOverride(null);
          return;
        }
        const ab = (data as any).ab_enabled && (data as any).ab_variant_b;
        const variant = ab ? getOrAssignVariant() : "A";
        const variantB = (data as any).ab_variant_b || {};
        const useB = ab && variant === "B";

        // GA4 dimension for split testing analytics
        if (ab && typeof window !== "undefined") {
          (window as any).gtag?.("event", "seo_ab_view", {
            url_path: path,
            variant,
          });
        }

        setOverride({
          title: useB ? (variantB.title ?? data.title) : data.title,
          meta_description: useB ? (variantB.meta_description ?? data.meta_description) : data.meta_description,
          json_ld: useB ? (variantB.json_ld ?? (data as any).json_ld) : (data as any).json_ld,
          extra_keywords: Array.isArray(useB ? variantB.extra_keywords : data.extra_keywords)
            ? ((useB ? variantB.extra_keywords : data.extra_keywords) as any[])
            : [],
          ab_enabled: !!(data as any).ab_enabled,
          ab_variant_b: (data as any).ab_variant_b || null,
          active_variant: variant,
        });
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
