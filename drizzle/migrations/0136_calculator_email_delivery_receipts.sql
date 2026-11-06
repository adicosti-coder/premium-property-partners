ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_status_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_email_message ON public.leads(email_message_id) WHERE email_message_id IS NOT NULL;

UPDATE public.leads SET email_status='pending' WHERE email_status='accepted' AND source LIKE 'calculator_unificat%';

CREATE TABLE public.calculator_email_receipts (
  message_id text PRIMARY KEY,
  status text NOT NULL,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.calculator_email_receipts TO service_role;
ALTER TABLE public.calculator_email_receipts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.calculator_email_webhook_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  secret_ciphertext bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.calculator_email_webhook_config TO service_role;
ALTER TABLE public.calculator_email_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.store_calculator_email_webhook_secret(p_secret text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_secret IS NULL OR p_secret NOT LIKE 'whsec\_%' OR length(p_secret)>1000 THEN
    RAISE EXCEPTION 'Invalid webhook secret';
  END IF;
  INSERT INTO public.calculator_email_webhook_config(singleton,secret_ciphertext)
  VALUES(true,extensions.pgp_sym_encrypt(p_secret,public.get_cron_reconcile_secret()))
  ON CONFLICT(singleton) DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.store_calculator_email_webhook_secret(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_calculator_email_webhook_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_calculator_email_webhook_secret()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT extensions.pgp_sym_decrypt(secret_ciphertext,public.get_cron_reconcile_secret()) FROM public.calculator_email_webhook_config WHERE singleton=true;
$$;
REVOKE ALL ON FUNCTION public.get_calculator_email_webhook_secret() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_calculator_email_webhook_secret() TO service_role;

CREATE OR REPLACE FUNCTION public.record_calculator_email_receipt(p_message_id text,p_status text,p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s text; e text;
BEGIN
  IF p_status NOT IN ('pending','delivered','failed') OR length(p_message_id)>300 THEN RETURN; END IF;
  INSERT INTO public.calculator_email_receipts(message_id,status,error) VALUES(p_message_id,p_status,left(p_error,500))
  ON CONFLICT(message_id) DO UPDATE SET
    status=CASE
      WHEN calculator_email_receipts.status='delivered' OR EXCLUDED.status='delivered' THEN 'delivered'
      WHEN calculator_email_receipts.status='failed' OR EXCLUDED.status='failed' THEN 'failed'
      ELSE 'pending' END,
    error=CASE
      WHEN EXCLUDED.status='failed' THEN EXCLUDED.error
      WHEN EXCLUDED.status='delivered' THEN NULL
      WHEN calculator_email_receipts.status='failed' THEN calculator_email_receipts.error
      ELSE EXCLUDED.error END,
    received_at=now();
  SELECT status,error INTO s,e FROM public.calculator_email_receipts WHERE message_id=p_message_id;
  UPDATE public.leads SET email_status=s,email_error=e WHERE email_message_id=p_message_id AND source LIKE 'calculator_unificat%';
END $$;
REVOKE ALL ON FUNCTION public.record_calculator_email_receipt(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_calculator_email_receipt(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_calculator_notification(p_lead_id uuid,p_channel text,p_attempt integer,p_status text,p_error text DEFAULT NULL,p_message_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE
  s text:=p_status;
  e text:=left(p_error,500);
  receipt public.calculator_wa_receipts;
  email_receipt public.calculator_email_receipts;
BEGIN
  IF p_channel NOT IN ('email','wa_admin','wa_client') OR p_status NOT IN ('accepted','failed','unknown') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  IF p_channel='email' THEN
    IF p_message_id IS NOT NULL THEN
      SELECT * INTO email_receipt FROM public.calculator_email_receipts WHERE message_id=p_message_id;
      IF FOUND THEN s:=email_receipt.status; e:=email_receipt.error; END IF;
    END IF;
    IF s='accepted' THEN s:='pending'; e:=NULL; END IF;
  ELSIF p_message_id IS NOT NULL THEN
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

SELECT cron.schedule(
  'calculator-email-reconcile-hourly',
  '17 * * * *',
  $$select net.http_post(url:='https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/calculator-email-reconcile',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',public.get_cron_reconcile_secret()),body:='{}'::jsonb,timeout_milliseconds:=60000)$$
);