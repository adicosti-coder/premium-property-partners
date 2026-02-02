-- Fix 1: Add DELETE policy for newsletter_subscribers to allow GDPR-compliant unsubscribe
-- Users can delete their own subscription by matching their authenticated email
CREATE POLICY "Users can unsubscribe themselves"
ON public.newsletter_subscribers
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix 2: Restrict discount_code_uses INSERT to authenticated users only
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert usage records" ON public.discount_code_uses;

-- Create a more restrictive INSERT policy - only authenticated users can insert their own records
CREATE POLICY "Authenticated users can insert their own usage records"
ON public.discount_code_uses
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Fix 3: Create admin access audit log table for tracking sensitive data access
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on admin_access_logs
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
CREATE POLICY "Only admins can view access logs"
ON public.admin_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert access logs"
ON public.admin_access_logs
FOR INSERT
WITH CHECK (false);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_admin_user_id ON public.admin_access_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_accessed_at ON public.admin_access_logs(accessed_at DESC);