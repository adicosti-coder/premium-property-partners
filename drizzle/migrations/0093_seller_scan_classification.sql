ALTER TABLE public.prospect_listings ADD COLUMN IF NOT EXISTS seller_type text NOT NULL DEFAULT 'de_verificat';
ALTER TABLE public.prospect_listings ADD COLUMN IF NOT EXISTS seller_type_reason text;
CREATE INDEX IF NOT EXISTS prospect_listings_seller_type_idx ON public.prospect_listings(seller_type);

CREATE OR REPLACE FUNCTION public.classify_seller_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text := NULLIF(regexp_replace(COALESCE(NEW.phone_normalized, NEW.contact_phone, ''), '\D', '', 'g'), '');
  v_tail text;
  v_count int := 0;
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
  IF v_phone IS NOT NULL AND NEW.agency_classified_at IS NOT NULL AND COALESCE(NEW.agency_suspicion_score, 0) < 25 THEN
    NEW.seller_type := 'privat'; NEW.seller_type_reason := 'Număr unic, fără semne de agenție'; RETURN NEW;
  END IF;
  NEW.seller_type := 'de_verificat'; NEW.seller_type_reason := 'Date insuficiente pentru confirmare';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_classify_seller_type ON public.prospect_listings;
CREATE TRIGGER trg_classify_seller_type BEFORE INSERT OR UPDATE OF phone_normalized, contact_phone, agency_suspicion_score, agency_classified_at, duplicate_of
ON public.prospect_listings FOR EACH ROW EXECUTE FUNCTION public.classify_seller_type();