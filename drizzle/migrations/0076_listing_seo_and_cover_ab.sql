ALTER TABLE public.property_images ADD COLUMN IF NOT EXISTS is_cover_candidate boolean NOT NULL DEFAULT false;

CREATE TABLE public.property_seo_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  descriptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_seo_suggestions TO authenticated;
GRANT ALL ON public.property_seo_suggestions TO service_role;
ALTER TABLE public.property_seo_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo suggestions" ON public.property_seo_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));