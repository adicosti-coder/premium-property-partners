CREATE OR REPLACE FUNCTION public.prevent_published_social_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.status = 'posted' AND NEW.status NOT IN ('posted','posting') THEN
  IF cardinality(OLD.posted_to) > 0 OR NEW.last_error IS NULL THEN
   NEW.status := 'posted'; NEW.scheduled_at := NULL;
  END IF;
 END IF;
 IF NEW.status IN ('draft','scheduled','posting') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(public.social_content_key(NEW.source_url), 0));
  IF cardinality(NEW.posted_to) > 0 AND NEW.status <> 'posting' THEN
   NEW.status := 'posted'; NEW.scheduled_at := NULL;
  ELSIF EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id <> NEW.id AND p.status = 'posted' AND (public.social_content_key(p.source_url) = public.social_content_key(NEW.source_url) OR (p.type = NEW.type AND lower(trim(p.title)) = lower(trim(NEW.title)) AND trim(NEW.title) <> '')))
   OR (TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.social_autopost_logs l WHERE l.status = 'posted' AND l.external_id IS NOT NULL AND NEW.property_id IS NOT NULL AND l.property_id = NEW.property_id)) THEN
   RETURN NULL;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_published_social_draft() FROM PUBLIC;