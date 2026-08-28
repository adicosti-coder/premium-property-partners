CREATE TABLE public.property_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  mode text NOT NULL DEFAULT 'url',
  source_url text,
  photo_count integer NOT NULL DEFAULT 0,
  context_text text,
  input_hash text,
  model text,
  cached boolean NOT NULL DEFAULT false,
  analysis jsonb NOT NULL,
  score integer,
  zone text,
  lead_id uuid,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_analyses TO authenticated;
GRANT ALL ON public.property_analyses TO service_role;

ALTER TABLE public.property_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analyses"
ON public.property_analyses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_property_analyses_created_at ON public.property_analyses (created_at DESC);
CREATE INDEX idx_property_analyses_input_hash ON public.property_analyses (input_hash);

CREATE TRIGGER trg_property_analyses_updated_at
BEFORE UPDATE ON public.property_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_analysis_by_token(_token text)
RETURNS TABLE (
  id uuid,
  share_token text,
  mode text,
  source_url text,
  photo_count integer,
  analysis jsonb,
  score integer,
  zone text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.id, pa.share_token, pa.mode, pa.source_url, pa.photo_count,
         pa.analysis, pa.score, pa.zone, pa.created_at
  FROM public.property_analyses pa
  WHERE pa.share_token = _token
    AND length(_token) >= 16
    AND pa.created_at > now() - interval '365 days'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_analysis_by_token(text) TO anon, authenticated;