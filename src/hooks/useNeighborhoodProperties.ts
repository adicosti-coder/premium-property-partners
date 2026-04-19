import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mapLocationToSlug } from "@/utils/mapLocationToSlug";

interface PropertyImageRecord {
  image_path: string | null;
  is_primary: boolean | null;
  display_order: number | null;
}

export interface NeighborhoodProperty {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  price_per_sqm: number | null;
  size: number | null;
  bedrooms: number | null;
  floor: string | null;
  image_path: string | null;
  images: string[] | null;
  listing_type: string | null;
  tag: string;
  roi_percentage: string | null;
  estimated_revenue: string | null;
  capital_necesar: number | null;
  booking_rating: number | null;
  property_images?: PropertyImageRecord[] | null;
  neighborhood_slug: string | null;
}

type PropertyRow = Omit<NeighborhoodProperty, "neighborhood_slug">;

const mergePropertyImages = (property: Pick<PropertyRow, "image_path" | "images" | "property_images">) => {
  const propertyImages = [...(property.property_images ?? [])]
    .filter((image): image is PropertyImageRecord & { image_path: string } => Boolean(image.image_path?.trim()))
    .sort(
      (a, b) =>
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
        (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER)
    )
    .map((image) => image.image_path.trim());

  return [...propertyImages, ...(property.images ?? []), property.image_path]
    .filter((image): image is string => Boolean(image && image.trim()))
    .map((image) => image.trim())
    .filter((image, index, array) => array.indexOf(image) === index);
};

async function fetchProperties(): Promise<NeighborhoodProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, name, slug, location, price_per_sqm, size, bedrooms, floor, image_path, images, listing_type, tag, roi_percentage, estimated_revenue, capital_necesar, booking_rating, property_images(image_path, is_primary, display_order)"
    )
    .eq("is_active", true)
    .in("listing_type", ["vanzare", "investitie"])
    .order("display_order", { ascending: true });

  if (error) throw error;

  return ((data || []) as PropertyRow[])
    .map((property) => {
      const mergedImages = mergePropertyImages(property);

      if (mergedImages.length === 0) {
        return null;
      }

      return {
        ...property,
        image_path: mergedImages[0] ?? null,
        images: mergedImages,
        neighborhood_slug: mapLocationToSlug(property.location, property.name),
      } satisfies NeighborhoodProperty;
    })
    .filter((property): property is NeighborhoodProperty => Boolean(property));
}

/**
 * Defers the property fetch (and the chain of Supabase image requests it triggers)
 * until the first real user interaction. This protects the Lighthouse Speed Index
 * from being penalised by 12+ thumbnail downloads triggered by automatic scroll.
 */
function useDeferUntilInteraction(initial: boolean): boolean {
  const [enabled, setEnabled] = useState(initial);

  useEffect(() => {
    if (enabled || typeof document === "undefined") return;
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setEnabled(true);
      events.forEach(e => document.removeEventListener(e, trigger));
    };
    const events = ["scroll", "click", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach(e => document.addEventListener(e, trigger, { once: true, passive: true }));
    return () => { events.forEach(e => document.removeEventListener(e, trigger)); };
  }, [enabled]);

  return enabled;
}

export function useNeighborhoodProperties(slug?: string, options?: { enabled?: boolean }) {
  // Default: defer until interaction. Pages that need data immediately
  // (e.g. /imobiliare-timisoara/:slug detail pages) pass enabled:true explicitly.
  const interactionReady = useDeferUntilInteraction(options?.enabled === true);
  const enabled = options?.enabled ?? interactionReady;

  const query = useQuery({
    queryKey: ["neighborhood-properties"],
    queryFn: fetchProperties,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const filtered = slug
    ? (query.data || []).filter((p) => p.neighborhood_slug === slug)
    : query.data || [];

  // Aggregate counts per neighborhood
  const countsBySlug = (query.data || []).reduce<Record<string, number>>(
    (acc, p) => {
      if (p.neighborhood_slug) {
        acc[p.neighborhood_slug] = (acc[p.neighborhood_slug] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  return {
    properties: filtered,
    countsBySlug,
    isLoading: query.isLoading,
    error: query.error,
  };
}
