-- Tighten table-level privileges (defense in depth) on three tables

-- 1) blog_ai_snapshots: internal AI editing snapshots — admins only
REVOKE ALL ON public.blog_ai_snapshots FROM anon;
REVOKE ALL ON public.blog_ai_snapshots FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_ai_snapshots TO authenticated;
GRANT ALL ON public.blog_ai_snapshots TO service_role;

-- 2) voice_call_sessions: transcripts/recordings/phones — admins + service role only
REVOKE ALL ON public.voice_call_sessions FROM anon;
REVOKE ALL ON public.voice_call_sessions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_call_sessions TO authenticated;
GRANT ALL ON public.voice_call_sessions TO service_role;

-- 3) public_site_settings: public read-only marketing copy; writes admin/service only
REVOKE ALL ON public.public_site_settings FROM anon;
REVOKE ALL ON public.public_site_settings FROM authenticated;
GRANT SELECT ON public.public_site_settings TO anon;
GRANT SELECT ON public.public_site_settings TO authenticated;
GRANT ALL ON public.public_site_settings TO service_role;

DROP POLICY IF EXISTS "Admins manage public site settings" ON public.public_site_settings;
CREATE POLICY "Admins manage public site settings"
ON public.public_site_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));