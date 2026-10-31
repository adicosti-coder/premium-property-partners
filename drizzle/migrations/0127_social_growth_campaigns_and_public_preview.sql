CREATE TABLE public.social_campaign_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,10) CHECK (slug ~ '^[a-z0-9-]{4,40}$'),
 title text NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
 destination text NOT NULL CHECK (destination IN ('owners_guide','calculator','instagram','facebook','stay')),
 platform text NOT NULL CHECK (platform IN ('instagram','facebook','whatsapp')),
 campaign text NOT NULL CHECK (campaign ~ '^[a-z0-9_-]{1,80}$'),
 active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_campaign_links TO authenticated;
GRANT ALL ON public.social_campaign_links TO service_role;
ALTER TABLE public.social_campaign_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_campaign_admin ON public.social_campaign_links FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE FUNCTION public.resolve_social_campaign(p_slug text) RETURNS TABLE(title text,destination text,platform text,campaign text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT title,destination,platform,campaign FROM public.social_campaign_links WHERE slug=p_slug AND active AND p_slug ~ '^[a-z0-9-]{4,40}$' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_social_campaign(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_social_campaign(text) TO anon,authenticated,service_role;
CREATE FUNCTION public.public_social_preview() RETURNS TABLE(id uuid,title text,image_url text,source_url text,posted_to text[],published_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT id,title,image_url,source_url,posted_to,updated_at FROM public.social_posts WHERE status='posted' AND cardinality(posted_to)>0 AND media_type IN ('IMAGE','CAROUSEL') AND image_url ~ '^https://' ORDER BY updated_at DESC LIMIT 3;
$$;
REVOKE ALL ON FUNCTION public.public_social_preview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_social_preview() TO anon,authenticated,service_role;