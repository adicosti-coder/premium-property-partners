
ALTER TABLE public.scraper_search_keywords
  ADD COLUMN IF NOT EXISTS query_template text,
  ADD COLUMN IF NOT EXISTS unique_leads_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_test_at timestamptz;

CREATE OR REPLACE FUNCTION public.increment_keyword_unique_leads(_id uuid, _delta integer DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.scraper_search_keywords
     SET unique_leads_count = GREATEST(0, COALESCE(unique_leads_count,0) + COALESCE(_delta,1)),
         updated_at = now()
   WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_keyword_unique_leads(uuid, integer) TO authenticated, service_role;
