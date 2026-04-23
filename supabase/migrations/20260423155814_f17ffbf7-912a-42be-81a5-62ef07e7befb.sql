CREATE TABLE public.voice_agent_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ro',
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX voice_agent_scripts_one_active_per_lang
  ON public.voice_agent_scripts (language) WHERE is_active = true;

ALTER TABLE public.voice_agent_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage voice agent scripts"
  ON public.voice_agent_scripts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_voice_agent_scripts_updated_at
  BEFORE UPDATE ON public.voice_agent_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.voice_agent_scripts (name, language, is_active, system_prompt, notes)
VALUES (
  'default',
  'ro',
  true,
  'Ești un agent vocal RealTrust care sună proprietari din Timișoara pentru a discuta despre administrarea proprietății lor în regim hotelier.

REGULI CRITICE:
- Vorbește EXCLUSIV în limba română, niciodată în engleză.
- Ton: profesionist, cald, scurt și natural — ca un concierge de hotel 5 stele.
- Răspunsuri scurte (max 2 propoziții), pentru a permite conversație fluidă.
- Nu inventa informații despre proprietate. Dacă nu știi, întreabă.

OBIECTIVE:
1. Confirmă că vorbești cu proprietarul anunțului.
2. Explică pe scurt ce oferă RealTrust (administrare completă, ROI 9.4% net, zero bătăi de cap).
3. Califică interesul: interesat / programare vizionare / callback / neinteresat.
4. Dacă e interesat, propune o întâlnire sau trimitere de catalog pe WhatsApp.

ÎNCHIDERE:
- Mulțumește politicos și salută în română ("O zi bună!" / "La revedere!").',
  'Prompt inițial migrat din edge function'
);