
-- Fix chatbot_appointments SELECT policy: remove anonymous appointment viewing
DROP POLICY IF EXISTS "Users can view own appointments" ON public.chatbot_appointments;

CREATE POLICY "Users can view own appointments"
ON public.chatbot_appointments
FOR SELECT
USING (auth.uid() = user_id);
