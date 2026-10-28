CREATE OR REPLACE FUNCTION public.developer_agency_signal(p_title text, p_description text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN t ~ 'dezvoltator' THEN 'dezvoltator'
    WHEN t ~ 'comision\s*0\s*%|0\s*%\s*comision|f[aă]r[aă]\s+comision' THEN 'comision 0%'
    WHEN t ~ 'tva\s+(inclus|included)' THEN 'TVA inclus'
    WHEN t ~ 'reprezentan[tțţ][aăe]' THEN 'reprezentanță'
    WHEN t ~ '\mansamblu' THEN 'ansamblu'
    WHEN t ~ 'showroom|birou de vanzari|birou de vânzări' THEN 'birou vânzări/showroom'
  END
  FROM (SELECT lower(coalesce(p_title,'') || ' ' || coalesce(p_description,'')) AS t) x
$$;

CREATE OR REPLACE FUNCTION public.extract_surface_sqm(p_text text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE m text[];
BEGIN
  m := regexp_match(lower(coalesce(p_text,'')), '(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:mp\M|m2|m²|m\s*p\M|metri\s*p[aă]tra[tț]i)');
  IF m IS NULL THEN RETURN NULL; END IF;
  RETURN CASE WHEN replace(m[1],',','.')::numeric BETWEEN 15 AND 400 THEN replace(m[1],',','.')::numeric END;
END $$;

CREATE OR REPLACE FUNCTION public.fill_prospect_surface_price_sqm()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.size,0) <= 0 THEN
    NEW.size := COALESCE(public.extract_surface_sqm(NEW.title), public.extract_surface_sqm(NEW.description), NEW.size);
  END IF;
  IF NEW.price_per_sqm IS NULL AND COALESCE(NEW.size,0) > 0 AND COALESCE(NEW.price,0) >= 5000
     AND COALESCE(upper(NEW.currency),'EUR') IN ('EUR','€') THEN
    NEW.price_per_sqm := round(NEW.price / NEW.size);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fill_prospect_surface_price_sqm ON public.prospect_listings;
CREATE TRIGGER trg_fill_prospect_surface_price_sqm
BEFORE INSERT OR UPDATE OF title, description, size, price, currency ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.fill_prospect_surface_price_sqm();

CREATE OR REPLACE FUNCTION public.classify_seller_type()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text := NULLIF(regexp_replace(COALESCE(NEW.phone_normalized, NEW.contact_phone, ''), '\D', '', 'g'), '');
  v_tail text;
  v_count int := 0;
  v_signal text;
BEGIN
  IF v_phone IS NOT NULL THEN
    v_tail := right(v_phone, 9);
    IF EXISTS (SELECT 1 FROM agency_blocklist b WHERE b.phone_normalized IS NOT NULL AND right(regexp_replace(b.phone_normalized,'\D','','g'),9) = v_tail) THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := 'Număr în lista locală de agenții'; RETURN NEW;
    END IF;
    SELECT count(DISTINCT p.id) INTO v_count FROM prospect_listings p
     WHERE p.id <> NEW.id AND p.duplicate_of IS NULL AND p.id IS DISTINCT FROM NEW.duplicate_of
       AND right(regexp_replace(COALESCE(p.phone_normalized,p.contact_phone,''),'\D','','g'),9) = v_tail
       AND COALESCE(p.dedup_key,'') <> COALESCE(NEW.dedup_key,'#');
    IF v_count >= 2 THEN
      NEW.seller_type := 'agentie'; NEW.seller_type_reason := format('Același număr apare în %s alte anunțuri diferite', v_count); RETURN NEW;
    END IF;
  END IF;
  IF COALESCE(NEW.agency_suspicion_score, 0) >= 50 THEN
    NEW.seller_type := 'agentie'; NEW.seller_type_reason := COALESCE(NEW.agency_suspicion_reason, 'Scor suspiciune agenție ridicat'); RETURN NEW;
  END IF;
  -- Pre-verificare: cuvinte de dezvoltator/agenție → necesită aprobare manuală (Andrei sună doar „privat”).
  v_signal := public.developer_agency_signal(NEW.title, NEW.description);
  IF v_signal IS NOT NULL THEN
    NEW.seller_type := 'de_verificat';
    NEW.seller_type_reason := format('Needs Review: text de dezvoltator/agenție („%s”) — aprobă manual înainte de apel', v_signal);
    RETURN NEW;
  END IF;
  IF v_phone IS NOT NULL AND NEW.agency_classified_at IS NOT NULL AND COALESCE(NEW.agency_suspicion_score, 0) < 25 THEN
    NEW.seller_type := 'privat'; NEW.seller_type_reason := 'Număr unic, fără semne de agenție'; RETURN NEW;
  END IF;
  NEW.seller_type := 'de_verificat'; NEW.seller_type_reason := 'Date insuficiente pentru confirmare';
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_classify_seller_type ON public.prospect_listings;
CREATE TRIGGER trg_classify_seller_type
BEFORE INSERT OR UPDATE OF phone_normalized, contact_phone, agency_suspicion_score, agency_classified_at, duplicate_of, title, description
ON public.prospect_listings FOR EACH ROW EXECUTE FUNCTION public.classify_seller_type();