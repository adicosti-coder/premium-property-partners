-- Fix: Restrict UPDATE on shared_poi_links to service_role only
DROP POLICY IF EXISTS "Service can update import counts" ON public.shared_poi_links;
CREATE POLICY "Service can update import counts"
ON public.shared_poi_links
FOR UPDATE
TO service_role
USING (true);