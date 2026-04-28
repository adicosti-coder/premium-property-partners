-- Protect property owner/seller contact data outside the public properties table
CREATE TABLE IF NOT EXISTS public.property_contact_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_contact_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view property contacts" ON public.property_contact_details;
DROP POLICY IF EXISTS "Admins can insert property contacts" ON public.property_contact_details;
DROP POLICY IF EXISTS "Admins can update property contacts" ON public.property_contact_details;
DROP POLICY IF EXISTS "Admins can delete property contacts" ON public.property_contact_details;

CREATE POLICY "Admins can view property contacts"
ON public.property_contact_details
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert property contacts"
ON public.property_contact_details
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update property contacts"
ON public.property_contact_details
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete property contacts"
ON public.property_contact_details
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.property_contact_details (property_id, contact_name, contact_phone, contact_email)
SELECT id, contact_name, contact_phone, contact_email
FROM public.properties
WHERE contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_email IS NOT NULL
ON CONFLICT (property_id) DO UPDATE SET
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  contact_email = EXCLUDED.contact_email,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.sync_property_contact_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_name IS NOT NULL OR NEW.contact_phone IS NOT NULL OR NEW.contact_email IS NOT NULL THEN
    INSERT INTO public.property_contact_details (property_id, contact_name, contact_phone, contact_email)
    VALUES (NEW.id, NEW.contact_name, NEW.contact_phone, NEW.contact_email)
    ON CONFLICT (property_id) DO UPDATE SET
      contact_name = EXCLUDED.contact_name,
      contact_phone = EXCLUDED.contact_phone,
      contact_email = EXCLUDED.contact_email,
      updated_at = now();

    NEW.contact_name := NULL;
    NEW.contact_phone := NULL;
    NEW.contact_email := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_property_contact_details_before_save ON public.properties;
CREATE TRIGGER sync_property_contact_details_before_save
BEFORE INSERT OR UPDATE OF contact_name, contact_phone, contact_email ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.sync_property_contact_details();

UPDATE public.properties
SET contact_name = NULL,
    contact_phone = NULL,
    contact_email = NULL
WHERE contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_email IS NOT NULL;

-- Remove public direct access to guest access credentials
DROP POLICY IF EXISTS "Anyone can read guest guide by booking_id" ON public.guest_guides;

-- Remove unrestricted public access to visitor browsing memory
DROP POLICY IF EXISTS "Anyone can read visitor memory by session" ON public.visitor_memory;
DROP POLICY IF EXISTS "Anyone can update own visitor memory" ON public.visitor_memory;
DROP POLICY IF EXISTS "Anyone can insert visitor memory" ON public.visitor_memory;
DROP POLICY IF EXISTS "Admins can delete visitor memory" ON public.visitor_memory;

CREATE POLICY "Authenticated users can view their own visitor memory"
ON public.visitor_memory
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can create their own visitor memory"
ON public.visitor_memory
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can update their own visitor memory"
ON public.visitor_memory
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete visitor memory"
ON public.visitor_memory
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Fix mutable search_path warnings for public functions that lacked one
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.extract_url_domain(text) SET search_path = public;

-- Reduce external EXECUTE exposure for SECURITY DEFINER helper/trigger functions
REVOKE ALL ON FUNCTION public.anonymize_email_click_ip() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anonymize_email_open_ip() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_classify_agency() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_listing_roi() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_tracking_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_welcome_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fill_prospect_search_keywords() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fire_prospect_scorer_and_dialer() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_prospect_lead_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_article_view_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_discount_code_uses() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_leads_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_leads_select() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_scraper_lead_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_new_listing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_badge_earned() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_high_score_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_lead_whatsapp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_owner_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_owner_new_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_owner_new_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_owner_payment_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_voice_agent_script() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_property_contact_details() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_auto_call_high_score_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_check_badges_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_check_badges_on_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_check_badges_on_vote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_submission_vote_count() FROM PUBLIC, anon, authenticated;

-- Keep intentionally used RPC helpers callable only where needed
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_poi_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_cta_rate_limit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) TO authenticated;
