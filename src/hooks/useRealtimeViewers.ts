import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

/**
 * Returns a map of property_id → viewer count (last 15 min).
 * Used for "X persoane vizualizează acum" social proof badges.
 */
export function useRealtimeViewers() {
  return useQuery({
    queryKey: ["realtime-viewers"],
    queryFn: async () => {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("property_views")
        .select("property_id, session_id")
        .gte("viewed_at", fifteenMinAgo);

      if (error) throw error;

      // Count unique sessions per property
      const map: Record<string, number> = {};
      const seen: Record<string, Set<string>> = {};
      
      for (const row of data || []) {
        const pid = row.property_id;
        if (!seen[pid]) seen[pid] = new Set();
        seen[pid].add(row.session_id);
        map[pid] = seen[pid].size;
      }
      
      return map;
    },
    staleTime: 1000 * 60 * 2, // refresh every 2 min
    refetchInterval: 1000 * 60 * 2,
  });
}
