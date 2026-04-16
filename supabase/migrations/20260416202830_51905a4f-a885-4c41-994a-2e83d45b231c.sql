-- 1. Enums for status & category
DO $$ BEGIN
  CREATE TYPE public.scraper_lead_status AS ENUM ('new', 'calling', 'interested', 'rejected', 'posted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scraper_lead_category AS ENUM ('sale', 'rent', 'hotel_management');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add missing columns (keep existing ones intact)
ALTER TABLE public.scraper_leads
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS category public.scraper_lead_category,
  ADD COLUMN IF NOT EXISTS call_summary text,
  ADD COLUMN IF NOT EXISTS lifecycle_status public.scraper_lead_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS auto_call_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;

-- Backfill category from listing_type when possible
UPDATE public.scraper_leads
SET category = CASE
  WHEN lower(coalesce(listing_type, prospect_category, '')) ~ '(cazare|hotel|regim|noapte)' THEN 'hotel_management'::public.scraper_lead_category
  WHEN lower(coalesce(listing_type, prospect_category, '')) ~ '(inchiri|rent|chirie)' THEN 'rent'::public.scraper_lead_category
  ELSE 'sale'::public.scraper_lead_category
END
WHERE category IS NULL;

-- 3. Trigger: when lead_score > 80 AND lifecycle_status = 'new' → fire auto-dial edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_call_high_score_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  should_fire boolean := false;
BEGIN
  -- Fire on INSERT or UPDATE when conditions met & not yet triggered
  IF NEW.lead_score > 80
     AND NEW.lifecycle_status = 'new'
     AND NEW.phone IS NOT NULL
     AND length(NEW.phone) >= 8
     AND NEW.auto_call_triggered_at IS NULL
  THEN
    should_fire := true;
  END IF;

  IF should_fire THEN
    -- Mark as calling immediately to prevent double-fire
    NEW.lifecycle_status := 'calling';
    NEW.auto_call_triggered_at := now();

    -- Fire async http call to auto-dial edge function
    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/voice-agent-auto-dial',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('triggered_lead_id', NEW.id, 'source', 'db_trigger')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_call_high_score_lead_insert ON public.scraper_leads;
CREATE TRIGGER auto_call_high_score_lead_insert
  BEFORE INSERT ON public.scraper_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_call_high_score_lead();

DROP TRIGGER IF EXISTS auto_call_high_score_lead_update ON public.scraper_leads;
CREATE TRIGGER auto_call_high_score_lead_update
  BEFORE UPDATE OF lead_score, lifecycle_status ON public.scraper_leads
  FOR EACH ROW
  WHEN (
    (NEW.lead_score > 80 AND NEW.lifecycle_status = 'new' AND NEW.auto_call_triggered_at IS NULL)
  )
  EXECUTE FUNCTION public.trigger_auto_call_high_score_lead();

-- 4. Lower default min_lead_score in voice_agent_settings to 81 to match >80 rule
UPDATE public.voice_agent_settings SET min_lead_score = 81 WHERE id = 1 AND min_lead_score > 81;