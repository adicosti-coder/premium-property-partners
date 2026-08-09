REVOKE ALL ON FUNCTION public.get_quality_override_audit(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quality_override_audit(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_quality_override_audit(integer) TO authenticated;