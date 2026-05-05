-- 1. Smart Lead Clusters
CREATE TABLE public.voice_lead_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  brief TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  approach_tone TEXT,
  lead_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_lead_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage clusters" ON public.voice_lead_clusters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.voice_lead_cluster_assignments (
  cluster_id UUID NOT NULL REFERENCES public.voice_lead_clusters(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cluster_id, prospect_id)
);
ALTER TABLE public.voice_lead_cluster_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cluster assignments" ON public.voice_lead_cluster_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_cluster_assign_prospect ON public.voice_lead_cluster_assignments(prospect_id);

-- 2. A/B Script Tests
CREATE TABLE public.voice_script_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hypothesis TEXT,
  variant_a_script_id UUID REFERENCES public.voice_agent_scripts(id) ON DELETE SET NULL,
  variant_b_script_id UUID REFERENCES public.voice_agent_scripts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running|paused|finished
  winner TEXT, -- A|B|tie
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_script_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage AB tests" ON public.voice_script_ab_tests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- 3. Ghosting Queue (Last Chance)
CREATE TABLE public.voice_ghosting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospect_listings(id) ON DELETE CASCADE,
  caller_profile_id UUID REFERENCES public.voice_caller_profiles(id) ON DELETE SET NULL,
  phone_normalized TEXT,
  no_answer_count INTEGER NOT NULL DEFAULT 3,
  context_summary TEXT,
  draft_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|sent|rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_ghosting_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ghosting queue" ON public.voice_ghosting_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_ghosting_status ON public.voice_ghosting_queue(status, created_at DESC);

-- Add ghosting tag to caller profiles
ALTER TABLE public.voice_caller_profiles
  ADD COLUMN IF NOT EXISTS is_ghosting BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consecutive_no_answer INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_no_answer_at TIMESTAMPTZ;

-- updated_at trigger
CREATE TRIGGER trg_voice_lead_clusters_updated
  BEFORE UPDATE ON public.voice_lead_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();