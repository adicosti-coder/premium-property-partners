ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS uncontacted_reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.leads_auto_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sim jsonb; zone_txt text; result jsonb; bonus int; sc int;
BEGIN
  BEGIN
    sim := CASE WHEN NEW.simulation_data IS NULL THEN '{}'::jsonb ELSE NEW.simulation_data::jsonb END;
  EXCEPTION WHEN OTHERS THEN sim := '{}'::jsonb;
  END;
  zone_txt := coalesce(sim->>'zona', sim->>'zone', sim->>'zona_detectata', sim->>'city', sim->>'oras', sim->>'neighborhood');
  result := public.score_lead(zone_txt, coalesce(NEW.property_type, sim->>'apartment_type', sim->>'camere'),
    NEW.property_area, NEW.calculated_net_profit, NEW.whatsapp_number, NEW.email, NEW.source);
  sc := (result->>'score')::int;
  -- Bonus pentru răspuns activ pe WhatsApp cu detalii (zonă/camere): +15..+20
  bonus := CASE WHEN NEW.source = 'whatsapp_reply' THEN least(20, greatest(0, coalesce((sim->>'wa_engagement_bonus')::int, 0))) ELSE 0 END;
  IF bonus > 0 THEN
    sc := least(100, sc + bonus);
    NEW.lead_grade := CASE WHEN sc >= 80 THEN 'hot' WHEN sc >= 60 THEN 'warm' ELSE 'cold' END;
  ELSE
    NEW.lead_grade := result->>'grade';
  END IF;
  NEW.lead_score := sc;
  NEW.score_breakdown := result->'breakdown' || jsonb_build_object('inputs', result->'inputs', 'wa_engagement_bonus', bonus);
  NEW.scored_at := now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'leads_auto_score failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

INSERT INTO public.automation_jobs (job_key, label, category, schedule, trigger_type, enabled, description, config)
VALUES ('lead.uncontacted_reminder', 'Lead WhatsApp · Reminder necontactat 10 min', 'lead', '*/5 * * * *', 'cron', true,
  'Trimite un reminder secundar (e-mail + notificare Admin) pentru lead-urile WhatsApp rămase „Nou / Necontactat” peste 10 minute. O singură dată per lead.',
  '{"timeout_ms":40000}'::jsonb)
ON CONFLICT (job_key) DO NOTHING;