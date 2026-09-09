CREATE TABLE public.booking_scrape_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  total_properties INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  rating_updated_count INTEGER NOT NULL DEFAULT 0,
  price_updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.booking_scrape_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.booking_scrape_runs(id) ON DELETE CASCADE,
  property_slug TEXT NOT NULL,
  booking_com_url TEXT,
  rating NUMERIC(3,1),
  reviews_count INTEGER,
  price_per_night INTEGER,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_scrape_runs_started ON public.booking_scrape_runs (started_at DESC);
CREATE INDEX idx_booking_scrape_items_run ON public.booking_scrape_items (run_id);

GRANT SELECT ON public.booking_scrape_runs TO authenticated;
GRANT ALL ON public.booking_scrape_runs TO service_role;
GRANT SELECT ON public.booking_scrape_items TO authenticated;
GRANT ALL ON public.booking_scrape_items TO service_role;

ALTER TABLE public.booking_scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_scrape_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view booking scrape runs"
  ON public.booking_scrape_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view booking scrape items"
  ON public.booking_scrape_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_booking_scrape_runs_updated_at
  BEFORE UPDATE ON public.booking_scrape_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();