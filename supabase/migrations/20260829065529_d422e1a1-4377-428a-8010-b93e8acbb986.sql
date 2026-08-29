ALTER TABLE public.poi_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

ALTER TABLE public.poi_reviews
  ADD CONSTRAINT poi_reviews_status_check CHECK (status IN ('pending','approved','rejected'));

UPDATE public.poi_reviews SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_poi_reviews_status ON public.poi_reviews(status);

DROP POLICY IF EXISTS "Anyone can read poi reviews" ON public.poi_reviews;

CREATE POLICY "Anyone can read approved poi reviews"
  ON public.poi_reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add their own poi review" ON public.poi_reviews;
CREATE POLICY "Users can add their own poi review"
  ON public.poi_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND rejection_reason IS NULL
    AND moderated_by IS NULL
    AND char_length(coalesce(comment, '')) <= 1000
    AND char_length(coalesce(guest_name, '')) <= 80
  );

DROP POLICY IF EXISTS "Users can update their own poi review" ON public.poi_reviews;
CREATE POLICY "Users can update their own poi review"
  ON public.poi_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND moderated_by IS NULL
    AND char_length(coalesce(comment, '')) <= 1000
    AND char_length(coalesce(guest_name, '')) <= 80
  );