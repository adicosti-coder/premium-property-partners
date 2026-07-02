CREATE TABLE public.investment_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nume TEXT NOT NULL,
  pret NUMERIC NOT NULL,
  suprafata NUMERIC NOT NULL,
  chirie NUMERIC NOT NULL,
  amenajari NUMERIC NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'z-ai/glm-5.2',
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_analyses TO authenticated;
GRANT ALL ON public.investment_analyses TO service_role;

ALTER TABLE public.investment_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view investment analyses"
  ON public.investment_analyses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert investment analyses"
  ON public.investment_analyses FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update investment analyses"
  ON public.investment_analyses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete investment analyses"
  ON public.investment_analyses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_investment_analyses_updated_at
  BEFORE UPDATE ON public.investment_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_analyses_created_at ON public.investment_analyses(created_at DESC);
CREATE INDEX idx_investment_analyses_created_by ON public.investment_analyses(created_by);