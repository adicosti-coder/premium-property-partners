CREATE OR REPLACE FUNCTION public.social_content_key(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT lower(regexp_replace(regexp_replace(regexp_replace(coalesce(value,''), '://www\.', '://'), '[?#].*$', ''), '/$', ''));
$$;
CREATE OR REPLACE FUNCTION public.prevent_published_social_draft()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.status = 'posted' AND NEW.status <> 'posted' THEN
  NEW.status := 'posted'; NEW.scheduled_at := NULL;
 END IF;
 IF NEW.status IN ('draft','scheduled') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(public.social_content_key(NEW.source_url), 0));
  IF cardinality(NEW.posted_to) > 0 THEN
   NEW.status := 'posted'; NEW.scheduled_at := NULL;
  ELSIF EXISTS (SELECT 1 FROM public.social_posts p WHERE p.id <> NEW.id AND p.status = 'posted' AND (public.social_content_key(p.source_url) = public.social_content_key(NEW.source_url) OR (p.type = NEW.type AND lower(trim(p.title)) = lower(trim(NEW.title)) AND trim(NEW.title) <> '')))
   OR EXISTS (SELECT 1 FROM public.social_autopost_logs l WHERE l.status = 'posted' AND NEW.property_id IS NOT NULL AND l.property_id = NEW.property_id) THEN
   RETURN NULL;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_published_social_draft() FROM PUBLIC;
CREATE TRIGGER trg_prevent_published_social_draft BEFORE INSERT OR UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.prevent_published_social_draft();
CREATE OR REPLACE FUNCTION public.remove_published_social_sibling_drafts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.status = 'posted' THEN
  DELETE FROM public.social_posts d WHERE d.id <> NEW.id AND d.status = 'draft' AND cardinality(d.posted_to) = 0 AND (public.social_content_key(d.source_url) = public.social_content_key(NEW.source_url) OR (d.type = NEW.type AND lower(trim(d.title)) = lower(trim(NEW.title)) AND trim(NEW.title) <> ''));
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_published_social_sibling_drafts() FROM PUBLIC;
CREATE TRIGGER trg_remove_published_social_sibling_drafts AFTER INSERT OR UPDATE OF status ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.remove_published_social_sibling_drafts();