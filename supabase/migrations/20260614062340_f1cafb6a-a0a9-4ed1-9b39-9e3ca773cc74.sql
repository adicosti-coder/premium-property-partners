DROP TRIGGER IF EXISTS trg_enforce_agency_blocklist_upd ON public.prospect_listings;

CREATE TRIGGER trg_enforce_agency_blocklist_upd
BEFORE UPDATE OF is_active, phone_normalized, contact_phone, source_url, title, description, admin_notes
ON public.prospect_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_blocklist_on_prospect();

REVOKE EXECUTE ON FUNCTION public.extract_ro_phone_from_text(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._canonical_listing_url(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extract_ro_phone_from_text(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._canonical_listing_url(text) TO authenticated, service_role;