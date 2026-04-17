-- Bucket privat pentru rapoartele PDF generate automat
INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-audit-reports', 'seo-audit-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: doar adminii pot citi/lista PDF-urile
CREATE POLICY "Admins can view seo audit reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seo-audit-reports' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage seo audit reports"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'seo-audit-reports')
  WITH CHECK (bucket_id = 'seo-audit-reports');

-- Tabel snapshot pentru tracking săptămânal & comparație delta
CREATE TABLE public.seo_audit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.seo_audits(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ro',
  overall_score INTEGER NOT NULL DEFAULT 0,
  local_relevance_score INTEGER NOT NULL DEFAULT 0,
  delta_overall INTEGER,
  delta_local INTEGER,
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  alert_reason TEXT,
  pdf_storage_path TEXT,
  run_type TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_snapshots_url_created ON public.seo_audit_snapshots (url, created_at DESC);
CREATE INDEX idx_seo_snapshots_alerts ON public.seo_audit_snapshots (created_at DESC) WHERE alert_triggered = true;

ALTER TABLE public.seo_audit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo snapshots"
  ON public.seo_audit_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages seo snapshots"
  ON public.seo_audit_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);