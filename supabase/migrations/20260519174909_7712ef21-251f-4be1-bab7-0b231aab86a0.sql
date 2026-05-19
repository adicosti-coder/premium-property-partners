DROP POLICY IF EXISTS "cta_insert_public" ON public.cta_analytics;
CREATE POLICY "cta_insert_public" ON public.cta_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);