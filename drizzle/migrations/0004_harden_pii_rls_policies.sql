-- 1. chatbot_appointments: scope policies to authenticated, deny anon reads
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.chatbot_appointments;
CREATE POLICY "Admins can manage all appointments"
  ON public.chatbot_appointments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own appointments" ON public.chatbot_appointments;
CREATE POLICY "Users can view own appointments"
  ON public.chatbot_appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deny anon select on chatbot_appointments" ON public.chatbot_appointments;
CREATE POLICY "Deny anon select on chatbot_appointments"
  ON public.chatbot_appointments AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

-- 2. poi_reviews: no direct anon reads; public content served masked via RPC
DROP POLICY IF EXISTS "Anyone can read approved poi reviews" ON public.poi_reviews;
DROP POLICY IF EXISTS "Users can read own poi reviews" ON public.poi_reviews;
CREATE POLICY "Users can read own poi reviews"
  ON public.poi_reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Deny anon select on poi_reviews" ON public.poi_reviews;
CREATE POLICY "Deny anon select on poi_reviews"
  ON public.poi_reviews AS RESTRICTIVE FOR SELECT TO anon
  USING (false);

CREATE OR REPLACE FUNCTION public.get_public_poi_reviews(_poi_ids uuid[])
RETURNS TABLE (
  id uuid,
  poi_id uuid,
  rating integer,
  comment text,
  guest_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id,
    r.poi_id,
    r.rating,
    r.comment,
    CASE
      WHEN r.guest_name IS NULL OR btrim(r.guest_name) = '' THEN NULL
      ELSE split_part(btrim(r.guest_name), ' ', 1) ||
           CASE
             WHEN split_part(btrim(r.guest_name), ' ', 2) <> ''
               THEN ' ' || left(split_part(btrim(r.guest_name), ' ', 2), 1) || '.'
             ELSE ''
           END
    END AS guest_name,
    r.created_at
  FROM public.poi_reviews r
  WHERE r.status = 'approved'
    AND r.poi_id = ANY (_poi_ids)
  ORDER BY r.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_public_poi_reviews(uuid[]) TO anon, authenticated;

-- 3. property_reviews: keep guest_email admin-only; scope admin policy to authenticated
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.property_reviews;
CREATE POLICY "Admins can manage all reviews"
  ON public.property_reviews FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.property_reviews;
CREATE POLICY "Anyone can submit reviews"
  ON public.property_reviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    (is_published = false)
    AND ((guest_email IS NULL) OR (guest_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'))
    AND ((guest_email IS NULL) OR (length(guest_email) <= 255))
    AND ((guest_name IS NULL) OR (length(guest_name) <= 120))
    AND ((title IS NULL) OR (length(title) <= 200))
    AND ((content IS NULL) OR (length(content) <= 4000))
    AND (rating >= 1::numeric AND rating <= 5::numeric)
  );

-- 4. voice_call_sessions: block anon entirely (transcripts + phone numbers)
DROP POLICY IF EXISTS "Deny anon access on voice_call_sessions" ON public.voice_call_sessions;
CREATE POLICY "Deny anon access on voice_call_sessions"
  ON public.voice_call_sessions AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

REVOKE ALL ON public.voice_call_sessions FROM anon;