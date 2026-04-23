CREATE TABLE public.voice_agent_script_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.voice_agent_scripts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  notes TEXT,
  language TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_id, version_number)
);

CREATE INDEX voice_agent_script_versions_script_idx
  ON public.voice_agent_script_versions (script_id, version_number DESC);

ALTER TABLE public.voice_agent_script_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read script versions"
  ON public.voice_agent_script_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert script versions"
  ON public.voice_agent_script_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.snapshot_voice_agent_script()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_v INTEGER;
BEGIN
  -- Skip if nothing meaningful changed
  IF TG_OP = 'UPDATE'
     AND NEW.system_prompt = OLD.system_prompt
     AND NEW.name = OLD.name
     AND COALESCE(NEW.notes, '') = COALESCE(OLD.notes, '') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_v
  FROM public.voice_agent_script_versions
  WHERE script_id = NEW.id;

  INSERT INTO public.voice_agent_script_versions
    (script_id, version_number, name, system_prompt, notes, language, created_by)
  VALUES
    (NEW.id, next_v, NEW.name, NEW.system_prompt, NEW.notes, NEW.language,
     COALESCE(NEW.created_by, auth.uid()));

  RETURN NEW;
END;
$$;

CREATE TRIGGER voice_agent_scripts_snapshot
  AFTER INSERT OR UPDATE ON public.voice_agent_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_voice_agent_script();

-- Seed initial v1 for existing scripts
INSERT INTO public.voice_agent_script_versions
  (script_id, version_number, name, system_prompt, notes, language, created_by)
SELECT id, 1, name, system_prompt, notes, language, created_by
FROM public.voice_agent_scripts
WHERE NOT EXISTS (
  SELECT 1 FROM public.voice_agent_script_versions v WHERE v.script_id = voice_agent_scripts.id
);