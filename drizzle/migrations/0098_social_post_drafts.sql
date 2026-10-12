CREATE TABLE public.social_post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE,
  property_slug text,
  title text,
  post_text text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.social_post_drafts TO authenticated;
GRANT ALL ON public.social_post_drafts TO service_role;
ALTER TABLE public.social_post_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read social drafts" ON public.social_post_drafts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update social drafts" ON public.social_post_drafts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete social drafts" ON public.social_post_drafts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));