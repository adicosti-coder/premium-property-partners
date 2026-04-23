-- Whitelist: phones/domains that must NEVER be auto-classified as agency.
CREATE TABLE IF NOT EXISTS public.agency_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT,
  domain TEXT,
  reason TEXT NOT NULL DEFAULT 'manual_admin',
  notes TEXT,
  source_prospect_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agency_whitelist_target_chk CHECK (phone_normalized IS NOT NULL OR domain IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_whitelist_phone_uniq
  ON public.agency_whitelist (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agency_whitelist_domain_uniq
  ON public.agency_whitelist (domain) WHERE domain IS NOT NULL;

ALTER TABLE public.agency_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whitelist"
  ON public.agency_whitelist FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert whitelist"
  ON public.agency_whitelist FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update whitelist"
  ON public.agency_whitelist FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete whitelist"
  ON public.agency_whitelist FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update auto-classify trigger to honor whitelist before any other rule.
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
  -- Manual owner override always wins.
  IF NEW.prospect_type = 'proprietar' THEN
    RETURN NEW;
  END IF;

  v_domain := public.extract_url_domain(NEW.source_url);

  -- (0) WHITELIST: if phone or domain is whitelisted → force owner & skip everything.
  IF NEW.phone_normalized IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE phone_normalized = NEW.phone_normalized
  ) THEN
    NEW.prospect_type := 'proprietar';
    RETURN NEW;
  END IF;
  IF v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_whitelist WHERE domain = v_domain
  ) THEN
    NEW.prospect_type := 'proprietar';
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
  IF v_domain IS NOT NULL AND v_domain <> '' AND EXISTS (
    SELECT 1 FROM public.agency_blocklist WHERE domain = v_domain
  ) THEN
    NEW.prospect_type := 'agentie';
    NEW.is_active := false;
    RETURN NEW;
  END IF;

  -- (b) recurrence: > 3 distinct prospects with same phone in last 14 days
  IF NEW.phone_normalized IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.prospect_listings
    WHERE phone_normalized = NEW.phone_normalized
      AND scraped_at > now() - interval '14 days'
      AND id <> NEW.id;
    IF v_count >= 3 THEN
      NEW.prospect_type := 'agentie';
      INSERT INTO public.agency_blocklist (phone_normalized, reason, notes, source_prospect_id)
      VALUES (NEW.phone_normalized, 'multi_listing', 'Auto: ' || (v_count + 1) || ' anunțuri în 14 zile', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;