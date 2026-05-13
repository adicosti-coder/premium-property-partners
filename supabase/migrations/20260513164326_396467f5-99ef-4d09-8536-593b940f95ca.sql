
-- Create internal cron secret in vault if missing
DO $$
DECLARE v_uuid text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='cron_reconcile_secret') THEN
    v_uuid := gen_random_uuid()::text || '-' || gen_random_uuid()::text;
    PERFORM vault.create_secret(v_uuid, 'cron_reconcile_secret', 'Internal HMAC for pg_cron -> edge function calls');
  END IF;
END$$;

-- Helper to read it (callable by service role)
CREATE OR REPLACE FUNCTION public.get_cron_reconcile_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_reconcile_secret' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_cron_reconcile_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_reconcile_secret() TO service_role;
