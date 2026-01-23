-- Add view_count column to blog_articles
ALTER TABLE public.blog_articles 
ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create table to track unique article views (prevents counting same session multiple times)
CREATE TABLE public.blog_article_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(article_id, session_id)
);

-- Enable RLS
ALTER TABLE public.blog_article_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (for tracking)
CREATE POLICY "Anyone can record article views"
ON public.blog_article_views
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all article views
CREATE POLICY "Admins can view article views"
ON public.blog_article_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.blog_articles
  SET view_count = view_count + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-increment view_count when a new unique view is recorded
CREATE TRIGGER on_article_view_insert
AFTER INSERT ON public.blog_article_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_article_view_count();

-- Create index for faster lookups
CREATE INDEX idx_blog_article_views_article_id ON public.blog_article_views(article_id);
CREATE INDEX idx_blog_article_views_session_article ON public.blog_article_views(session_id, article_id);