CREATE TABLE IF NOT EXISTS public.prospect_rejection_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  category text NOT NULL,
  source_platform text,
  rejection_reason text,
  title text NOT NULL,
  message text NOT NULL,
  metric jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prej_alerts_status_created
  ON public.prospect_rejection_alerts (status, created_at DESC);

-- Dedup: aceeași signature nu poate fi „open" de mai multe ori
CREATE UNIQUE INDEX IF NOT EXISTS uniq_prej_alerts_open_signature
  ON public.prospect_rejection_alerts (signature)
  WHERE status = 'open';

ALTER TABLE public.prospect_rejection_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_prej_alerts" ON public.prospect_rejection_alerts;
CREATE POLICY "admin_select_prej_alerts"
  ON public.prospect_rejection_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_update_prej_alerts" ON public.prospect_rejection_alerts;
CREATE POLICY "admin_update_prej_alerts"
  ON public.prospect_rejection_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_prej_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_prej_alerts_updated_at ON public.prospect_rejection_alerts;
CREATE TRIGGER trg_prej_alerts_updated_at
BEFORE UPDATE ON public.prospect_rejection_alerts
FOR EACH ROW EXECUTE FUNCTION public.touch_prej_alerts_updated_at();