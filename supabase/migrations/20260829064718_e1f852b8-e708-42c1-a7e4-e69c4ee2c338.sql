CREATE TABLE public.poi_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poi_id uuid NOT NULL REFERENCES public.points_of_interest(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  guest_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poi_id, user_id)
);

CREATE INDEX idx_poi_reviews_poi ON public.poi_reviews(poi_id);

GRANT SELECT ON public.poi_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poi_reviews TO authenticated;
GRANT ALL ON public.poi_reviews TO service_role;

ALTER TABLE public.poi_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read poi reviews"
  ON public.poi_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can add their own poi review"
  ON public.poi_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND char_length(coalesce(comment, '')) <= 1000 AND char_length(coalesce(guest_name, '')) <= 80);

CREATE POLICY "Users can update their own poi review"
  ON public.poi_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND char_length(coalesce(comment, '')) <= 1000 AND char_length(coalesce(guest_name, '')) <= 80);

CREATE POLICY "Users can delete their own poi review"
  ON public.poi_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage poi reviews"
  ON public.poi_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_poi_reviews_updated_at
  BEFORE UPDATE ON public.poi_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();