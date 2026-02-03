-- Fix discount_code_uses RLS to only allow service_role inserts
-- This prevents any client-side data manipulation

-- Drop existing INSERT policy that allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert their own usage records" ON public.discount_code_uses;

-- Block all client-side INSERT (only service_role can insert)
-- The existing "Block public select on discount_code_uses" already blocks SELECT
-- Adding explicit INSERT block for security
CREATE POLICY "Service role only can insert usage records" 
ON public.discount_code_uses 
FOR INSERT 
WITH CHECK (false);

-- Note: service_role bypasses RLS, so edge functions can still insert