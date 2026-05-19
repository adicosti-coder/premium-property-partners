DROP POLICY IF EXISTS "cta_insert_public" ON public.cta_analytics;
CREATE POLICY "cta_insert_public" ON public.cta_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.check_cta_rate_limit(session_id));
DELETE FROM public.cta_analytics WHERE page_path = '/test';