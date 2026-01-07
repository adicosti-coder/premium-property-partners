-- Create storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-videos', 'hero-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to hero videos
CREATE POLICY "Public can view hero videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'hero-videos');

-- Allow admins to upload hero videos
CREATE POLICY "Admins can upload hero videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hero-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update hero videos
CREATE POLICY "Admins can update hero videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'hero-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete hero videos
CREATE POLICY "Admins can delete hero videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'hero-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create site_settings table for storing hero video URL and other settings
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_video_url TEXT,
  hero_video_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.site_settings (id, hero_video_url, hero_video_filename)
VALUES ('default', '/hero-video.mp4', 'hero-video.mp4')
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();