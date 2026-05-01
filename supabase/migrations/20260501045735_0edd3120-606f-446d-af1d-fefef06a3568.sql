
DROP POLICY IF EXISTS "Authenticated can read detection settings" ON public.agency_detection_settings;
DROP POLICY IF EXISTS "Admins can read detection settings" ON public.agency_detection_settings;
CREATE POLICY "Admins can read detection settings"
  ON public.agency_detection_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read agency keywords" ON public.agency_keywords;
DROP POLICY IF EXISTS "Admins can read agency keywords" ON public.agency_keywords;
CREATE POLICY "Admins can read agency keywords"
  ON public.agency_keywords FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read keywords" ON public.scraper_search_keywords;
DROP POLICY IF EXISTS "Admins can read scraper search keywords" ON public.scraper_search_keywords;
CREATE POLICY "Admins can read scraper search keywords"
  ON public.scraper_search_keywords FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role inserts audit log" ON public.admin_audit_log;
CREATE POLICY "Service role inserts audit log"
  ON public.admin_audit_log FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_created ON public.admin_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action, created_at DESC);
