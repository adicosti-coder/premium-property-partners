export interface PropertyQualityAnalysis {
  quality_score?: number;
  condition?: string;
  finishes?: string;
  furnishing?: string;
  hotel_readiness?: number;
  renovation_needed?: boolean;
  estimated_refresh_cost_eur?: number | null;
  highlights?: string[];
  red_flags?: string[];
  reasoning?: string;
  images_analyzed?: number;
  model?: string;
  from_cache?: boolean;
  analyzed_by?: string | null;
}

/** Admin correction layer — always stored separately from the AI result. */
export interface PropertyQualityOverride {
  quality_score?: number | null;
  finishes?: string | null;
  condition?: string | null;
  hotel_readiness?: number | null;
  note?: string | null;
}

export interface PropertyQualityOverrideRow {
  id: string;
  prospect_id: string;
  admin_id: string | null;
  ai_quality_score: number | null;
  previous_override: PropertyQualityOverride | null;
  override: PropertyQualityOverride;
  note: string | null;
  created_at: string;
}

export interface PropertyVisionSettings {
  vision_enabled: boolean;
  auto_threshold: number;
  cache_enabled: boolean;
  cache_ttl_days: number;
  max_images: number;
}

export const VISION_SETTINGS_DEFAULTS: PropertyVisionSettings = {
  vision_enabled: true,
  auto_threshold: 70,
  cache_enabled: true,
  cache_ttl_days: 90,
  max_images: 5,
};

export const CONDITION_OPTIONS = [
  { value: "nou", label: "Nou" },
  { value: "renovat_recent", label: "Renovat recent" },
  { value: "bun", label: "Stare bună" },
  { value: "invechit", label: "Învechit" },
  { value: "necesita_renovare", label: "Necesită renovare" },
];

export const FINISH_OPTIONS = [
  { value: "premium", label: "Premium" },
  { value: "standard", label: "Standard" },
  { value: "economic", label: "Economic" },
  { value: "neterminat", label: "Neterminat" },
];
