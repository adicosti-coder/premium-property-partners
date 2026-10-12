CREATE TABLE public.content_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('blog_seo','social_tone','social_hashtags','social_caption','blog_topic','insight')),
  target_id uuid,
  title text NOT NULL,
  rationale text,
  current_value jsonb,
  proposed_value jsonb,
  evidence jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected','failed')),
  baseline jsonb,
  outcome jsonb,
  decided_at timestamptz,
  decided_by uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.content_improvements TO authenticated;
GRANT ALL ON public.content_improvements TO service_role;
ALTER TABLE public.content_improvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read improvements" ON public.content_improvements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update improvements" ON public.content_improvements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete improvements" ON public.content_improvements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX content_improvements_status_idx ON public.content_improvements(status, created_at DESC);