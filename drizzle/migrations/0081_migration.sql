CREATE TABLE public.listing_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_listing_id uuid NOT NULL REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  clean_title text,
  clean_description text,
  neighborhood text,
  property_type text,
  price numeric,
  wa_message_id text,
  sent_at timestamptz,
  decided_at timestamptz,
  decision_note text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_listing_id)
);
CREATE INDEX listing_inspections_wamid_idx ON public.listing_inspections (wa_message_id);
CREATE INDEX listing_inspections_status_idx ON public.listing_inspections (status, sent_at DESC);
ALTER TABLE public.listing_inspections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.listing_inspections TO authenticated;
GRANT ALL ON public.listing_inspections TO service_role;
CREATE POLICY "Admins read inspections" ON public.listing_inspections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update inspections" ON public.listing_inspections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.fire_listing_inspection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE secret text;
BEGIN
  IF lower(coalesce(NEW.category::text, '')) <> 'vanzare' THEN RETURN NEW; END IF;
  IF coalesce(NEW.title, '') = '' AND coalesce(NEW.description, '') = '' THEN RETURN NEW; END IF;
  BEGIN secret := public.get_cron_reconcile_secret(); EXCEPTION WHEN OTHERS THEN secret := NULL; END;
  IF secret IS NULL OR secret = '' THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/listing-inspection-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('prospect_id', NEW.id)
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fire_listing_inspection AFTER INSERT ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.fire_listing_inspection();