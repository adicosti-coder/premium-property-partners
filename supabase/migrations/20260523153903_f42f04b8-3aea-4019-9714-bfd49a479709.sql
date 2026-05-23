
-- 1. Add import tracking columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_source_url text,
  ADD COLUMN IF NOT EXISTS original_description_raw text,
  ADD COLUMN IF NOT EXISTS sanitization_log jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS migrated_from_prospect_id uuid;

CREATE INDEX IF NOT EXISTS idx_properties_needs_review ON public.properties(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_properties_import_source ON public.properties(import_source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_original_source_url ON public.properties(original_source_url) WHERE original_source_url IS NOT NULL;

-- 2. Config table for forbidden phrases / refusal phrases
CREATE TABLE IF NOT EXISTS public.listing_import_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('forbidden_phrase', 'refusal_phrase', 'replacement_phrase')),
  pattern text NOT NULL,
  replacement text DEFAULT '',
  is_regex boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_import_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage listing import config"
  ON public.listing_import_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_listing_import_config_updated
  BEFORE UPDATE ON public.listing_import_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.listing_import_config(kind, pattern, is_regex, replacement, notes) VALUES
  ('forbidden_phrase', 'proprietar', false, '', 'word "proprietar" — agency site rule'),
  ('forbidden_phrase', 'proprietari', false, '', ''),
  ('forbidden_phrase', 'persoana fizica', false, '', ''),
  ('forbidden_phrase', 'persoană fizică', false, '', ''),
  ('forbidden_phrase', 'persoane fizice', false, '', ''),
  ('forbidden_phrase', 'fara comision', false, '', ''),
  ('forbidden_phrase', 'fără comision', false, '', ''),
  ('forbidden_phrase', 'comision 0', false, '', ''),
  ('forbidden_phrase', 'comision zero', false, '', ''),
  ('forbidden_phrase', 'direct proprietar', false, '', ''),
  ('forbidden_phrase', 'de la proprietar', false, '', ''),
  ('forbidden_phrase', 'fara intermediar', false, '', ''),
  ('forbidden_phrase', 'fără intermediar', false, '', ''),
  ('forbidden_phrase', 'no commission', false, '', ''),
  ('refusal_phrase', 'nu colaborez cu agentii', false, '', 'reject listing'),
  ('refusal_phrase', 'nu colaborez cu agenții', false, '', ''),
  ('refusal_phrase', 'fara agentii', false, '', ''),
  ('refusal_phrase', 'fără agenții', false, '', ''),
  ('refusal_phrase', 'rog agentii abtineti-va', false, '', ''),
  ('refusal_phrase', 'rog agenții abțineți-vă', false, '', ''),
  ('refusal_phrase', 'rog seriozitate fara agentii', false, '', ''),
  ('refusal_phrase', 'no agencies', false, '', ''),
  ('refusal_phrase', 'no agents', false, '', ''),
  ('refusal_phrase', 'agentii abtineti-va', false, '', ''),
  ('refusal_phrase', 'agenți abțineți-vă', false, '', ''),
  ('refusal_phrase', 'nu sunt de acord cu agentii', false, '', ''),
  ('refusal_phrase', 'nu accept agentii', false, '', ''),
  ('refusal_phrase', 'nu accept agenții', false, '', '')
ON CONFLICT DO NOTHING;
