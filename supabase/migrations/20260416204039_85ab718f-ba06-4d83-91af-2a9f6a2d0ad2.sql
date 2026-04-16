-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.lead_lifecycle_status AS ENUM ('new', 'scoring', 'calling', 'interested', 'rejected', 'posted', 'callback');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.offer_category AS ENUM ('vanzare', 'inchiriere', 'hotelier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to prospect_listings
ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS category public.offer_category,
  ADD COLUMN IF NOT EXISTS lifecycle_status public.lead_lifecycle_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS call_summary text,
  ADD COLUMN IF NOT EXISTS ai_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS ai_scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_call_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS voice_call_session_id uuid;

-- Sync existing score → lead_score
UPDATE public.prospect_listings SET lead_score = score WHERE lead_score IS NULL AND score IS NOT NULL;

-- Backfill category from prospect_type / title / description
UPDATE public.prospect_listings
SET category = CASE
  WHEN lower(coalesce(prospect_type, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, '')) ~ '(regim hotelier|airbnb|booking|cazare|noapte|short.?term)' THEN 'hotelier'::public.offer_category
  WHEN lower(coalesce(prospect_type, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, '')) ~ '(inchiri|chirie|rent|închiri|/lun)' THEN 'inchiriere'::public.offer_category
  ELSE 'vanzare'::public.offer_category
END
WHERE category IS NULL;

-- 3. Phone normalizer (RO E.164)
CREATE OR REPLACE FUNCTION public.normalize_ro_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  cleaned text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  cleaned := regexp_replace(p, '[^0-9+]', '', 'g');
  IF cleaned = '' THEN RETURN NULL; END IF;
  IF left(cleaned, 1) = '+' THEN RETURN cleaned; END IF;
  IF left(cleaned, 2) = '40' THEN RETURN '+' || cleaned; END IF;
  IF left(cleaned, 1) = '0' THEN RETURN '+4' || cleaned; END IF;
  RETURN '+40' || cleaned;
END;
$$;

-- 4. Trigger: auto-fill category, normalize phone, fire AI scorer + auto-call
CREATE OR REPLACE FUNCTION public.handle_prospect_lead_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  desc_blob text;
BEGIN
  -- Normalize phone
  IF NEW.contact_phone IS NOT NULL AND NEW.phone_normalized IS NULL THEN
    NEW.phone_normalized := public.normalize_ro_phone(NEW.contact_phone);
  END IF;

  -- Auto-detect category
  IF NEW.category IS NULL THEN
    desc_blob := lower(coalesce(NEW.prospect_type, '') || ' ' || coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, ''));
    NEW.category := CASE
      WHEN desc_blob ~ '(regim hotelier|airbnb|booking|cazare|noapte|short.?term)' THEN 'hotelier'::public.offer_category
      WHEN desc_blob ~ '(inchiri|chirie|rent|închiri|/lun)' THEN 'inchiriere'::public.offer_category
      ELSE 'vanzare'::public.offer_category
    END;
  END IF;

  -- Mirror score → lead_score for legacy callers
  IF NEW.lead_score IS NULL AND NEW.score IS NOT NULL THEN
    NEW.lead_score := NEW.score;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_lifecycle_before ON public.prospect_listings;
CREATE TRIGGER prospect_lifecycle_before
  BEFORE INSERT OR UPDATE ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_prospect_lead_lifecycle();

-- 5. AFTER trigger: fire AI scorer (real-time) and/or auto-dial
CREATE OR REPLACE FUNCTION public.fire_prospect_scorer_and_dialer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  needs_score boolean;
  ready_to_call boolean;
  service_key text;
BEGIN
  -- Try fetch service key from settings; fall back to NULL (call w/o auth, function reads anon)
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;

  -- (a) Fire scorer if no AI score yet and we have a description
  needs_score := (NEW.ai_scored_at IS NULL)
                 AND (coalesce(NEW.description, '') <> '' OR coalesce(NEW.title, '') <> '');

  IF (TG_OP = 'INSERT') AND needs_score THEN
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/prospect-ai-scorer',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('prospect_id', NEW.id)
    );
  END IF;

  -- (b) Fire auto-dial if score>80, status=new, has phone, not yet called
  ready_to_call := coalesce(NEW.lead_score, 0) > 80
                   AND NEW.lifecycle_status = 'new'
                   AND NEW.phone_normalized IS NOT NULL
                   AND length(NEW.phone_normalized) >= 8
                   AND NEW.auto_call_triggered_at IS NULL;

  IF ready_to_call THEN
    -- Mark as calling immediately to prevent double-fire (UPDATE inside AFTER trigger is OK via row update)
    UPDATE public.prospect_listings
       SET lifecycle_status = 'calling',
           auto_call_triggered_at = now()
     WHERE id = NEW.id AND auto_call_triggered_at IS NULL;

    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-auto-dial',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object('triggered_prospect_id', NEW.id, 'source', 'db_trigger')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_after_insert ON public.prospect_listings;
CREATE TRIGGER prospect_after_insert
  AFTER INSERT ON public.prospect_listings
  FOR EACH ROW EXECUTE FUNCTION public.fire_prospect_scorer_and_dialer();

DROP TRIGGER IF EXISTS prospect_after_update_score ON public.prospect_listings;
CREATE TRIGGER prospect_after_update_score
  AFTER UPDATE OF lead_score, lifecycle_status ON public.prospect_listings
  FOR EACH ROW
  WHEN (
    NEW.lead_score > 80 
    AND NEW.lifecycle_status = 'new'
    AND NEW.auto_call_triggered_at IS NULL
  )
  EXECUTE FUNCTION public.fire_prospect_scorer_and_dialer();

-- 6. Add link to voice_call_sessions
ALTER TABLE public.voice_call_sessions
  ADD COLUMN IF NOT EXISTS prospect_listing_id uuid REFERENCES public.prospect_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_prospect ON public.voice_call_sessions(prospect_listing_id);
CREATE INDEX IF NOT EXISTS idx_prospect_lead_score ON public.prospect_listings(lead_score DESC) WHERE lifecycle_status = 'new';
CREATE INDEX IF NOT EXISTS idx_prospect_lifecycle ON public.prospect_listings(lifecycle_status);

-- 7. Update auto-dial settings to threshold > 80
UPDATE public.voice_agent_settings SET min_lead_score = 81 WHERE id = 1;