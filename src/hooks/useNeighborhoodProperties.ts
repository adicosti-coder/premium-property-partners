import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapLocationToSlug } from "@/utils/mapLocationToSlug";

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
  neighborhood_slug: string | null;
}

async function fetchProperties(): Promise<NeighborhoodProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, name, slug, location, price_per_sqm, size, bedrooms, floor, image_path, images, listing_type, tag, roi_percentage, estimated_revenue, capital_necesar, booking_rating"
    )
    .eq("is_active", true)
    .in("listing_type", ["vanzare", "investitie"])
    .order("display_order", { ascending: true });

  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    neighborhood_slug: mapLocationToSlug(p.location, p.name),
  }));
}

export function useNeighborhoodProperties(slug?: string) {
  const query = useQuery({
    queryKey: ["neighborhood-properties"],
    queryFn: fetchProperties,
    staleTime: 5 * 60 * 1000,
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
