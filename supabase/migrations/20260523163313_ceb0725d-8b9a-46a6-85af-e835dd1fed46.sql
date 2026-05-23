ALTER TABLE public.listing_import_learnings
  DROP CONSTRAINT IF EXISTS listing_import_learnings_pattern_type_check;

ALTER TABLE public.listing_import_learnings
  ADD CONSTRAINT listing_import_learnings_pattern_type_check
  CHECK (pattern_type = ANY (ARRAY[
    'phrase'::text,
    'title_hint'::text,
    'description_hint'::text,
    'source_blacklist'::text,
    'semantic_concept'::text
  ]));

ALTER TABLE public.listing_import_learnings
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.listing_import_system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  compiled_prompt text NOT NULL,
  hints_count integer NOT NULL DEFAULT 0,
  forbidden_count integer NOT NULL DEFAULT 0,
  semantic_count integer NOT NULL DEFAULT 0,
  generated_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_lisp_active ON public.listing_import_system_prompts (is_active, created_at DESC);

ALTER TABLE public.listing_import_system_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin all listing_import_system_prompts" ON public.listing_import_system_prompts;
CREATE POLICY "admin all listing_import_system_prompts"
  ON public.listing_import_system_prompts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));