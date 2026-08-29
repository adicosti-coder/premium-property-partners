-- Anti-spam content check for guest POI reviews
CREATE OR REPLACE FUNCTION public.poi_review_content_is_clean(p_comment text, p_guest_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  c text := COALESCE(p_comment, '');
  n text := COALESCE(p_guest_name, '');
BEGIN
  -- Links / markup are never legitimate in a short venue review
  IF c ~* '(https?://|www\.|\[[^]]*\]\([^)]*\)|<[a-z/][^>]*>)' THEN
    RETURN false;
  END IF;
  IF n ~* '(https?://|www\.|<[a-z/][^>]*>)' THEN
    RETURN false;
  END IF;
  -- Obvious keyword spam
  IF c ~* '(viagra|casino|crypto\s*invest|porn|loan offer|bitcoin doubl)' THEN
    RETURN false;
  END IF;
  -- Character flooding (aaaaaaaa / !!!!!!!!)
  IF c ~ '(.)\1{9,}' THEN
    RETURN false;
  END IF;
  -- Either empty (rating-only) or a real sentence
  IF length(btrim(c)) > 0 AND length(btrim(c)) < 4 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- Per-user rate limit: max 3 reviews / hour, max 10 / day
CREATE OR REPLACE FUNCTION public.check_poi_review_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_hour integer;
  last_day integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO last_hour
  FROM public.poi_reviews
  WHERE user_id = p_user_id
    AND created_at > now() - interval '1 hour';

  IF last_hour >= 3 THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO last_day
  FROM public.poi_reviews
  WHERE user_id = p_user_id
    AND created_at > now() - interval '1 day';

  RETURN last_day < 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.poi_review_content_is_clean(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_poi_review_rate_limit(uuid) TO authenticated;

-- Re-create the guest write policies with anti-spam + rate limiting enforced
DROP POLICY IF EXISTS "Users can add their own poi review" ON public.poi_reviews;
CREATE POLICY "Users can add their own poi review"
  ON public.poi_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND rejection_reason IS NULL
    AND moderated_by IS NULL
    AND char_length(COALESCE(comment, '')) <= 1000
    AND char_length(COALESCE(guest_name, '')) <= 80
    AND rating BETWEEN 1 AND 5
    AND public.poi_review_content_is_clean(comment, guest_name)
    AND public.check_poi_review_rate_limit(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own poi review" ON public.poi_reviews;
CREATE POLICY "Users can update their own poi review"
  ON public.poi_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND moderated_by IS NULL
    AND char_length(COALESCE(comment, '')) <= 1000
    AND char_length(COALESCE(guest_name, '')) <= 80
    AND rating BETWEEN 1 AND 5
    AND public.poi_review_content_is_clean(comment, guest_name)
  );