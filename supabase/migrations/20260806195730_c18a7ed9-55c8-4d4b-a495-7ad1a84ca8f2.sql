ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS lead_grade text,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads (lead_score DESC NULLS LAST, created_at DESC);

-- Deterministic lead scoring: zone + rooms/type + income estimate + size + contact quality (0-100)
CREATE OR REPLACE FUNCTION public.score_lead(
  p_zone text,
  p_property_type text,
  p_area integer,
  p_net_profit integer,
  p_phone text,
  p_email text,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  z text := lower(coalesce(p_zone, ''));
  t text := lower(coalesce(p_property_type, ''));
  s_zone int := 8;
  s_rooms int := 10;
  s_income int := 8;
  s_area int := 3;
  s_contact int := 0;
  total int;
  grade text;
BEGIN
  -- Zone (Timișoara only; unknown gets a neutral score, out-of-city gets zero)
  IF z ~ '(cetate|centru|unirii|iosefin)' THEN s_zone := 30;
  ELSIF z ~ '(fabric|complexul studentesc|complexul studențesc|elisabetin)' THEN s_zone := 24;
  ELSIF z ~ '(dumbravita|dumbrăvița|aradului|torontal|circumvalatiunii|circumvalațiunii)' THEN s_zone := 20;
  ELSIF z ~ '(timisoara|timișoara|giroc|ghiroda|mosnita|moșnița)' THEN s_zone := 12;
  ELSIF z = '' THEN s_zone := 8;
  ELSE s_zone := 0;
  END IF;

  -- Rooms / property type (2 rooms converts best in hotel regime)
  IF t ~ '(2 camere|2camere|doua camere|două camere|two)' THEN s_rooms := 25;
  ELSIF t ~ '(garsoniera|garsonieră|1 camera|1 cameră|studio)' THEN s_rooms := 20;
  ELSIF t ~ '(3 camere|3camere|trei camere)' THEN s_rooms := 18;
  ELSIF t ~ '(4|5|penthouse|vila|vilă|casa|casă|duplex)' THEN s_rooms := 12;
  END IF;

  -- Monthly net income estimate (EUR)
  IF p_net_profit IS NULL THEN s_income := 8;
  ELSIF p_net_profit >= 1200 THEN s_income := 25;
  ELSIF p_net_profit >= 800 THEN s_income := 20;
  ELSIF p_net_profit >= 500 THEN s_income := 14;
  ELSIF p_net_profit >= 300 THEN s_income := 8;
  ELSE s_income := 4;
  END IF;

  -- Usable surface
  IF p_area IS NULL THEN s_area := 3;
  ELSIF p_area BETWEEN 40 AND 80 THEN s_area := 10;
  ELSIF p_area BETWEEN 25 AND 39 OR p_area BETWEEN 81 AND 120 THEN s_area := 6;
  ELSE s_area := 3;
  END IF;

  -- Contact quality (reachability drives follow-up speed)
  IF coalesce(p_phone, '') ~ '^\+?4?0?7[0-9]{8}$' OR public.normalize_ro_phone(coalesce(p_phone, '')) IS NOT NULL THEN
    s_contact := s_contact + 7;
  END IF;
  IF coalesce(p_email, '') ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' THEN
    s_contact := s_contact + 3;
  END IF;

  total := least(100, s_zone + s_rooms + s_income + s_area + s_contact);

  grade := CASE
    WHEN total >= 80 THEN 'hot'
    WHEN total >= 60 THEN 'warm'
    WHEN total >= 40 THEN 'cool'
    ELSE 'cold'
  END;

  RETURN jsonb_build_object(
    'score', total,
    'grade', grade,
    'breakdown', jsonb_build_object(
      'zone', s_zone,
      'rooms', s_rooms,
      'income', s_income,
      'area', s_area,
      'contact', s_contact
    ),
    'inputs', jsonb_build_object(
      'zone', p_zone,
      'property_type', p_property_type,
      'area', p_area,
      'net_profit', p_net_profit,
      'source', p_source
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.score_lead(text, text, integer, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.score_lead(text, text, integer, integer, text, text, text) TO authenticated, service_role;

-- Auto-score every incoming lead before it is stored
CREATE OR REPLACE FUNCTION public.leads_auto_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sim jsonb;
  zone_txt text;
  result jsonb;
BEGIN
  BEGIN
    sim := CASE
      WHEN NEW.simulation_data IS NULL THEN '{}'::jsonb
      ELSE NEW.simulation_data::jsonb
    END;
  EXCEPTION WHEN OTHERS THEN sim := '{}'::jsonb;
  END;

  zone_txt := coalesce(
    sim->>'zona', sim->>'zone', sim->>'zona_detectata',
    sim->>'city', sim->>'oras', sim->>'neighborhood'
  );

  result := public.score_lead(
    zone_txt,
    coalesce(NEW.property_type, sim->>'apartment_type', sim->>'camere'),
    NEW.property_area,
    NEW.calculated_net_profit,
    NEW.whatsapp_number,
    NEW.email,
    NEW.source
  );

  NEW.lead_score := (result->>'score')::int;
  NEW.lead_grade := result->>'grade';
  NEW.score_breakdown := result->'breakdown' || jsonb_build_object('inputs', result->'inputs');
  NEW.scored_at := now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'leads_auto_score failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_auto_score ON public.leads;
CREATE TRIGGER trg_leads_auto_score
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_auto_score();

-- Instant dispatch to CRM + Andrei (WhatsApp) after scoring
CREATE OR REPLACE FUNCTION public.leads_dispatch_scored()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE service_key text;
BEGIN
  BEGIN service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN service_key := NULL;
  END;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/lead-score-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(service_key, '')
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'leads_dispatch_scored failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_dispatch_scored ON public.leads;
CREATE TRIGGER trg_leads_dispatch_scored
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_dispatch_scored();