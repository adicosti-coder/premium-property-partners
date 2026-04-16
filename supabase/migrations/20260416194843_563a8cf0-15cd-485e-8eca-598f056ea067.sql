
CREATE TABLE IF NOT EXISTS public.visitor_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_properties jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_min numeric,
  budget_max numeric,
  preferred_neighborhoods text[] DEFAULT '{}',
  preferred_listing_type text,
  preferred_rooms int,
  chatbot_summary text,
  last_intent text,
  lead_score int DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_memory_session ON public.visitor_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_memory_user ON public.visitor_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_memory_lead_score ON public.visitor_memory(lead_score DESC);

ALTER TABLE public.visitor_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visitor memory"
  ON public.visitor_memory FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read visitor memory by session"
  ON public.visitor_memory FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update own visitor memory"
  ON public.visitor_memory FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete visitor memory"
  ON public.visitor_memory FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_visitor_memory_updated_at
  BEFORE UPDATE ON public.visitor_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
