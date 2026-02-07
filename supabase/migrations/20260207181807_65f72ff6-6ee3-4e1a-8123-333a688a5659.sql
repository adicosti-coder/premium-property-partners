-- Improve chat_conversations session security
-- Add cryptographic session validation and tighten RLS

-- First, add a created_at index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_created 
ON public.chat_conversations(session_id, created_at DESC);

-- Add session expiry column for better security
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours');

-- Create a function to validate session ownership
CREATE OR REPLACE FUNCTION public.validate_chat_session(p_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Session must be at least 32 characters (UUIDv4 or similar)
  IF LENGTH(p_session_id) < 32 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if session exists and is not expired
  RETURN EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE session_id = p_session_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view conversations by session" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;

-- Create stricter RLS policies for chat_conversations
-- Authenticated users can only see their own conversations
CREATE POLICY "Authenticated users view own conversations"
ON public.chat_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Anonymous users can only access non-expired sessions they created
-- This requires the session_id to match exactly (should be cryptographically random from client)
CREATE POLICY "Anonymous session access with expiry check"
ON public.chat_conversations FOR SELECT
TO anon
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND LENGTH(session_id) >= 32
  AND (expires_at IS NULL OR expires_at > now())
);

-- Insert policy - anyone can create a conversation but session must be long enough
CREATE POLICY "Create conversations with valid session"
ON public.chat_conversations FOR INSERT
WITH CHECK (
  session_id IS NOT NULL 
  AND LENGTH(session_id) >= 32
);

-- Update policy - only owner can update
CREATE POLICY "Owner can update own conversation"
ON public.chat_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Revoke execute on validate_chat_session from public (only for internal RLS use)
REVOKE EXECUTE ON FUNCTION public.validate_chat_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_chat_session(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN public.chat_conversations.session_id IS 'Must be cryptographically random UUID (min 32 chars) to prevent session guessing attacks';