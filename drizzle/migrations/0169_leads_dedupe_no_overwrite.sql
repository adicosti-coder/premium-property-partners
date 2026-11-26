CREATE OR REPLACE FUNCTION public.leads_dedupe_upsert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_phone_raw text := NULLIF(trim(NEW.whatsapp_number), '');
  v_phone text;
  v_email text := lower(NULLIF(trim(NEW.email), ''));
  v_existing_id uuid;
BEGIN
  IF v_phone_raw IN ('-', 'PRECALC_NO_PHONE', '0', 'n/a', 'N/A', 'pending') THEN
    v_phone_raw := NULL;
  END IF;
  v_phone := public.normalize_ro_phone(v_phone_raw);
  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_existing_id FROM public.leads
  WHERE (v_phone IS NOT NULL AND public.normalize_ro_phone(whatsapp_number) = v_phone)
     OR (v_email IS NOT NULL AND lower(email) = v_email)
  ORDER BY created_at DESC LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    NEW.simulation_data := COALESCE(NEW.simulation_data, '{}'::jsonb)
      || jsonb_build_object('possible_duplicate_of', v_existing_id);
  END IF;
  RETURN NEW;
END;
$function$;