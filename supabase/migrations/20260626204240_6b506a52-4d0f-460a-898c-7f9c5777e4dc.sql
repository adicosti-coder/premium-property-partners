
CREATE OR REPLACE FUNCTION public.reactivate_scraper_keyword(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  UPDATE public.scraper_search_keywords
     SET is_active = true,
         consecutive_zero = 0,
         fail_count = 0,
         auto_disabled_reason = NULL,
         updated_at = now()
   WHERE id = _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reactivate_scraper_keyword(uuid) TO authenticated;
