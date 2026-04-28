-- Ensure every public table has RLS enabled and admin_otp_codes has an explicit deny-by-default policy
ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct client access to admin OTP codes" ON public.admin_otp_codes;
CREATE POLICY "No direct client access to admin OTP codes"
ON public.admin_otp_codes
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Fix security-definer views so they respect caller permissions/RLS
ALTER VIEW public.booking_availability SET (security_invoker = on);
ALTER VIEW public.public_site_settings SET (security_invoker = on);

-- Replace overly permissive public write policies with constrained insert-only policies
DROP POLICY IF EXISTS "Anyone can record article views" ON public.blog_article_views;
CREATE POLICY "Public can record valid article views"
ON public.blog_article_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  article_id IS NOT NULL
  AND session_id IS NOT NULL
  AND length(session_id) BETWEEN 8 AND 128
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can create conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Create conversations with valid session" ON public.chat_conversations;
CREATE POLICY "Public can create valid anonymous conversations"
ON public.chat_conversations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 32 AND 128
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (expires_at IS NULL OR expires_at > now())
);

DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;
CREATE POLICY "Public can add messages to valid conversations"
ON public.chat_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  conversation_id IS NOT NULL
  AND role IN ('user', 'assistant', 'system', 'tool')
  AND length(content) BETWEEN 1 AND 20000
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.user_id IS NULL OR c.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone can insert chat ratings" ON public.chat_ratings;
CREATE POLICY "Public can submit valid chat ratings"
ON public.chat_ratings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND (session_id IS NULL OR length(session_id) BETWEEN 8 AND 128)
  AND (
    conversation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_ratings.conversation_id
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND (c.user_id IS NULL OR c.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Anyone can create appointments" ON public.chatbot_appointments;
CREATE POLICY "Public can create valid appointments"
ON public.chatbot_appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(contact_name) BETWEEN 2 AND 120
  AND length(contact_phone) BETWEEN 7 AND 40
  AND appointment_type IS NOT NULL
  AND length(appointment_type) BETWEEN 2 AND 80
  AND (contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can insert evaluare events" ON public.evaluare_section_events;
CREATE POLICY "Public can record valid evaluare events"
ON public.evaluare_section_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(event_type) BETWEEN 2 AND 80
  AND length(section_id) BETWEEN 1 AND 120
  AND (session_id IS NULL OR length(session_id) BETWEEN 8 AND 128)
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can insert funnel events" ON public.pdf_funnel_events;
CREATE POLICY "Public can record valid funnel events"
ON public.pdf_funnel_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(session_id) BETWEEN 8 AND 128
  AND step IN ('lead_submitted', 'pdf_downloaded', 'thankyou_view', 'cta_properties', 'cta_guide', 'cta_evaluation')
  AND (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

DROP POLICY IF EXISTS "Anyone can insert import events" ON public.poi_import_events;
CREATE POLICY "Public can record valid POI import events"
ON public.poi_import_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  shared_link_id IS NOT NULL
  AND imported_count BETWEEN 0 AND 1000
  AND (imported_by IS NULL OR imported_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.shared_poi_links l
    WHERE l.id = poi_import_events.shared_link_id
  )
);

DROP POLICY IF EXISTS "Anyone can submit property requests" ON public.property_requests;
CREATE POLICY "Public can submit valid property requests"
ON public.property_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(name) BETWEEN 2 AND 160
  AND length(phone) BETWEEN 7 AND 40
  AND (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
  AND (message IS NULL OR length(message) <= 2000)
);

DROP POLICY IF EXISTS "Anyone can insert property views" ON public.property_views;
CREATE POLICY "Public can record valid property views"
ON public.property_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  property_id IS NOT NULL
  AND length(session_id) BETWEEN 8 AND 128
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can insert comparisons" ON public.saved_comparisons;
CREATE POLICY "Public can create valid shared comparisons"
ON public.saved_comparisons
FOR INSERT
TO anon, authenticated
WITH CHECK (
  jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) BETWEEN 1 AND 20
  AND share_code IS NOT NULL
  AND length(share_code) BETWEEN 6 AND 80
  AND (session_id IS NULL OR length(session_id) BETWEEN 8 AND 128)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Keep public shared comparisons read-only; writes are constrained above/admin or owner only
DROP POLICY IF EXISTS "Users can update own comparisons" ON public.saved_comparisons;
CREATE POLICY "Authenticated users can update own comparisons"
ON public.saved_comparisons
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tighten function execution grants for security-definer helpers that should not be anonymous RPC endpoints
REVOKE EXECUTE ON FUNCTION public.auto_blacklist_prospect(uuid, integer, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_archive_detected_agencies() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_cta_rate_limit(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_chat_session(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shared_poi_link(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;