CREATE TABLE public.pdf_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  step text NOT NULL CHECK (step IN ('lead_submitted','pdf_downloaded','thankyou_view','cta_properties','cta_guide','cta_evaluation')),
  source text,
  email text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_funnel_session ON public.pdf_funnel_events (session_id, created_at);
CREATE INDEX idx_pdf_funnel_step_created ON public.pdf_funnel_events (step, created_at DESC);

ALTER TABLE public.pdf_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel events"
  ON public.pdf_funnel_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read funnel events"
  ON public.pdf_funnel_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));