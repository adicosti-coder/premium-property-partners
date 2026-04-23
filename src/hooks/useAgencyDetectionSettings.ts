import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface AgencyDetectionSettings {
  suspicion_threshold: number;
  multi_listing_threshold: number;
  multi_listing_window_days: number;
  enabled: boolean;
}

export interface AgencyKeyword {
  id: string;
  keyword: string;
  type: "hard" | "soft" | "owner";
  enabled: boolean;
  notes: string | null;
}

const DEFAULTS: AgencyDetectionSettings = {
  suspicion_threshold: 70,
  multi_listing_threshold: 3,
  multi_listing_window_days: 14,
  enabled: true,
};

export function useAgencyDetectionSettings() {
  return useQuery({
    queryKey: ["agency-detection-settings"],
    queryFn: async (): Promise<AgencyDetectionSettings> => {
      const { data, error } = await supabase
        .from("agency_detection_settings" as any)
        .select("suspicion_threshold,multi_listing_threshold,multi_listing_window_days,enabled")
        .eq("id", true)
        .maybeSingle();
      if (error || !data) return DEFAULTS;
      return data as any;
    },
    staleTime: 60_000,
  });
}

export function useAgencyKeywords() {
  return useQuery({
    queryKey: ["agency-keywords"],
    queryFn: async (): Promise<AgencyKeyword[]> => {
      const { data, error } = await supabase
        .from("agency_keywords" as any)
        .select("id,keyword,type,enabled,notes")
        .order("type", { ascending: true })
        .order("keyword", { ascending: true });
      if (error) return [];
      return (data as any) || [];
    },
    staleTime: 60_000,
  });
}

export { DEFAULTS as AGENCY_DETECTION_DEFAULTS };
