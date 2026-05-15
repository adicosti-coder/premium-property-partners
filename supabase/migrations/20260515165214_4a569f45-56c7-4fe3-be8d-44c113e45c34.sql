
CREATE TABLE IF NOT EXISTS public.seo_andrei_bridge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.seo_opportunities(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospect_listings(id) ON DELETE SET NULL,
  query text,
  page text,
  matched_keywords text[],
  match_reason text,
  score_before integer,
  score_after integer,
  call_session_id uuid,
  auto_dial_response jsonb,
  status text NOT NULL DEFAULT 'queued',
  triggered_at timestamptz NOT NULL DEFAULT now(),
  triggered_date date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_andrei_bridge_triggered_at ON public.seo_andrei_bridge(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_andrei_bridge_prospect ON public.seo_andrei_bridge(prospect_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seo_andrei_bridge_opp_prospect_day
  ON public.seo_andrei_bridge(opportunity_id, prospect_id, triggered_date);

ALTER TABLE public.seo_andrei_bridge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select bridge" ON public.seo_andrei_bridge
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin all bridge" ON public.seo_andrei_bridge
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
