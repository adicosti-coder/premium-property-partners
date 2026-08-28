CREATE TABLE public.property_analysis_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.property_analyses(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pav_analysis ON public.property_analysis_versions(analysis_id, version DESC);

GRANT SELECT ON public.property_analysis_versions TO authenticated;
GRANT ALL ON public.property_analysis_versions TO service_role;

ALTER TABLE public.property_analysis_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analysis versions"
ON public.property_analysis_versions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.property_analyses
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.log_analysis_version(
  p_token text,
  p_params jsonb,
  p_analysis jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_next integer;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{16,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id
  FROM public.property_analyses
  WHERE share_token = p_token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*), COALESCE(max(version), 0) + 1
    INTO v_count, v_next
  FROM public.property_analysis_versions
  WHERE analysis_id = v_id;

  IF v_count >= 50 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.property_analysis_versions (analysis_id, version, params, analysis)
  VALUES (v_id, v_next, COALESCE(p_params, '{}'::jsonb), COALESCE(p_analysis, '{}'::jsonb));

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_analysis_version(text, jsonb, jsonb) TO anon, authenticated, service_role;