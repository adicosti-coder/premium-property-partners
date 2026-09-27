CREATE OR REPLACE FUNCTION public.mark_lead_converted_from_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND NEW.signed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.signed_at IS NULL) THEN
    UPDATE public.leads
       SET crm_status = 'inchiriat', last_touch_at = now()
     WHERE id = NEW.lead_id
       AND COALESCE(crm_status, '') NOT IN ('vandut', 'inchiriat');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_owner_contract_converts_lead ON public.owner_contracts;
CREATE TRIGGER trg_owner_contract_converts_lead
AFTER INSERT OR UPDATE OF signed_at ON public.owner_contracts
FOR EACH ROW EXECUTE FUNCTION public.mark_lead_converted_from_contract();