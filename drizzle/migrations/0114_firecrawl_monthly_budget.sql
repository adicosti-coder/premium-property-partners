CREATE TABLE IF NOT EXISTS public.firecrawl_usage (
  month text PRIMARY KEY,
  credits_used integer NOT NULL DEFAULT 0,
  credit_limit integer NOT NULL DEFAULT 1500,
  exhausted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.firecrawl_usage TO authenticated;
GRANT ALL ON public.firecrawl_usage TO service_role;
ALTER TABLE public.firecrawl_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read firecrawl usage" ON public.firecrawl_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.firecrawl_reserve_credits(_credits integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text := to_char(now() AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM'); ok boolean;
BEGIN
  INSERT INTO public.firecrawl_usage(month) VALUES (m) ON CONFLICT (month) DO NOTHING;
  UPDATE public.firecrawl_usage SET credits_used = credits_used + _credits, updated_at = now()
   WHERE month = m AND exhausted_at IS NULL AND credits_used + _credits <= credit_limit
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.firecrawl_adjust_credits(_delta integer, _exhausted boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text := to_char(now() AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM');
BEGIN
  INSERT INTO public.firecrawl_usage(month) VALUES (m) ON CONFLICT (month) DO NOTHING;
  UPDATE public.firecrawl_usage SET credits_used = GREATEST(0, credits_used + _delta),
    exhausted_at = CASE WHEN _exhausted THEN now() ELSE exhausted_at END, updated_at = now()
   WHERE month = m;
END $$;
REVOKE ALL ON FUNCTION public.firecrawl_reserve_credits(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.firecrawl_adjust_credits(integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.firecrawl_reserve_credits(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.firecrawl_adjust_credits(integer, boolean) TO service_role;