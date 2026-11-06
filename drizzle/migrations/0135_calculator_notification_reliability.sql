ALTER TABLE public.leads
 ADD COLUMN IF NOT EXISTS submission_id uuid,
 ADD COLUMN IF NOT EXISTS submission_digest text,
 ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS email_error text,
 ADD COLUMN IF NOT EXISTS email_message_id text,
 ADD COLUMN IF NOT EXISTS email_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS wa_admin_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS wa_admin_error text,
 ADD COLUMN IF NOT EXISTS wa_admin_message_id text,
 ADD COLUMN IF NOT EXISTS wa_admin_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS wa_client_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS wa_client_error text,
 ADD COLUMN IF NOT EXISTS wa_client_message_id text,
 ADD COLUMN IF NOT EXISTS wa_client_attempts integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS leads_submission_id_unique ON public.leads(submission_id) WHERE submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_wa_admin_message ON public.leads(wa_admin_message_id) WHERE wa_admin_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_wa_client_message ON public.leads(wa_client_message_id) WHERE wa_client_message_id IS NOT NULL;
UPDATE public.leads SET email_status = CASE WHEN email_notification_sent THEN 'accepted' ELSE 'unknown' END,
 wa_admin_status='unknown',wa_client_status='unknown'
 WHERE submission_id IS NULL;

CREATE TABLE public.calculator_wa_receipts (
 message_id text PRIMARY KEY,
 status text NOT NULL,
 error text,
 received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.calculator_wa_receipts TO service_role;
ALTER TABLE public.calculator_wa_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_calculator_notification(p_lead_id uuid, p_channel text, p_retry boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE l public.leads; s text; a integer;
BEGIN
 IF p_channel NOT IN ('email','wa_admin','wa_client') THEN RAISE EXCEPTION 'Invalid channel'; END IF;
 SELECT * INTO l FROM public.leads WHERE id=p_lead_id AND source LIKE 'calculator_unificat%' FOR UPDATE;
 IF NOT FOUND THEN RETURN 0; END IF;
 s:=CASE p_channel WHEN 'email' THEN l.email_status WHEN 'wa_admin' THEN l.wa_admin_status ELSE l.wa_client_status END;
 IF s <> 'pending' AND NOT (p_retry AND s='failed') THEN RETURN 0; END IF;
 -- Never replay legacy reservations whose external outcome is unknown.
 IF p_channel <> 'email' AND EXISTS (SELECT 1 FROM public.request_idempotency WHERE scope='calc-lead-wa' AND key=p_lead_id::text || CASE p_channel WHEN 'wa_admin' THEN ':admin' ELSE ':visitor' END) THEN RETURN 0; END IF;
 IF p_channel='email' THEN
  UPDATE public.leads SET email_status='sending',email_error=NULL,email_attempts=email_attempts+1 WHERE id=p_lead_id RETURNING email_attempts INTO a;
 ELSIF p_channel='wa_admin' THEN
  UPDATE public.leads SET wa_admin_status='sending',wa_admin_error=NULL,wa_admin_attempts=wa_admin_attempts+1 WHERE id=p_lead_id RETURNING wa_admin_attempts INTO a;
 ELSE
  UPDATE public.leads SET wa_client_status='sending',wa_client_error=NULL,wa_client_attempts=wa_client_attempts+1 WHERE id=p_lead_id RETURNING wa_client_attempts INTO a;
 END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.claim_calculator_notification(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_calculator_notification(uuid,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.record_calculator_wa_receipt(p_message_id text,p_status text,p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE s text;
BEGIN
 IF p_status NOT IN ('sent','delivered','read','failed') OR length(p_message_id)>300 THEN RETURN; END IF;
 s:=CASE WHEN p_status='sent' THEN 'accepted' ELSE p_status END;
 INSERT INTO public.calculator_wa_receipts(message_id,status,error) VALUES(p_message_id,s,left(p_error,500))
 ON CONFLICT(message_id) DO UPDATE SET
 status=CASE WHEN calculator_wa_receipts.status='read' THEN 'read' WHEN calculator_wa_receipts.status='delivered' AND EXCLUDED.status<>'read' THEN 'delivered' WHEN calculator_wa_receipts.status='failed' AND EXCLUDED.status='accepted' THEN 'failed' ELSE EXCLUDED.status END,
 error=CASE WHEN EXCLUDED.status='failed' THEN EXCLUDED.error ELSE calculator_wa_receipts.error END,
 received_at=now();
 SELECT status INTO s FROM public.calculator_wa_receipts WHERE message_id=p_message_id;
 UPDATE public.leads SET wa_admin_status=s,wa_admin_error=CASE WHEN s='failed' THEN left(p_error,500) ELSE NULL END WHERE wa_admin_message_id=p_message_id;
 UPDATE public.leads SET wa_client_status=s,wa_client_error=CASE WHEN s='failed' THEN left(p_error,500) ELSE NULL END WHERE wa_client_message_id=p_message_id;
END $$;
REVOKE ALL ON FUNCTION public.record_calculator_wa_receipt(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_calculator_wa_receipt(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_calculator_notification(p_lead_id uuid,p_channel text,p_attempt integer,p_status text,p_error text DEFAULT NULL,p_message_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE s text:=p_status; e text:=left(p_error,500); receipt public.calculator_wa_receipts;
BEGIN
 IF p_channel NOT IN ('email','wa_admin','wa_client') OR p_status NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 IF p_channel<>'email' AND p_message_id IS NOT NULL THEN
  SELECT * INTO receipt FROM public.calculator_wa_receipts WHERE message_id=p_message_id;
  IF FOUND THEN s:=receipt.status; e:=receipt.error; END IF;
 END IF;
 IF p_channel='email' THEN
  UPDATE public.leads SET email_status=s,email_error=e,email_message_id=p_message_id WHERE id=p_lead_id AND email_attempts=p_attempt AND email_status='sending';
 ELSIF p_channel='wa_admin' THEN
  UPDATE public.leads SET wa_admin_status=s,wa_admin_error=e,wa_admin_message_id=p_message_id WHERE id=p_lead_id AND wa_admin_attempts=p_attempt AND wa_admin_status='sending';
 ELSE
  UPDATE public.leads SET wa_client_status=s,wa_client_error=e,wa_client_message_id=p_message_id WHERE id=p_lead_id AND wa_client_attempts=p_attempt AND wa_client_status='sending';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_calculator_notification(uuid,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_calculator_notification(uuid,text,integer,text,text,text) TO service_role;