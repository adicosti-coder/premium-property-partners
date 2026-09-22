-- 1. property_images: hide unpublished/draft images from public reads
DROP POLICY IF EXISTS "Property images are publicly readable" ON public.property_images;
CREATE POLICY "Published property images are readable"
ON public.property_images
FOR SELECT
USING (is_published IS TRUE OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. property_live_data: hide rows with internal scrape errors
DROP POLICY IF EXISTS "Anyone can read live data" ON public.property_live_data;
CREATE POLICY "Healthy live data is readable"
ON public.property_live_data
FOR SELECT
USING (scrape_error IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. contest_periods: only active or already-announced contests are public
DROP POLICY IF EXISTS "Contest periods are publicly readable" ON public.contest_periods;
CREATE POLICY "Active contest periods are readable"
ON public.contest_periods
FOR SELECT
USING (
  is_active IS TRUE
  OR winner_announced_at IS NOT NULL
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. community_article_comments: only comments on approved/published articles (plus own + admin)
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.community_article_comments;
CREATE POLICY "Comments on published articles are readable"
ON public.community_article_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_article_submissions s
    WHERE s.id = community_article_comments.submission_id
      AND s.status IN ('approved', 'published')
  )
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. public_site_settings: only the live settings row is public
DROP POLICY IF EXISTS "Anyone can read public site settings" ON public.public_site_settings;
CREATE POLICY "Live public site settings are readable"
ON public.public_site_settings
FOR SELECT
TO anon, authenticated
USING (id = 'default' OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6. image_caption_cache: only rows that actually hold a caption
DROP POLICY IF EXISTS "Allow public read" ON public.image_caption_cache;
CREATE POLICY "Captions with content are readable"
ON public.image_caption_cache
FOR SELECT
TO anon, authenticated
USING (caption IS NOT NULL AND length(btrim(caption)) > 0);
