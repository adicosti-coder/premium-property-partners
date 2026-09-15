-- 1) advisor_cache: remove fully public SELECT (only edge functions / admins read it)
DROP POLICY IF EXISTS "Anyone can read advisor cache" ON public.advisor_cache;
REVOKE ALL ON public.advisor_cache FROM anon;

CREATE POLICY "Block anonymous access to advisor cache"
  ON public.advisor_cache FOR ALL TO anon USING (false);

-- property_vision_cache: keep admin-only SELECT, make anon denial explicit
REVOKE ALL ON public.property_vision_cache FROM anon;
DROP POLICY IF EXISTS "Block anonymous access to vision cache" ON public.property_vision_cache;
CREATE POLICY "Block anonymous access to vision cache"
  ON public.property_vision_cache FOR ALL TO anon USING (false);

-- 2) property_analyses: explicit owner/anon boundary; share_token path stays server-side only
REVOKE ALL ON public.property_analyses FROM anon;
DROP POLICY IF EXISTS "Block anonymous access to property analyses" ON public.property_analyses;
CREATE POLICY "Block anonymous access to property analyses"
  ON public.property_analyses FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Recipients can view their own analyses" ON public.property_analyses;
CREATE POLICY "Recipients can view their own analyses"
  ON public.property_analyses FOR SELECT TO authenticated
  USING (
    recipient_email IS NOT NULL
    AND lower(recipient_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- 3) WhatsApp tables: hard-deny anon so realtime/postgres_changes can never leak PII
REVOKE ALL ON public.wa_conversations FROM anon;
REVOKE ALL ON public.wa_messages FROM anon;
REVOKE ALL ON public.wa_transaction_events FROM anon;
REVOKE ALL ON public.make_lead_events FROM anon;

DROP POLICY IF EXISTS "Block anonymous access to wa conversations" ON public.wa_conversations;
CREATE POLICY "Block anonymous access to wa conversations"
  ON public.wa_conversations FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Block anonymous access to wa messages" ON public.wa_messages;
CREATE POLICY "Block anonymous access to wa messages"
  ON public.wa_messages FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Block anonymous access to wa transaction events" ON public.wa_transaction_events;
CREATE POLICY "Block anonymous access to wa transaction events"
  ON public.wa_transaction_events FOR ALL TO anon USING (false);
