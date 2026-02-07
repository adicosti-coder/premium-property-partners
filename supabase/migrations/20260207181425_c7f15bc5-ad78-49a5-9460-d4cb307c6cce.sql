-- Tighten RLS for chat tables to prevent access to anonymous conversations via guessed IDs

-- chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
ON public.chat_conversations
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations"
ON public.chat_conversations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.user_id = auth.uid()
  )
);


-- Reduce SECURITY DEFINER attack surface by revoking direct EXECUTE on trigger/helper functions.
-- (These should only run via triggers / internal calls, not be callable by end-users.)
REVOKE EXECUTE ON FUNCTION public.increment_article_view_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_email() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_submission_vote_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_discount_code_uses() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_leads_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_leads_select() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_check_badges_on_submission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_check_badges_on_vote() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_check_badges_on_comment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_badge_earned() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_welcome_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_owner_new_booking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_owner_payment_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_owner_new_payment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_owner_new_review() FROM PUBLIC;

-- Ensure role-check helper remains callable for RLS expressions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
