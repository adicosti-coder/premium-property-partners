-- Lead deduplication: prevent duplicate inserts within 24h for the same source
-- matching on email OR whatsapp_number. Sentinel values are ignored.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_leads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone  text := NULLIF(trim(NEW.whatsapp_number), '');
  v_email  text := lower(NULLIF(trim(NEW.email), ''));
  v_source text := COALESCE(NEW.source, 'unknown');
  v_exists boolean;
BEGIN
  -- Ignore sentinels used by partial / non-phone flows
  IF v_phone IN ('-', 'PRECALC_NO_PHONE', '0', 'n/a', 'N/A') THEN
    v_phone := NULL;
  END IF;

  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW; -- nothing to dedup on
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.leads
    WHERE source = v_source
      AND created_at > now() - interval '24 hours'
      AND (
        (v_phone IS NOT NULL AND whatsapp_number = NEW.whatsapp_number)
        OR (v_email IS NOT NULL AND lower(email) = v_email)
      )
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'duplicate_lead'
      USING ERRCODE = 'unique_violation',
            HINT   = 'A similar lead was already submitted in the last 24 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_leads ON public.leads;
CREATE TRIGGER trg_prevent_duplicate_leads
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_leads();

-- Helpful index for the dedup lookup
CREATE INDEX IF NOT EXISTS idx_leads_source_created_at
  ON public.leads (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower
  ON public.leads (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_number
  ON public.leads (whatsapp_number) WHERE whatsapp_number IS NOT NULL AND whatsapp_number NOT IN ('-', 'PRECALC_NO_PHONE');