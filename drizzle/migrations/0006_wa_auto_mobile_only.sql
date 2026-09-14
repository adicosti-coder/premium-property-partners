-- WhatsApp funcționează doar pe numere mobile (+407...). Numerele fixe (+402/+403) nu
-- primesc mesaje, deci nu mai intră în coadă.
CREATE OR REPLACE FUNCTION public.enqueue_wa_outbound_on_high_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
  v_threshold integer;
  v_template text;
  v_phone text;
BEGIN
  SELECT auto_outbound_enabled, outbound_threshold, outbound_template
    INTO v_enabled, v_threshold, v_template
  FROM public.property_vision_settings WHERE id = 1;

  IF COALESCE(v_enabled, false) = false THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.lead_score, -1) = COALESCE(NEW.lead_score, -1)
       AND COALESCE(OLD.quality_analyzed_at, 'epoch'::timestamptz) = COALESCE(NEW.quality_analyzed_at, 'epoch'::timestamptz)
       AND COALESCE(OLD.do_not_call, false) = COALESCE(NEW.do_not_call, false) THEN
      RETURN NEW;
    END IF;
    IF COALESCE(NEW.lead_score, 0) < COALESCE(v_threshold, 70) THEN
      RETURN NEW;
    END IF;
  END IF;

  IF COALESCE(NEW.agency_suspicion_score, 0) >= 70
     OR NEW.lifecycle_status IN ('posted', 'expired', 'failed') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.do_not_call, false) AND NOT public.wa_is_technical_block_only(NEW.do_not_call_reason) THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status = 'rejected'
     AND NOT (COALESCE(NEW.do_not_call, false) AND public.wa_is_technical_block_only(NEW.do_not_call_reason)) THEN
    RETURN NEW;
  END IF;

  v_phone := public.normalize_ro_phone(COALESCE(NEW.phone_normalized, NEW.contact_phone));
  IF v_phone IS NULL OR v_phone !~ '^\+407[0-9]{8}$' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.phone_intelligence
    WHERE phone_number = v_phone
      AND (COALESCE(is_blacklisted, false) OR COALESCE(is_unreachable, false))
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wa_outbound_queue
    WHERE phone_normalized = v_phone
      AND status IN ('pending', 'sending', 'sent')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wa_outbound_queue (
    phone_normalized, prospect_listing_id, template_name, template_language,
    template_params, status, priority, source
  ) VALUES (
    v_phone, NEW.id, COALESCE(v_template, 'intake_prospect_apartments'), 'ro',
    '[]'::jsonb,
    'pending',
    CASE WHEN TG_OP = 'INSERT' THEN 7 WHEN COALESCE(NEW.lead_score, 0) >= 85 THEN 10 ELSE 5 END,
    CASE WHEN TG_OP = 'INSERT' THEN 'auto_import' ELSE 'auto_score' END
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_wa_outbound_backfill(_limit integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
  v_template text;
  v_count integer := 0;
BEGIN
  SELECT auto_outbound_enabled, outbound_template
    INTO v_enabled, v_template
  FROM public.property_vision_settings WHERE id = 1;

  IF COALESCE(v_enabled, false) = false THEN
    RETURN 0;
  END IF;

  WITH candidates AS (
    SELECT p.id,
           public.normalize_ro_phone(COALESCE(p.phone_normalized, p.contact_phone)) AS phone
    FROM public.prospect_listings p
    WHERE COALESCE(p.is_active, true)
      AND COALESCE(p.agency_suspicion_score, 0) < 70
      AND p.lifecycle_status NOT IN ('posted', 'expired', 'failed')
      AND (
        NOT COALESCE(p.do_not_call, false)
        OR public.wa_is_technical_block_only(p.do_not_call_reason)
      )
      AND (
        p.lifecycle_status <> 'rejected'
        OR (COALESCE(p.do_not_call, false) AND public.wa_is_technical_block_only(p.do_not_call_reason))
      )
    ORDER BY p.created_at DESC
    LIMIT GREATEST(1, LEAST(200, COALESCE(_limit, 25))) * 8
  ), valid AS (
    SELECT DISTINCT ON (phone) id, phone
    FROM candidates
    WHERE phone IS NOT NULL AND phone ~ '^\+407[0-9]{8}$'
      AND NOT EXISTS (
        SELECT 1 FROM public.phone_intelligence pi
        WHERE pi.phone_number = candidates.phone
          AND (COALESCE(pi.is_blacklisted, false) OR COALESCE(pi.is_unreachable, false))
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.wa_outbound_queue q
        WHERE q.phone_normalized = candidates.phone
      )
    ORDER BY phone, id
    LIMIT GREATEST(1, LEAST(200, COALESCE(_limit, 25)))
  )
  INSERT INTO public.wa_outbound_queue (
    phone_normalized, prospect_listing_id, template_name, template_language,
    template_params, status, priority, source
  )
  SELECT phone, id, COALESCE(v_template, 'intake_prospect_apartments'), 'ro',
         '[]'::jsonb, 'pending', 6, 'auto_import'
  FROM valid
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;