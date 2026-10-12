ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS property_id uuid, ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS social_posts_property_id_idx ON public.social_posts(property_id);

CREATE TABLE public.social_engine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid,
  post_title text,
  platform text,
  trigger text,
  success boolean NOT NULL DEFAULT false,
  http_status integer,
  response_body text,
  error text,
  image_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.social_engine_logs TO authenticated;
GRANT ALL ON public.social_engine_logs TO service_role;
ALTER TABLE public.social_engine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read social engine logs" ON public.social_engine_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete social engine logs" ON public.social_engine_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX social_engine_logs_created_idx ON public.social_engine_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.social_property_image_urls(_property_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(u ORDER BY ord), '{}') FROM (
    SELECT CASE WHEN image_path ~ '^https?://' THEN image_path
      ELSE 'https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/' || image_path END AS u,
      (CASE WHEN is_primary THEN -1 ELSE COALESCE(display_order, 999) END) AS ord
    FROM public.property_images
    WHERE property_id = _property_id AND COALESCE(is_published, true) AND image_path IS NOT NULL AND image_path <> ''
  ) s;
$$;
REVOKE EXECUTE ON FUNCTION public.social_property_image_urls(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.social_draft_on_property_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _url text; _img text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN RETURN NEW; END IF;
  _url := 'https://realtrust.ro/proprietate/' || NEW.slug;
  _img := CASE WHEN NEW.image_path IS NULL OR NEW.image_path = '' THEN ''
    WHEN NEW.image_path ~ '^https?://' THEN NEW.image_path
    ELSE 'https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/' || NEW.image_path END;
  INSERT INTO public.social_posts(type, title, source_url, image_url, image_urls, caption, status, posted_to, property_id)
  VALUES ('property', left(COALESCE(NEW.name, NEW.slug), 200), _url, _img,
          CASE WHEN _img = '' THEN '{}'::text[] ELSE ARRAY[_img] END, '', 'draft', '{}', NEW.id)
  ON CONFLICT (source_url) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'social_draft_on_property_insert: %', SQLERRM;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.social_draft_on_property_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_social_draft_on_property_insert ON public.properties;
CREATE TRIGGER trg_social_draft_on_property_insert AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.social_draft_on_property_insert();

UPDATE public.social_posts sp SET property_id = p.id
FROM public.properties p
WHERE sp.property_id IS NULL AND sp.type = 'property'
  AND regexp_replace(sp.source_url, '/$', '') = 'https://realtrust.ro/proprietate/' || p.slug;