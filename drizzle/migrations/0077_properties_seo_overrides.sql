ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title text, ADD COLUMN IF NOT EXISTS seo_description text;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;