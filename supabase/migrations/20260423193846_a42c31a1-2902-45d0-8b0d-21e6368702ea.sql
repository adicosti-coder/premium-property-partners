-- Agency blocklist: phones/domains permanently flagged as agencies.
CREATE TABLE IF NOT EXISTS public.agency_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT,
  domain TEXT,
  reason TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  source_prospect_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agency_blocklist_target_chk CHECK (phone_normalized IS NOT NULL OR domain IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_blocklist_phone_uniq
  ON public.agency_blocklist (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agency_blocklist_domain_uniq
  ON public.agency_blocklist (domain) WHERE domain IS NOT NULL;

ALTER TABLE public.agency_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blocklist"
  ON public.agency_blocklist FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blocklist"
  ON public.agency_blocklist FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blocklist"
  ON public.agency_blocklist FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blocklist"
  ON public.agency_blocklist FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: extract domain from URL
CREATE OR REPLACE FUNCTION public.extract_url_domain(p_url text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(
    regexp_replace(coalesce(p_url, ''), '^https?://', '', 'i'),
    '/.*$', ''
  ))
$$;

-- Trigger: on insert/update of prospect_listings, auto-classify as agency if:
--   (a) phone or domain is in agency_blocklist
--   (b) same phone seen on > 3 prospects in last 14 days
CREATE OR REPLACE FUNCTION public.auto_classify_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_domain text;
BEGIN
  -- Respect explicit owner override (manual)
  IF NEW.prospect_type = 'proprietar' THEN
    RETURN NEW;
  END IF;

  -- (a) blocklist by phone
  IF NEW.phone_normalized IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_blocklist WHERE phone_normalized = NEW.phone_normalized
  ) THEN
    NEW.prospect_type := 'agentie';
    NEW.is_active := false;
    RETURN NEW;
  END IF;

  -- (a') blocklist by domain
  v_domain := public.extract_url_domain(NEW.source_url);
  IF v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_blocklist WHERE domain = v_domain
  ) THEN
    NEW.prospect_type := 'agentie';
    NEW.is_active := false;
    RETURN NEW;
  END IF;

  -- (b) recurrence check: > 3 distinct prospects with same phone in last 14 days
  IF NEW.phone_normalized IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.prospect_listings
    WHERE phone_normalized = NEW.phone_normalized
      AND scraped_at > now() - interval '14 days'
      AND id <> NEW.id;
    IF v_count >= 3 THEN
      NEW.prospect_type := 'agentie';
      -- Auto-add to blocklist for permanent block
      INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
      VALUES (NEW.phone_normalized, 'multi_listing', 'Auto: ' || (v_count + 1) || ' anunțuri în 14 zile', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_auto_classify_agency ON public.prospect_listings;
CREATE TRIGGER prospect_auto_classify_agency
  BEFORE INSERT OR UPDATE OF phone_normalized, source_url ON public.prospect_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_classify_agency();