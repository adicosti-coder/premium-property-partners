ALTER TABLE public.seo_premium_plus_runs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS seo_premium_plus_runs_updated_at ON public.seo_premium_plus_runs;
CREATE TRIGGER seo_premium_plus_runs_updated_at
  BEFORE UPDATE ON public.seo_premium_plus_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
