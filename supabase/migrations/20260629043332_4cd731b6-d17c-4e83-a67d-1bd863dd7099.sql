REVOKE EXECUTE ON FUNCTION public.seo_acquire_audit_lock(text, text, int, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seo_release_audit_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_acquire_audit_lock(text, text, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.seo_release_audit_lock(text, text) TO service_role;