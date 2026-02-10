-- Remove the overly permissive public SELECT policy on discount_codes
-- Validation is handled by the validate-discount-code edge function (uses service role)
-- Admin access is covered by the existing admin policy
DROP POLICY IF EXISTS "Anyone can view active discount codes for validation" ON public.discount_codes;