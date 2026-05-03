CREATE TABLE IF NOT EXISTS public.seo_ga4_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (url_path, period_start)
);

CREATE INDEX IF NOT EXISTS idx_seo_ga4_metrics_period ON public.seo_ga4_metrics (period_start DESC);
CREATE INDEX IF NOT EXISTS idx_seo_ga4_metrics_path ON public.seo_ga4_metrics (url_path);

ALTER TABLE public.seo_ga4_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo_ga4_metrics"
ON public.seo_ga4_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert seo_ga4_metrics"
ON public.seo_ga4_metrics
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update seo_ga4_metrics"
ON public.seo_ga4_metrics
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete seo_ga4_metrics"
ON public.seo_ga4_metrics
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_ga4_metrics_updated_at
BEFORE UPDATE ON public.seo_ga4_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();