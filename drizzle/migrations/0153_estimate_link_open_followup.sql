ALTER TABLE public.prospect_listings
  ADD COLUMN IF NOT EXISTS estimate_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimate_last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimate_open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimate_followup_status text,
  ADD COLUMN IF NOT EXISTS estimate_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimate_followup_note text,
  ADD COLUMN IF NOT EXISTS estimate_followup_queue_id uuid;

COMMENT ON COLUMN public.prospect_listings.estimate_opened_at IS 'Prima deschidere reală (fără boți de previzualizare) a linkului scurt /e/<short_code>.';
COMMENT ON COLUMN public.prospect_listings.estimate_followup_status IS 'Follow-up unic după deschiderea linkului: scheduled | sent | cancelled_replied | cancelled | skipped:<motiv>.';

CREATE INDEX IF NOT EXISTS idx_prospect_estimate_opened ON public.prospect_listings (estimate_opened_at DESC) WHERE estimate_opened_at IS NOT NULL;

-- Orice mesaj primit de la proprietar (inclusiv „DA” sau butoane) anulează imediat follow-up-ul programat.
CREATE OR REPLACE FUNCTION public.estimate_followup_cancel_on_inbound()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text;
  v_digits text;
  v_variants text[];
BEGIN
  SELECT phone_normalized INTO v_phone FROM public.wa_conversations WHERE id = NEW.conversation_id;
  v_digits := regexp_replace(coalesce(v_phone, ''), '\D', '', 'g');
  IF length(v_digits) < 9 THEN RETURN NEW; END IF;
  IF v_digits LIKE '40%' THEN
    v_variants := ARRAY['+' || v_digits, v_digits, '0' || substr(v_digits, 3)];
  ELSE
    v_variants := ARRAY['+' || v_digits, v_digits];
  END IF;

  UPDATE public.prospect_listings
     SET estimate_followup_status = 'cancelled_replied',
         estimate_followup_at = now(),
         estimate_followup_note = NULL
   WHERE phone_normalized = ANY (v_variants)
     AND estimate_followup_status = 'scheduled';

  UPDATE public.wa_outbound_queue
     SET status = 'cancelled',
         last_error = 'anulat: proprietarul a răspuns înainte de follow-up'
   WHERE source = 'estimate_followup'
     AND status IN ('pending', 'failed')
     AND phone_normalized = ANY (v_variants);
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.estimate_followup_cancel_on_inbound() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_estimate_followup_cancel_on_inbound ON public.wa_messages;
CREATE TRIGGER trg_estimate_followup_cancel_on_inbound
AFTER INSERT ON public.wa_messages
FOR EACH ROW WHEN (NEW.direction = 'inbound')
EXECUTE FUNCTION public.estimate_followup_cancel_on_inbound();

-- Starea din coadă se reflectă pe anunț: trimis / anulat de verificările worker-ului.
CREATE OR REPLACE FUNCTION public.estimate_followup_sync_from_queue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.prospect_listing_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'sent' AND coalesce(NEW.last_error, '') NOT ILIKE 'duplicat%' THEN
    UPDATE public.prospect_listings
       SET estimate_followup_status = 'sent', estimate_followup_at = coalesce(NEW.sent_at, now()), estimate_followup_note = NULL
     WHERE id = NEW.prospect_listing_id AND estimate_followup_status = 'scheduled';
  ELSIF NEW.status IN ('cancelled', 'sent') THEN
    UPDATE public.prospect_listings
       SET estimate_followup_status = 'cancelled', estimate_followup_at = now(),
           estimate_followup_note = left(regexp_replace(coalesce(NEW.last_error, ''), '^(blocat|anulat|duplicat):\s*', '', 'i'), 120)
     WHERE id = NEW.prospect_listing_id AND estimate_followup_status = 'scheduled';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.estimate_followup_sync_from_queue() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_estimate_followup_sync_from_queue ON public.wa_outbound_queue;
CREATE TRIGGER trg_estimate_followup_sync_from_queue
AFTER UPDATE OF status ON public.wa_outbound_queue
FOR EACH ROW WHEN (NEW.source = 'estimate_followup')
EXECUTE FUNCTION public.estimate_followup_sync_from_queue();