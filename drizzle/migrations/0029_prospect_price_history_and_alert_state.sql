-- Istoric prețuri pentru anunțurile găsite (comparație în timp, pe platformă)
CREATE TABLE IF NOT EXISTS public.prospect_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  source_platform text NOT NULL,
  source_url text,
  zone text,
  rooms integer,
  surface numeric,
  price numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pph_recorded_at ON public.prospect_price_history (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pph_listing ON public.prospect_price_history (listing_id);
CREATE INDEX IF NOT EXISTS idx_pph_platform ON public.prospect_price_history (source_platform);

GRANT SELECT ON public.prospect_price_history TO authenticated;
GRANT ALL ON public.prospect_price_history TO service_role;

ALTER TABLE public.prospect_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read prospect price history" ON public.prospect_price_history;
CREATE POLICY "Admins can read prospect price history"
  ON public.prospect_price_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert prospect price history" ON public.prospect_price_history;
CREATE POLICY "Admins can insert prospect price history"
  ON public.prospect_price_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_prospect_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR COALESCE(OLD.price, -1) IS DISTINCT FROM COALESCE(NEW.price, -1) THEN
    INSERT INTO public.prospect_price_history (listing_id, source_platform, source_url, zone, rooms, surface, price)
    VALUES (NEW.id, NEW.source_platform, NEW.source_url, NEW.zone, NEW.rooms, NEW.surface, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_price_history ON public.prospect_listings;
CREATE TRIGGER trg_prospect_price_history
AFTER INSERT OR UPDATE OF price ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.record_prospect_price_history();

-- Stare pentru alertele „anunțuri noi găsite"
CREATE TABLE IF NOT EXISTS public.prospect_new_listing_alert_state (
  id boolean PRIMARY KEY DEFAULT true,
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  last_count integer NOT NULL DEFAULT 0,
  CONSTRAINT prospect_new_listing_alert_state_singleton CHECK (id)
);

GRANT SELECT ON public.prospect_new_listing_alert_state TO authenticated;
GRANT ALL ON public.prospect_new_listing_alert_state TO service_role;

ALTER TABLE public.prospect_new_listing_alert_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read alert state" ON public.prospect_new_listing_alert_state;
CREATE POLICY "Admins can read alert state"
  ON public.prospect_new_listing_alert_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.prospect_new_listing_alert_state (id, last_alerted_at)
VALUES (true, now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;