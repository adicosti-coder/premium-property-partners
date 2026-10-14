CREATE TABLE public.ai_text_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  action text NOT NULL,
  lang text NOT NULL DEFAULT 'ro',
  prompt_version text NOT NULL,
  output jsonb NOT NULL,
  model text,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_text_cache TO service_role;
ALTER TABLE public.ai_text_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai text cache" ON public.ai_text_cache FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.ai_text_cache TO authenticated;