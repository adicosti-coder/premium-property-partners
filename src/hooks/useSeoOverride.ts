import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface SeoOverride {
  title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  json_ld: Record<string, unknown> | Record<string, unknown>[] | null;
  extra_keywords: Array<{ keyword: string; reason?: string }>;
  ab_enabled?: boolean;
  ab_variant_b?: {
    title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
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
export async function readSeoOverride(pathname?: string): Promise<SeoOverride | null> {
  const path = (pathname || (typeof window !== "undefined" ? window.location.pathname : "/"))
    .replace(/\/{2,}/g, "/")
    .replace(/(.+)\/$/, "$1") || "/";

  const { data, error } = await supabase
    .from("seo_overrides")
    .select("title, meta_description, canonical_url, extra_keywords, json_ld, ab_enabled, ab_variant_b")
    .eq("url_path", path)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  const ab = (data as any).ab_enabled && (data as any).ab_variant_b;
  const variant = ab ? getOrAssignVariant() : "A";
  const variantB = (data as any).ab_variant_b || {};
  const useB = ab && variant === "B";

  if (ab && typeof window !== "undefined") {
    (window as any).gtag?.("event", "seo_ab_view", { url_path: path, variant });
  }

  return {
    title: useB ? (variantB.title ?? data.title) : data.title,
    meta_description: useB ? (variantB.meta_description ?? data.meta_description) : data.meta_description,
    canonical_url: useB ? (variantB.canonical_url ?? (data as any).canonical_url) : (data as any).canonical_url ?? null,
    json_ld: useB ? (variantB.json_ld ?? (data as any).json_ld) : (data as any).json_ld,
    extra_keywords: Array.isArray(useB ? variantB.extra_keywords : data.extra_keywords)
      ? ((useB ? variantB.extra_keywords : data.extra_keywords) as any[])
      : [],
    ab_enabled: !!(data as any).ab_enabled,
    ab_variant_b: (data as any).ab_variant_b || null,
    active_variant: variant,
  };
}

export function useSeoOverride(pathname?: string): SeoOverride | null {
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Defer to idle time: the override only refines head tags, so it must never
    // compete with the first paint (LCP) or block input responsiveness (INP).
    const run = () => {
      readSeoOverride(pathname).then((value) => {
        if (!cancelled) setOverride(value);
      }).catch(() => {
        if (!cancelled) setOverride(null);
      });
    };

    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    let handle: number;
    if (typeof idle === "function") {
      handle = idle(run, { timeout: 3000 });
    } else {
      handle = window.setTimeout(run, 1200);
    }

    return () => {
      cancelled = true;
      const cancelIdle = (window as unknown as {
        cancelIdleCallback?: (h: number) => void;
      }).cancelIdleCallback;
      if (typeof idle === "function" && typeof cancelIdle === "function") cancelIdle(handle);
      else window.clearTimeout(handle);
    };
  }, [pathname]);


  return override;
}
