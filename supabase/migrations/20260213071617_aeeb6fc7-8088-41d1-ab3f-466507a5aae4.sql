-- Attach audit logging trigger to leads table for admin access tracking
CREATE TRIGGER audit_leads_admin_access
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_leads_access();