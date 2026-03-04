import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface PropertyLiveData {
  property_slug: string;
  price_per_night: number | null;
  rating: number | null;
  reviews_count: number | null;
  last_price_update: string | null;
  last_rating_update: string | null;
  // Admin-managed overrides from properties table
  capacity: number | null;
  bedrooms: number | null;
  description_ro: string | null;
  description_en: string | null;
}

export function usePropertyLiveData() {
  return useQuery({
    queryKey: ["property-live-data"],
    queryFn: async () => {
      // Fetch live scraped data
      const { data: liveData, error: liveError } = await supabase
        .from("property_live_data")
        .select("property_slug, price_per_night, rating, reviews_count, last_price_update, last_rating_update");

      if (liveError) throw liveError;

      // Fetch admin-managed property data (capacity, bedrooms, etc.)
      const { data: adminData, error: adminError } = await supabase
        .from("properties")
        .select("slug, capacity, bedrooms, description_ro, description_en")
        .eq("listing_type", "cazare");

      if (adminError) throw adminError;

      // Build admin lookup by slug
      const adminMap: Record<string, { capacity: number | null; bedrooms: number | null; description_ro: string | null; description_en: string | null }> = {};
      for (const row of (adminData || [])) {
        if (row.slug) {
          adminMap[row.slug] = {
            capacity: row.capacity,
            bedrooms: row.bedrooms,
            description_ro: row.description_ro,
            description_en: row.description_en,
          };
        }
      }

      // Merge into a single map
      const map: Record<string, PropertyLiveData> = {};
      for (const row of (liveData || [])) {
        const admin = adminMap[row.property_slug];
        map[row.property_slug] = {
          ...(row as any),
          capacity: admin?.capacity ?? null,
          bedrooms: admin?.bedrooms ?? null,
          description_ro: admin?.description_ro ?? null,
          description_en: admin?.description_en ?? null,
        };
      }
      return map;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}
