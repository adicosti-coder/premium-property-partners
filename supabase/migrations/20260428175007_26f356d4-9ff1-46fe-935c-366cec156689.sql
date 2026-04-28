REVOKE EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_cta_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_shared_poi_link(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_poi_link(text) TO authenticated;