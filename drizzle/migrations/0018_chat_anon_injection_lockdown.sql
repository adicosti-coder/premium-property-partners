-- 1) chat_messages: prevent injecting messages into anonymous conversations a caller does not own.
DROP POLICY IF EXISTS "Public can add user messages to valid conversations" ON public.chat_messages;

CREATE POLICY "Owners can add user messages to their conversations"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IS NOT NULL
  AND role = 'user'
  AND length(content) >= 1
  AND length(content) <= 20000
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND c.user_id = auth.uid()
  )
);

-- Anonymous visitors must go through server-side (service role) edge functions.
DROP POLICY IF EXISTS "Deny anon access to chat_messages" ON public.chat_messages;
CREATE POLICY "Deny anon access to chat_messages"
ON public.chat_messages
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

REVOKE ALL ON public.chat_messages FROM anon;

-- 2) chat_conversations: anonymous sessions can no longer be created client-side either,
-- so no unowned conversation_id can be targeted.
DROP POLICY IF EXISTS "Public can create valid anonymous conversations" ON public.chat_conversations;

CREATE POLICY "Authenticated users create own conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND session_id IS NOT NULL
  AND length(session_id) >= 32
  AND length(session_id) <= 128
  AND (expires_at IS NULL OR expires_at > now())
);

DROP POLICY IF EXISTS "Deny anon access to chat_conversations" ON public.chat_conversations;
CREATE POLICY "Deny anon access to chat_conversations"
ON public.chat_conversations
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

REVOKE ALL ON public.chat_conversations FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- 3) discount_codes: keep fail-closed (admin-only). Validation runs server-side via
-- edge functions using the service role; ensure anon/authenticated have no table access.
REVOKE ALL ON public.discount_codes FROM anon;
REVOKE ALL ON public.discount_codes FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated; -- admin-only policy still gates rows
GRANT ALL ON public.discount_codes TO service_role;