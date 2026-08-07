ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS touch_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS engagement_status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS activity_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_leads_phone_norm ON public.leads (public.normalize_ro_phone(whatsapp_number));
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads (lower(email));

DROP TRIGGER IF EXISTS trg_prevent_duplicate_leads ON public.leads;

CREATE OR REPLACE FUNCTION public.leads_dedupe_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'vault'
AS $function$
DECLARE
  v_phone_raw  text := NULLIF(trim(NEW.whatsapp_number), '');
  v_phone      text;
  v_email      text := lower(NULLIF(trim(NEW.email), ''));
  v_existing   public.leads;
  v_entry      jsonb;
  v_secret     text;
  v_zone       text;
BEGIN
  IF v_phone_raw IN ('-', 'PRECALC_NO_PHONE', '0', 'n/a', 'N/A', 'pending') THEN
    v_phone_raw := NULL;
  END IF;
  v_phone := public.normalize_ro_phone(v_phone_raw);

  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_existing
  FROM public.leads
  WHERE (v_phone IS NOT NULL AND public.normalize_ro_phone(whatsapp_number) = v_phone)
     OR (v_email IS NOT NULL AND lower(email) = v_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    RETURN NEW; -- genuinely new lead
  END IF;

  v_entry := jsonb_build_object(
    'at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'source', COALESCE(NEW.source, 'unknown'),
    'campaign', COALESCE(NEW.simulation_data->>'campaign', NEW.simulation_data->>'utm_campaign'),
    'property_type', NEW.property_type,
    'property_area', NEW.property_area,
    'score', NEW.lead_score,
    'grade', NEW.lead_grade,
    'message', NULLIF(NEW.message, '')
  );

  UPDATE public.leads SET
    name                    = COALESCE(NULLIF(trim(NEW.name), ''), name),
    email                   = COALESCE(v_email, email),
    whatsapp_number         = COALESCE(v_phone_raw, whatsapp_number),
    property_type           = COALESCE(NEW.property_type, property_type),
    property_area           = COALESCE(NEW.property_area, property_area),
    calculated_net_profit   = GREATEST(COALESCE(NEW.calculated_net_profit, 0), COALESCE(calculated_net_profit, 0)),
    calculated_yearly_profit= GREATEST(COALESCE(NEW.calculated_yearly_profit, 0), COALESCE(calculated_yearly_profit, 0)),
    lead_score              = GREATEST(COALESCE(NEW.lead_score, 0), COALESCE(lead_score, 0)),
    lead_grade              = CASE WHEN COALESCE(NEW.lead_score, 0) >= COALESCE(lead_score, 0)
                                   THEN COALESCE(NEW.lead_grade, lead_grade) ELSE lead_grade END,
    score_breakdown         = CASE WHEN COALESCE(NEW.lead_score, 0) >= COALESCE(lead_score, 0)
                                   THEN COALESCE(NEW.score_breakdown, score_breakdown) ELSE score_breakdown END,
    scored_at               = now(),
    simulation_data         = COALESCE(simulation_data, '{}'::jsonb) || COALESCE(NEW.simulation_data, '{}'::jsonb),
    message                 = COALESCE(NULLIF(NEW.message, ''), message),
    source                  = COALESCE(NEW.source, source),
    touch_count             = touch_count + 1,
    engagement_status       = 're_engaged',
    is_read                 = false,
    activity_history        = COALESCE(activity_history, '[]'::jsonb) || jsonb_build_array(v_entry),
    last_touch_at           = now(),
    updated_at              = now()
  WHERE id = v_existing.id
  RETURNING * INTO v_existing;

  v_zone := COALESCE(v_existing.simulation_data->>'zona', v_existing.simulation_data->>'zone');

  BEGIN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;

    PERFORM net.http_post(
      url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-score-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(v_secret, '')
      ),
      body := jsonb_build_object(
        'event', 'lead.re_engaged',
        'record', row_to_json(v_existing)::jsonb
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'leads_dedupe_upsert dispatch failed: %', SQLERRM;
  END;

  RETURN NULL; -- skip the duplicate insert
END;
$function$;

CREATE TRIGGER trg_leads_dedupe_upsert
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_dedupe_upsert();

CREATE OR REPLACE FUNCTION public.leads_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_touch_updated_at();