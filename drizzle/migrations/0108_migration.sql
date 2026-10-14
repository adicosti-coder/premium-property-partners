ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'IMAGE',
  ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_media_type_check;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_media_type_check CHECK (media_type IN ('IMAGE','CAROUSEL','REELS'));
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_video_url_check;
ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_video_url_check CHECK (video_url IS NULL OR (video_url ~ '^https://' AND length(video_url) <= 2048));