
-- Audit log for SEO fix actions (used by "Anulează ultima rulare" + history)
CREATE TABLE IF NOT EXISTS public.seo_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  action TEXT NOT NULL,            -- 'preview_apply' | 'ai_fix' | 'revert' | 'cron_reaudit'
  category TEXT,                   -- e.g. 'missing_meta', 'low_score'
  url_path TEXT NOT NULL,
  audit_id UUID,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'cron' | 'bulk'
  payload JSONB DEFAULT '{}'::jsonb,
  reverted BOOLEAN NOT NULL DEFAULT false,
  reverted_at TIMESTAMPTZ,
  applied_by UUID,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_audit_log_batch_idx ON public.seo_audit_log (batch_id);
CREATE INDEX IF NOT EXISTS seo_audit_log_applied_idx ON public.seo_audit_log (applied_at DESC);
CREATE INDEX IF NOT EXISTS seo_audit_log_url_idx ON public.seo_audit_log (url_path);

ALTER TABLE public.seo_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo_audit_log"
  ON public.seo_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert seo_audit_log"
  ON public.seo_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update seo_audit_log"
  ON public.seo_audit_log FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Service role bypass (edge functions write via service role; RLS not enforced there)
