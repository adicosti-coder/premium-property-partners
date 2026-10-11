CREATE TABLE public.voice_call_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE,
  source text NOT NULL DEFAULT 'real_call',
  to_number text,
  outcome text,
  score int,
  strengths jsonb NOT NULL DEFAULT '[]',
  weaknesses jsonb NOT NULL DEFAULT '[]',
  objections jsonb NOT NULL DEFAULT '[]',
  prompt_fixes jsonb NOT NULL DEFAULT '[]',
  applied_lessons jsonb NOT NULL DEFAULT '[]',
  transcript text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.voice_call_analyses TO authenticated;
GRANT ALL ON public.voice_call_analyses TO service_role;
ALTER TABLE public.voice_call_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read call analyses" ON public.voice_call_analyses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

UPDATE public.voice_agent_scripts SET system_prompt = replace(replace(replace(replace(system_prompt,
 'Vânzare Strategică: Pregătim activul pentru o tranzacție discretă către rețeaua noastră privată de cumpărători, evitând expunerea publică inutilă.',
 'Vânzare: Analiză gratuită de preț pe baza anunțurilor comparabile din zonă și promovare gratuită pe realtrust.ro, doar cu acordul dumneavoastră.'),
 'cu randamente de peste 9% și administrare hotelieră completă',
 'cu management complet în regim hotelier sau hibrid și un randament net estimat între 6,5% și 9,4% pe an'),
 'un exit strategic prin vânzare premium', 'o vânzare la un preț corect de piață'),
 'pregătirea pentru portofoliul nostru de investitori activi', 'o analiză gratuită a prețului față de proprietăți similare din zonă')
WHERE is_active;