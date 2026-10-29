CREATE OR REPLACE FUNCTION public.leads_auto_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sim jsonb; zone_txt text; result jsonb; bonus int; phone_bonus int := 0; sc int;
BEGIN
  BEGIN
    sim := CASE WHEN NEW.simulation_data IS NULL THEN '{}'::jsonb ELSE NEW.simulation_data::jsonb END;
  EXCEPTION WHEN OTHERS THEN sim := '{}'::jsonb;
  END;
  zone_txt := coalesce(sim->>'zona', sim->>'zone', sim->>'zona_detectata', sim->>'city', sim->>'oras', sim->>'neighborhood');
  result := public.score_lead(zone_txt, coalesce(NEW.property_type, sim->>'apartment_type', sim->>'camere'),
    NEW.property_area, NEW.calculated_net_profit, NEW.whatsapp_number, NEW.email, NEW.source);
  sc := (result->>'score')::int;
  bonus := CASE WHEN NEW.source = 'whatsapp_reply' THEN least(20, greatest(0, coalesce((sim->>'wa_engagement_bonus')::int, 0))) ELSE 0 END;
  -- Widget de contact: +30 când telefonul de mobil e validat server-side (minim Warm)
  IF coalesce(NEW.source, '') LIKE 'lead_engagement_widget%'
     AND public.normalize_ro_phone(coalesce(NEW.whatsapp_number, '')) IS NOT NULL THEN
    phone_bonus := 30;
  END IF;
  IF bonus > 0 OR phone_bonus > 0 THEN
    sc := least(100, sc + bonus + phone_bonus);
    IF phone_bonus > 0 THEN sc := greatest(sc, 60); END IF;
    NEW.lead_grade := CASE WHEN sc >= 80 THEN 'hot' WHEN sc >= 60 THEN 'warm' WHEN sc >= 40 THEN 'cool' ELSE 'cold' END;
  ELSE
    NEW.lead_grade := result->>'grade';
  END IF;
  NEW.lead_score := sc;
  NEW.score_breakdown := result->'breakdown' || jsonb_build_object('inputs', result->'inputs', 'wa_engagement_bonus', bonus, 'verified_phone_bonus', phone_bonus);
  NEW.scored_at := now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'leads_auto_score failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;