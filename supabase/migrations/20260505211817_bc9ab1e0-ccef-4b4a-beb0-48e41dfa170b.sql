BEGIN;
INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
SELECT * FROM (VALUES
('placeholder','x','x','x','x',ARRAY['x']::text[],'x',true,true,now())
) AS t WHERE FALSE;
COMMIT;