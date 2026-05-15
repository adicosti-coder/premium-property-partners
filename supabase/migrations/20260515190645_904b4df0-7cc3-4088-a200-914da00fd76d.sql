DROP TRIGGER IF EXISTS audit_seo_settings_change ON public.seo_settings;
CREATE TRIGGER audit_seo_settings_change
AFTER INSERT OR UPDATE OR DELETE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_settings_change();