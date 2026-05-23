
-- 1. Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_prej_alerts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$function$;

-- 2. Replace overly broad anonymous SELECT on saved_comparisons with a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anonymous comparisons are publicly viewable" ON public.saved_comparisons;

CREATE OR REPLACE FUNCTION public.get_shared_comparison(p_share_code text)
RETURNS TABLE(items jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.items
  FROM public.saved_comparisons sc
  WHERE sc.share_code = p_share_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_comparison(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_comparison(text) TO anon, authenticated;

-- 3. Lock down realtime.messages — only admins may subscribe to channels.
--    All 9 tables published to supabase_realtime are admin-only operational tables.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only realtime subscribe" ON realtime.messages;
CREATE POLICY "Admins only realtime subscribe"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins only realtime broadcast" ON realtime.messages;
CREATE POLICY "Admins only realtime broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
