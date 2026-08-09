-- 1. Vision error log ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_vision_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid,
  stage text NOT NULL,
  status_code integer,
  error text,
  fallback_used boolean NOT NULL DEFAULT false,
  images_count integer,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_vision_errors TO authenticated;
GRANT ALL ON public.property_vision_errors TO service_role;
ALTER TABLE public.property_vision_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view vision errors" ON public.property_vision_errors;
CREATE POLICY "Admins can view vision errors"
ON public.property_vision_errors FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages vision errors" ON public.property_vision_errors;
CREATE POLICY "Service role manages vision errors"
ON public.property_vision_errors FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vision_errors_created ON public.property_vision_errors (created_at DESC);

-- 2. Outbound settings -----------------------------------------------------
ALTER TABLE public.property_vision_settings
  ADD COLUMN IF NOT EXISTS auto_outbound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS outbound_threshold integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS outbound_template text NOT NULL DEFAULT 'realtrust_owner_intro';

-- 3. Auto-enqueue high scoring prospects into the WhatsApp outbound queue --
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

  IF COALESCE(NEW.lead_score, 0) < COALESCE(v_threshold, 70) THEN
    RETURN NEW;
  END IF;

  -- only on a real score change (avoid re-firing on unrelated updates)
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.lead_score, -1) = COALESCE(NEW.lead_score, -1)
     AND COALESCE(OLD.quality_analyzed_at, 'epoch'::timestamptz) = COALESCE(NEW.quality_analyzed_at, 'epoch'::timestamptz) THEN
    RETURN NEW;
  END IF;

  -- skip agencies and dead lifecycle states
  IF COALESCE(NEW.agency_suspicion_score, 0) >= 70
     OR NEW.lifecycle_status IN ('rejected', 'posted', 'expired', 'failed') THEN
    RETURN NEW;
  END IF;

  v_phone := public.normalize_ro_phone(COALESCE(NEW.phone_normalized, NEW.contact_phone));
  IF v_phone IS NULL OR v_phone !~ '^\+40[237][0-9]{8}$' THEN
    RETURN NEW;
  END IF;

  -- blocked / unreachable numbers
  IF EXISTS (
    SELECT 1 FROM public.phone_intelligence
    WHERE phone_number = v_phone
      AND (COALESCE(is_blacklisted, false) OR COALESCE(is_unreachable, false))
  ) THEN
    RETURN NEW;
  END IF;

  -- already queued or already contacted on this number
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
    v_phone, NEW.id, COALESCE(v_template, 'realtrust_owner_intro'), 'ro',
    jsonb_build_array(
      COALESCE(NEW.zone, 'Timișoara'),
      CASE WHEN NEW.rooms IS NOT NULL THEN NEW.rooms || ' camere' ELSE 'proprietatea' END
    ),
    'pending',
    CASE WHEN NEW.lead_score >= 85 THEN 10 ELSE 5 END,
    'auto_score'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_wa_outbound ON public.prospect_listings;
CREATE TRIGGER trg_enqueue_wa_outbound
AFTER UPDATE OF lead_score, quality_analyzed_at ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.enqueue_wa_outbound_on_high_score();

-- 4. AI vs manual override audit report -----------------------------------
CREATE OR REPLACE FUNCTION public.get_quality_override_audit(_days integer DEFAULT 90)
RETURNS TABLE (
  total_overrides bigint,
  prospects_touched bigint,
  avg_ai_score numeric,
  avg_manual_score numeric,
  avg_abs_delta numeric,
  avg_signed_delta numeric,
  ai_overrated_pct numeric,
  ai_underrated_pct numeric,
  within_5_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      o.prospect_id,
      o.ai_quality_score::numeric AS ai_score,
      NULLIF(o.override->>'quality_score', '')::numeric AS manual_score
    FROM public.property_quality_overrides o
    WHERE public.has_role(auth.uid(), 'admin')
      AND o.created_at >= now() - make_interval(days => GREATEST(_days, 1))
      AND o.ai_quality_score IS NOT NULL
      AND NULLIF(o.override->>'quality_score', '') IS NOT NULL
  )
  SELECT
    count(*)::bigint,
    count(DISTINCT prospect_id)::bigint,
    round(avg(ai_score), 1),
    round(avg(manual_score), 1),
    round(avg(abs(manual_score - ai_score)), 1),
    round(avg(manual_score - ai_score), 1),
    round(100.0 * count(*) FILTER (WHERE manual_score < ai_score) / GREATEST(count(*), 1), 1),
    round(100.0 * count(*) FILTER (WHERE manual_score > ai_score) / GREATEST(count(*), 1), 1),
    round(100.0 * count(*) FILTER (WHERE abs(manual_score - ai_score) <= 5) / GREATEST(count(*), 1), 1)
  FROM scored;
$$;

GRANT EXECUTE ON FUNCTION public.get_quality_override_audit(integer) TO authenticated;