ALTER TABLE public.property_analyses
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_property_analyses_expires_at ON public.property_analyses (expires_at);

DROP FUNCTION IF EXISTS public.get_analysis_by_token(text);

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
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.id, pa.share_token, pa.mode, pa.source_url, pa.photo_count,
         pa.analysis, pa.score, pa.zone, pa.created_at, pa.expires_at
  FROM public.property_analyses pa
  WHERE pa.share_token = _token
    AND length(_token) >= 16
    AND pa.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_analysis_by_token(text) TO anon, authenticated;