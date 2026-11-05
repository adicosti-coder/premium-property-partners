DROP TRIGGER IF EXISTS trg_leads_dedupe_upsert ON public.leads;
CREATE TRIGGER trg_leads_dedupe_upsert BEFORE INSERT ON public.leads FOR EACH ROW
  WHEN (COALESCE(NEW.source, '') NOT LIKE 'calculator_unificat%')
  EXECUTE FUNCTION public.leads_dedupe_upsert();

-- Calculatorul unificat: fiecare calcul nou e o cerere separată; repetările sunt marcate.
CREATE OR REPLACE FUNCTION public.leads_mark_calculator_repeat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_phone text := public.normalize_ro_phone(NULLIF(trim(NEW.whatsapp_number), ''));
        v_prev uuid;
BEGIN
  IF v_phone IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_prev FROM public.leads
   WHERE public.normalize_ro_phone(whatsapp_number) = v_phone
   ORDER BY created_at DESC LIMIT 1;
  IF v_prev IS NOT NULL THEN
    NEW.engagement_status := 're_engaged';
    NEW.simulation_data := COALESCE(NEW.simulation_data, '{}'::jsonb)
      || jsonb_build_object('repeat_submission', true, 'previous_lead_id', v_prev,
                            'submission_label', 'Calcul nou / Actualizat');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.leads_mark_calculator_repeat() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_leads_mark_calculator_repeat BEFORE INSERT ON public.leads FOR EACH ROW
  WHEN (COALESCE(NEW.source, '') LIKE 'calculator_unificat%')
  EXECUTE FUNCTION public.leads_mark_calculator_repeat();