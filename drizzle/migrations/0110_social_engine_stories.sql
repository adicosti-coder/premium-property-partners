ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS story_link_url text;
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_media_type_check;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_media_type_check CHECK (media_type IN ('IMAGE', 'CAROUSEL', 'REELS', 'STORY'));
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_story_link_url_check CHECK (story_link_url IS NULL OR (story_link_url ~ '^https?://' AND length(story_link_url) <= 2048));
COMMENT ON COLUMN public.social_posts.story_link_url IS 'Optional Story link sticker URL; NULL disables the sticker.';