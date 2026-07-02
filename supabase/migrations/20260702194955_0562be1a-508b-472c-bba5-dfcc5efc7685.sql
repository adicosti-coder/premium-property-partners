
CREATE TABLE public.seo_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  primary_keyword TEXT,
  meta_description TEXT,
  markdown TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_guides TO authenticated;
GRANT ALL ON public.seo_guides TO service_role;

ALTER TABLE public.seo_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all seo_guides"
  ON public.seo_guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own seo_guides"
  ON public.seo_guides FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_seo_guides_updated_at
  BEFORE UPDATE ON public.seo_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seo_guides_user_created ON public.seo_guides(user_id, created_at DESC);
