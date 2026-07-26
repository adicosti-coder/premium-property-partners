
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  language text NOT NULL DEFAULT 'ro',
  category text NOT NULL DEFAULT 'UTILITY',
  status text NOT NULL DEFAULT 'active',
  body_preview text NOT NULL,
  variables_help text,
  variable_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, language)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_templates TO authenticated;
GRANT ALL ON public.wa_templates TO service_role;

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wa_templates"
  ON public.wa_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_wa_templates_updated_at ON public.wa_templates;
CREATE TRIGGER trg_wa_templates_updated_at
  BEFORE UPDATE ON public.wa_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS opened_by_template text,
  ADD COLUMN IF NOT EXISTS opened_by_admin uuid;

-- Seed câteva șabloane comune (Meta trebuie să le aprobe separat; aici sunt doar înregistrări locale)
INSERT INTO public.wa_templates (name, language, category, body_preview, variables_help, variable_count)
VALUES
  ('realtrust_first_touch', 'ro', 'MARKETING',
   'Bună ziua, {{1}}! Sunt Andrei de la RealTrust Timișoara. Am văzut anunțul dvs. pentru {{2}} și aș avea câteva întrebări scurte. E ok să discutăm aici?',
   '{{1}} = nume proprietar, {{2}} = tip proprietate/zonă', 2),
  ('realtrust_followup_24h', 'ro', 'UTILITY',
   'Bună, {{1}}! Reveneam pe scurt legat de proprietatea din {{2}}. Mai e disponibilă?',
   '{{1}} = nume, {{2}} = zonă', 2),
  ('realtrust_call_scheduled', 'ro', 'UTILITY',
   'Bună, {{1}}! Vă sun în {{2}} de pe numărul nostru RealTrust. Dacă preferați altă oră, spuneți-mi aici.',
   '{{1}} = nume, {{2}} = interval', 2)
ON CONFLICT (name, language) DO NOTHING;
