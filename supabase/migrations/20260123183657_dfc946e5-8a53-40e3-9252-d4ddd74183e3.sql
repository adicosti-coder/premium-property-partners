-- Add English translation columns to blog_articles table
ALTER TABLE public.blog_articles 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
ADD COLUMN IF NOT EXISTS content_en TEXT;