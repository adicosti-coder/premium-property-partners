ALTER TABLE public.social_posts DROP CONSTRAINT social_posts_status_check;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_status_check CHECK (status IN ('draft','scheduled','posting','posted'));
COMMENT ON COLUMN public.social_posts.status IS 'posting is an atomic in-progress claim, never evidence of publication; posted requires confirmed platform delivery.';
CREATE OR REPLACE FUNCTION public.prevent_published_social_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.status = 'posted' AND NEW.status <> 'posted' THEN
  IF cardinality(OLD.posted_to) > 0 OR NEW.last_error IS NULL THEN
   NEW.status := 'posted'; NEW.scheduled_at := NULL;
  END IF;
 END IF;
 IF NEW.status IN ('draft','scheduled','posting') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(public.social_content_key(NEW.source_url), 0));
  IF cardinality(NEW.posted_to) > 0 AND NEW.status <> 'posting' THEN
   NEW.status := 'posted'; NEW.scheduled_at := NULL;
  ELSIF EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id <> NEW.id AND p.status = 'posted' AND (public.social_content_key(p.source_url) = public.social_content_key(NEW.source_url) OR (p.type = NEW.type AND lower(trim(p.title)) = lower(trim(NEW.title)) AND trim(NEW.title) <> '')))
   OR EXISTS (SELECT 1 FROM public.social_autopost_logs l WHERE l.status = 'posted' AND l.external_id IS NOT NULL AND NEW.property_id IS NOT NULL AND l.property_id = NEW.property_id) THEN
   RETURN NULL;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_published_social_draft() FROM PUBLIC;