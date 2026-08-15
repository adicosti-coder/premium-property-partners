ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS crm_status text NOT NULL DEFAULT 'nou_necontactat',
  ADD COLUMN IF NOT EXISTS crm_sync_status text,
  ADD COLUMN IF NOT EXISTS crm_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS crm_sync_error text;

CREATE INDEX IF NOT EXISTS idx_leads_crm_sync_status ON public.leads (crm_sync_status);

CREATE OR REPLACE FUNCTION public.crm_lead_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cron_secret text;
BEGIN
  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1;

  PERFORM net.http_post(
    url := 'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/crm-lead-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', coalesce(cron_secret,'')),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'crm_lead_sync failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crm_lead_sync() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_crm_lead_sync ON public.leads;
CREATE TRIGGER trg_crm_lead_sync
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_lead_sync();

-- lead-reports bucket: service role only (edge function uploads + signed URLs).
DROP POLICY IF EXISTS "lead_reports_admin_read" ON storage.objects;
CREATE POLICY "lead_reports_admin_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lead-reports' AND public.has_role(auth.uid(), 'admin'));