-- 1. Columns for pipeline status, retry queue, PDF report and GDPR retention
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS crm_sync_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crm_next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS report_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;

UPDATE public.leads
   SET retention_expires_at = created_at + INTERVAL '24 months'
 WHERE retention_expires_at IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN retention_expires_at SET DEFAULT (now() + INTERVAL '24 months');

UPDATE public.leads SET crm_status = 'nou_necontactat' WHERE crm_status IS NULL;

COMMENT ON COLUMN public.leads.crm_status IS
  'Pipeline status: nou_necontactat | contactat | ofertat | contractat | pierdut';
COMMENT ON COLUMN public.leads.retention_expires_at IS
  'GDPR: after this timestamp the PII on the row is anonymised by anonymize_expired_leads().';

CREATE INDEX IF NOT EXISTS idx_leads_crm_retry
  ON public.leads (crm_next_retry_at)
  WHERE crm_sync_status = 'failed';
CREATE INDEX IF NOT EXISTS idx_leads_retention
  ON public.leads (retention_expires_at)
  WHERE anonymized_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_crm_status ON public.leads (crm_status);

-- 2. Retry sweep: re-invoke crm-lead-sync for temporarily failed rows (exp. backoff)
CREATE OR REPLACE FUNCTION public.retry_failed_crm_syncs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cron_secret TEXT;
  r RECORD;
  n INTEGER := 0;
BEGIN
  SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;

  FOR r IN
    SELECT * FROM public.leads
     WHERE crm_sync_status = 'failed'
       AND COALESCE(crm_sync_attempts, 0) < 5
       AND (crm_next_retry_at IS NULL OR crm_next_retry_at <= now())
       AND anonymized_at IS NULL
     ORDER BY created_at DESC
     LIMIT 20
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/crm-lead-sync',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', COALESCE(cron_secret,'')),
        body := jsonb_build_object('record', row_to_json(r)::jsonb, 'is_retry', true)
      );
      UPDATE public.leads
         SET crm_sync_attempts = COALESCE(crm_sync_attempts, 0) + 1,
             crm_next_retry_at = now() + (POWER(3, COALESCE(crm_sync_attempts, 0) + 1) || ' minutes')::INTERVAL
       WHERE id = r.id;
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'retry_failed_crm_syncs failed for %: %', r.id, SQLERRM;
    END;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retry_failed_crm_syncs() FROM anon, authenticated;

-- 3. GDPR anonymisation + hard delete
CREATE OR REPLACE FUNCTION public.anonymize_expired_leads()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymised INTEGER := 0;
  purged INTEGER := 0;
BEGIN
  WITH upd AS (
    UPDATE public.leads
       SET name = 'Anonimizat',
           whatsapp_number = 'anonimizat',
           email = NULL,
           message = NULL,
           report_pdf_path = NULL,
           simulation_data = COALESCE(simulation_data, '{}'::jsonb)
             - 'name' - 'email' - 'phone' - 'whatsapp' - 'referrer' - 'landing_page'
             - 'gclid' - 'fbclid' - 'attribution',
           score_breakdown = COALESCE(score_breakdown, '{}'::jsonb) - 'inputs',
           activity_history = NULL,
           anonymized_at = now(),
           updated_at = now()
     WHERE anonymized_at IS NULL
       AND retention_expires_at IS NOT NULL
       AND retention_expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO anonymised FROM upd;

  WITH del AS (
    DELETE FROM public.leads
     WHERE created_at < now() - INTERVAL '36 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO purged FROM del;

  RETURN jsonb_build_object('anonymized', anonymised, 'purged', purged, 'ran_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_expired_leads() FROM anon, authenticated;

-- Admin-callable wrapper (manual run from the Admin dashboard)
CREATE OR REPLACE FUNCTION public.admin_run_lead_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  RETURN public.anonymize_expired_leads();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_run_lead_retention() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_run_lead_retention() TO authenticated;

-- 4. Schedules
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('retry-failed-crm-syncs')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-crm-syncs');
    PERFORM cron.schedule(
      'retry-failed-crm-syncs',
      '*/10 * * * *',
      $CRON$ SELECT public.retry_failed_crm_syncs(); $CRON$
    );

    PERFORM cron.unschedule('anonymize-expired-leads')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'anonymize-expired-leads');
    PERFORM cron.schedule(
      'anonymize-expired-leads',
      '30 3 * * *',
      $CRON$ SELECT public.anonymize_expired_leads(); $CRON$
    );
  END IF;
END;
$$;