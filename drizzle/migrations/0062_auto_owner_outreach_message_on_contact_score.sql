CREATE OR REPLACE FUNCTION public.enqueue_wa_outbound_on_high_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_enabled boolean;
  v_threshold integer;
  v_template text;
  v_phone text;
  v_duration integer := 12;
  v_msg text;
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

  IF NOT EXISTS (
    SELECT 1 FROM public.owner_outreach_messages
    WHERE prospect_listing_id = NEW.id
      AND status IN ('draft', 'auto_queued', 'sent')
  ) THEN
    v_msg := 'Bună ziua! Am văzut anunțul dvs. "' || COALESCE(LEFT(NEW.title, 90), 'apartament') || '"'
      || CASE WHEN NEW.price IS NOT NULL
              THEN ' la ' || TRIM(TO_CHAR(NEW.price, 'FM999G999G999')) || ' ' || COALESCE(NEW.currency, 'EUR')
              ELSE '' END
      || '. Vă propun o colaborare de administrare RealTrust pe ' || v_duration
      || ' luni, cu venit lunar estimat si zero batai de cap. Va sun pentru detalii - Adrian Costi, RealTrust Timisoara.';

    INSERT INTO public.owner_outreach_messages (
      prospect_listing_id, offer_price, currency, duration_months, message, channel, status
    ) VALUES (
      NEW.id, NEW.price, COALESCE(NEW.currency, 'EUR'), v_duration, v_msg, 'whatsapp', 'auto_queued'
    );
  END IF;

  RETURN NEW;
END;
$fn$;