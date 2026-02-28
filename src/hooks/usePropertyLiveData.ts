import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PropertyLiveData {
  property_slug: string;
  price_per_night: number | null;
  rating: number | null;
  reviews_count: number | null;
  last_price_update: string | null;
  last_rating_update: string | null;
}

export function usePropertyLiveData() {
  return useQuery({
    queryKey: ["property-live-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_live_data")
        .select("property_slug, price_per_night, rating, reviews_count, last_price_update, last_rating_update");

      if (error) throw error;
      
      // Convert to a map for easy lookup
      const map: Record<string, PropertyLiveData> = {};
      for (const row of (data || [])) {
        map[row.property_slug] = row as PropertyLiveData;
      }
      return map;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}
