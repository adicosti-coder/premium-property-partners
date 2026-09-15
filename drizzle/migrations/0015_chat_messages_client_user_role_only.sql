DROP POLICY IF EXISTS "Public can add messages to valid conversations" ON public.chat_messages;

CREATE POLICY "Public can add user messages to valid conversations"
ON public.chat_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  conversation_id IS NOT NULL
  AND role = 'user'
  AND length(content) >= 1
  AND length(content) <= 20000
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.user_id IS NULL OR c.user_id = auth.uid())
  )
);