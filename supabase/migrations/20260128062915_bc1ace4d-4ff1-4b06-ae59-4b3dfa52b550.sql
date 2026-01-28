-- Drop existing overly permissive SELECT policy for owner_codes
DROP POLICY IF EXISTS "Anyone can verify unused codes" ON public.owner_codes;

-- Create a more restrictive policy that requires authentication for code verification
-- This prevents enumeration attacks while still allowing legitimate code verification
CREATE POLICY "Authenticated users can verify unused codes"
ON public.owner_codes
FOR SELECT
USING (
  is_used = false 
  AND auth.uid() IS NOT NULL
);

-- Allow admins to view all codes
CREATE POLICY "Admins can view all owner codes"
ON public.owner_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));