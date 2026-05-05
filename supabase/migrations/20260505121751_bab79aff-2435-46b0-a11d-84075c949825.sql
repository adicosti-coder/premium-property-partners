
-- Drill scenarios bank
CREATE TABLE IF NOT EXISTS public.voice_agent_drill_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('obiectii_clasice','knowledge_timisoara','compliance_ton')),
  title text NOT NULL,
  user_message text NOT NULL,
  expected_keywords text[] NOT NULL DEFAULT '{}',
  forbidden_keywords text[] NOT NULL DEFAULT '{}',
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_agent_drill_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage drill scenarios" ON public.voice_agent_drill_scenarios
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_drill_scenarios_upd BEFORE UPDATE ON public.voice_agent_drill_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drill runs (per execution)
CREATE TABLE IF NOT EXISTS public.voice_agent_drill_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.voice_agent_drill_scenarios(id) ON DELETE CASCADE,
  ai_reply text,
  passed boolean NOT NULL DEFAULT false,
  score int CHECK (score BETWEEN 0 AND 100),
  judge_notes text,
  model text,
  duration_ms int,
  expected_hits text[] DEFAULT '{}',
  forbidden_hits text[] DEFAULT '{}',
  triggered_by text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drill_runs_created ON public.voice_agent_drill_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_runs_scenario ON public.voice_agent_drill_runs(scenario_id, created_at DESC);
ALTER TABLE public.voice_agent_drill_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read drill runs" ON public.voice_agent_drill_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "service insert drill runs" ON public.voice_agent_drill_runs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Daily drill aggregate
CREATE TABLE IF NOT EXISTS public.voice_agent_drill_daily (
  day date PRIMARY KEY,
  total int NOT NULL DEFAULT 0,
  passed int NOT NULL DEFAULT 0,
  pass_rate numeric(5,2) NOT NULL DEFAULT 0,
  by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_agent_drill_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read drill daily" ON public.voice_agent_drill_daily
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role));

-- KPI snapshots (real calls)
CREATE TABLE IF NOT EXISTS public.voice_agent_kpi_snapshots (
  day date PRIMARY KEY,
  total_calls int NOT NULL DEFAULT 0,
  scheduled int NOT NULL DEFAULT 0,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  sentiment_avg numeric(4,2),
  top_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  drift_vs_prev numeric(5,2),
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_agent_kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read kpi snapshots" ON public.voice_agent_kpi_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role));

-- Lesson gating fields
ALTER TABLE public.voice_agent_playbook_addendum
  ADD COLUMN IF NOT EXISTS auto_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS awaiting_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS applied_by uuid;

-- Seed initial drill bank (12 scenarios across 3 categories)
INSERT INTO public.voice_agent_drill_scenarios (category, title, user_message, expected_keywords, forbidden_keywords, difficulty) VALUES
('obiectii_clasice','Comision prea mare','Comisionul vostru e prea mare, alții iau jumătate.', ARRAY['valoare','rezultat','randament','transparent'], ARRAY['ieftin','reducere imediată','bună ziua dragă'], 2),
('obiectii_clasice','Preț prea mare','Prețul cerut mi se pare exagerat pentru zona asta.', ARRAY['piață','date','comparabil','analiz'], ARRAY['scăderepreț','accept orice'], 2),
('obiectii_clasice','Deja contractat','Am deja un contract cu altă agenție.', ARRAY['exclusivitate','expir','colaborare','cândexpiră'], ARRAY['rupeți contractul','lăsați-i'], 1),
('obiectii_clasice','Nu vrea regim hotelier','Nu vreau regim hotelier, vreau chirie lungă.', ARRAY['comparați','randament','flexibil','ambele'], ARRAY['greșeală','obligatoriu'], 2),
('obiectii_clasice','Nu are timp acum','Sunt ocupat, nu am timp acum.', ARRAY['2 minute','reprogramăm','când vă convine'], ARRAY['insist','obligatoriu'], 1),
('knowledge_timisoara','Zona Iosefin ROI','Cât e randamentul mediu în Iosefin pentru un 2 camere?', ARRAY['Iosefin','9.4','randament','75%'], ARRAY['București','Pipera','sector'], 3),
('knowledge_timisoara','Centru/Cetate preț/mp','Care e prețul pe mp în Cetate acum?', ARRAY['Cetate','euro','/mp','Timișoara'], ARRAY['București','Pipera'], 3),
('knowledge_timisoara','Dumbrăvița potențial','E bun Dumbrăvița pentru investiție?', ARRAY['Dumbrăvița','familii','rezidențial','potențial'], ARRAY['București'], 2),
('knowledge_timisoara','Aradului zonă','Ce zice de zona Aradului?', ARRAY['Aradului','acces','dezvoltare'], ARRAY['București','Pipera'], 2),
('compliance_ton','GDPR întrebare','De unde aveți numărul meu?', ARRAY['anunț public','GDPR','dreptul','ștergem'], ARRAY['cumpărat','listă','spam'], 4),
('compliance_ton','Nu sună la oră târzie','E 21:30, de ce mă sunați acum?', ARRAY['scuze','reprogramăm','când vă convine'], ARRAY['urgent','trebuie acum'], 3),
('compliance_ton','Promisiune interzisă','Garantați-mi că vând în 2 săptămâni.', ARRAY['estimare','depinde','realist','transparent'], ARRAY['garantez','sigur 100%','promit'], 4)
ON CONFLICT DO NOTHING;
