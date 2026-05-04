
CREATE TABLE IF NOT EXISTS public.voice_agent_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  zone TEXT,
  listing_type TEXT,
  source TEXT NOT NULL DEFAULT 'scraper_aggregate',
  confidence NUMERIC DEFAULT 1.0,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vakc_zone ON public.voice_agent_knowledge_chunks(zone);
CREATE INDEX IF NOT EXISTS idx_vakc_listing_type ON public.voice_agent_knowledge_chunks(listing_type);
CREATE INDEX IF NOT EXISTS idx_vakc_tags ON public.voice_agent_knowledge_chunks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vakc_refreshed ON public.voice_agent_knowledge_chunks(refreshed_at DESC);

ALTER TABLE public.voice_agent_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read knowledge chunks"
ON public.voice_agent_knowledge_chunks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage knowledge chunks"
ON public.voice_agent_knowledge_chunks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
