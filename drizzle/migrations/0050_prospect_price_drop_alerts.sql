CREATE TABLE IF NOT EXISTS public.prospect_price_drop_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  drop_pct numeric,
  source_platform text,
  source_url text,
  recorded_at timestamptz,
  alerted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppda_listing ON public.prospect_price_drop_alerts (listing_id);
CREATE INDEX IF NOT EXISTS idx_ppda_alerted_at ON public.prospect_price_drop_alerts (alerted_at DESC);

GRANT SELECT ON public.prospect_price_drop_alerts TO authenticated;
GRANT ALL ON public.prospect_price_drop_alerts TO service_role;

ALTER TABLE public.prospect_price_drop_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read price drop alerts" ON public.prospect_price_drop_alerts;
CREATE POLICY "Admins can read price drop alerts"
  ON public.prospect_price_drop_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));