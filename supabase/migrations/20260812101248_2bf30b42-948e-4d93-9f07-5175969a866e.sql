-- 1) chatbot_appointments: validate data on UPDATE (mirror INSERT constraints)
DROP POLICY IF EXISTS "Users can update own appointments" ON public.chatbot_appointments;
CREATE POLICY "Users can update own appointments"
ON public.chatbot_appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  user_id = auth.uid()
  AND length(contact_name) >= 2 AND length(contact_name) <= 120
  AND length(contact_phone) >= 7 AND length(contact_phone) <= 40
  AND appointment_type IS NOT NULL
  AND length(appointment_type) >= 2 AND length(appointment_type) <= 80
  AND (contact_email IS NULL OR contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

-- 2) WhatsApp tables: make admin-only access explicit for Realtime subscribers
REVOKE ALL ON public.wa_conversations FROM anon;
REVOKE ALL ON public.wa_messages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_conversations TO service_role;
GRANT ALL ON public.wa_messages TO service_role;

DROP POLICY IF EXISTS "Admins can read wa conversations" ON public.wa_conversations;
CREATE POLICY "Admins can read wa conversations"
ON public.wa_conversations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can read wa messages" ON public.wa_messages;
CREATE POLICY "Admins can read wa messages"
ON public.wa_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));