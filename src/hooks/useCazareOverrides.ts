import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { Property } from "@/data/properties";

interface Override { slug: string; seo_title: string | null; seo_description: string | null; image_path: string | null }

const toUrl = (p: string) =>
  p.startsWith("http") || p.startsWith("/") ? p : supabase.storage.from("property-images").getPublicUrl(p).data.publicUrl;

/** Suprascrie titlul/descrierea SEO (Andrei AI) și coperta din Admin peste lista statică de cazare. */
export const useCazareOverrides = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["cazare-overrides"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("slug, seo_title, seo_description, image_path")
        .eq("listing_type", "cazare")
        .eq("is_active", true);
      const map: Record<string, Override> = {};
      (data ?? []).forEach((r) => { if (r.slug) map[r.slug] = r as Override; });
      return map;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("cazare-overrides")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () =>
        qc.invalidateQueries({ queryKey: ["cazare-overrides"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (list: Property[]): Property[] =>
    list.map((p) => {
      const o = data?.[p.slug];
      if (!o) return p;
      const cover = o.image_path ? toUrl(o.image_path) : null;
      return {
        ...p,
        name: o.seo_title?.trim() || p.name,
        description: o.seo_description?.trim() || p.description,
        images: cover ? [cover, ...p.images.filter((i) => i !== cover)] : p.images,
      };
    });
};
