CREATE TABLE IF NOT EXISTS public.evaluare_section_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('view', 'click')),
  section_id text NOT NULL,
  label text,
  source text,
  session_id text,
  page_path text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluare_section_events_created_at
  ON public.evaluare_section_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluare_section_events_section_type
  ON public.evaluare_section_events (section_id, event_type);

ALTER TABLE public.evaluare_section_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert evaluare events" ON public.evaluare_section_events;
CREATE POLICY "Anyone can insert evaluare events"
  ON public.evaluare_section_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view evaluare events" ON public.evaluare_section_events;
CREATE POLICY "Admins can view evaluare events"
  ON public.evaluare_section_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));