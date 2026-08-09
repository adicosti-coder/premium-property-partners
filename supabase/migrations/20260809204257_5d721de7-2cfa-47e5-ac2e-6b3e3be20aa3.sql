REVOKE EXECUTE ON FUNCTION public.cleanup_capi_delivery_log() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_capi_delivery_log() TO service_role;