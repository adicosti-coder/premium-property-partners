
REVOKE ALL ON FUNCTION public.auto_publish_scheduled_articles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_publish_scheduled_articles() TO service_role, postgres;
