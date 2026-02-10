-- Remove the permissive SELECT policy that allows any authenticated user to enumerate unused codes
DROP POLICY IF EXISTS "Authenticated users can verify unused codes" ON public.owner_codes;