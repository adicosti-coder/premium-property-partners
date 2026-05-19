DROP POLICY IF EXISTS "Anyone can insert CTA analytics with rate limit" ON public.cta_analytics;
CREATE POLICY "cta_insert_public" ON public.cta_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.check_cta_rate_limit(session_id));