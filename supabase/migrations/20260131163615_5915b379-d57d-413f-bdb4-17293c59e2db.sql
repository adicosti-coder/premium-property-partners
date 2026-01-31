-- Verify and fix RLS policies for email_click_tracking and leads tables
-- These tables should only be readable by admins

-- First, drop any potentially conflicting policies and recreate them properly

-- For email_click_tracking: Ensure only admins can SELECT
DROP POLICY IF EXISTS "Admins can view click tracking" ON public.email_click_tracking;
DROP POLICY IF EXISTS "Service role can manage click tracking" ON public.email_click_tracking;

-- Recreate with strict admin-only access for SELECT
CREATE POLICY "Admins can view click tracking" 
ON public.email_click_tracking 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role inserts (edge functions use service role key)
CREATE POLICY "Service role can insert click tracking" 
ON public.email_click_tracking 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- For leads: Verify admin-only SELECT access
DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;

-- Recreate with explicit authenticated target
CREATE POLICY "Admins can read leads" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));