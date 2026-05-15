
ALTER TABLE public.seo_andrei_bridge
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_bridge_id uuid REFERENCES public.seo_andrei_bridge(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS uniq_seo_andrei_bridge_opp_prospect_day;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seo_andrei_bridge_opp_prospect_day
  ON public.seo_andrei_bridge(opportunity_id, prospect_id, triggered_date)
  WHERE parent_bridge_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_seo_andrei_bridge_parent ON public.seo_andrei_bridge(parent_bridge_id);
