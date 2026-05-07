
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'voice_call',
  direction text NOT NULL DEFAULT 'outbound',
  source text NOT NULL DEFAULT 'manual',
  to_number text,
  from_number text,
  status text,
  outcome text,
  duration_seconds integer,
  voice_session_id uuid,
  prospect_listing_id uuid,
  scraper_lead_id uuid,
  lead_id uuid,
  autopilot_run_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_created ON public.communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_source ON public.communication_logs(source);
CREATE INDEX IF NOT EXISTS idx_communication_logs_session ON public.communication_logs(voice_session_id);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view communication logs"
  ON public.communication_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert communication logs"
  ON public.communication_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
