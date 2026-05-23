
REVOKE ALL ON FUNCTION public.listing_import_record_review(text, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_import_record_review(text, text, int) TO service_role;
