-- Add snooze, follow-up and AI insight columns to scraper_leads
ALTER TABLE public.scraper_leads
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_insight JSONB,
  ADD COLUMN IF NOT EXISTS ai_insight_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scraper_leads_snoozed_until ON public.scraper_leads(snoozed_until) WHERE snoozed_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scraper_leads_follow_up_at ON public.scraper_leads(follow_up_at) WHERE follow_up_at IS NOT NULL;

-- Quick reply templates table
CREATE TABLE IF NOT EXISTS public.scraper_quick_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_quick_reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view templates"
  ON public.scraper_quick_reply_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert templates"
  ON public.scraper_quick_reply_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
  ON public.scraper_quick_reply_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
  ON public.scraper_quick_reply_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_quick_reply_templates_updated_at
  BEFORE UPDATE ON public.scraper_quick_reply_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();