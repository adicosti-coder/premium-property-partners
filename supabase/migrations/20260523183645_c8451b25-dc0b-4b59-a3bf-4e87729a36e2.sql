
-- 1. Add missing columns on automation_approvals to match UI
ALTER TABLE public.automation_approvals
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- Backfill: mirror approved_at to resolved_at for already-decided rows
UPDATE public.automation_approvals
  SET resolved_at = COALESCE(resolved_at, approved_at)
  WHERE status <> 'pending' AND resolved_at IS NULL;

-- 2. Lock down prospect_alert_settings (admin contact PII)
DROP POLICY IF EXISTS "Admins read prospect alert settings" ON public.prospect_alert_settings;
CREATE POLICY "Admins read prospect alert settings"
  ON public.prospect_alert_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Explicit deny for anonymous on PII tables
DROP POLICY IF EXISTS "Deny anon read prospect_alert_settings" ON public.prospect_alert_settings;
CREATE POLICY "Deny anon read prospect_alert_settings"
  ON public.prospect_alert_settings AS RESTRICTIVE FOR SELECT
  TO anon
  USING (false);

-- 3. discount_code_uses — restrict to admins only (non-admin authenticated blocked)
DROP POLICY IF EXISTS "Block public select on discount_code_uses" ON public.discount_code_uses;
DROP POLICY IF EXISTS "Deny non-admin select discount_code_uses" ON public.discount_code_uses;
CREATE POLICY "Deny non-admin select discount_code_uses"
  ON public.discount_code_uses AS RESTRICTIVE FOR SELECT
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. email_send_log — explicit restrictive deny for non-admin / anon SELECT
DROP POLICY IF EXISTS "Deny non-admin select email_send_log" ON public.email_send_log;
CREATE POLICY "Deny non-admin select email_send_log"
  ON public.email_send_log AS RESTRICTIVE FOR SELECT
  TO anon, authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.role() = 'service_role'
  );

-- 5. system_health_thresholds — admin-only SELECT, deny everyone else
DROP POLICY IF EXISTS "Deny non-admin select system_health_thresholds" ON public.system_health_thresholds;
CREATE POLICY "Deny non-admin select system_health_thresholds"
  ON public.system_health_thresholds AS RESTRICTIVE FOR SELECT
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
