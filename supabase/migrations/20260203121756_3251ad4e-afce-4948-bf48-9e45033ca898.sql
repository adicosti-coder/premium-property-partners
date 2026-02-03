-- Fix discount_code_uses policies to use authenticated role instead of public
DROP POLICY IF EXISTS "Admins can view all usage" ON public.discount_code_uses;

CREATE POLICY "Admins can view all usage"
ON public.discount_code_uses
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure authenticated users can only INSERT (not SELECT other users' records)
DROP POLICY IF EXISTS "Authenticated users can insert their own usage records" ON public.discount_code_uses;

CREATE POLICY "Authenticated users can insert their own usage records"
ON public.discount_code_uses
FOR INSERT
TO authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

-- Add explicit policy to block public SELECT (defense in depth)
CREATE POLICY "Block public select on discount_code_uses"
ON public.discount_code_uses
FOR SELECT
TO public
USING (false);