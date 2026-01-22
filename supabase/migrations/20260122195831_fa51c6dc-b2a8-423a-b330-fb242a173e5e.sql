-- Add name and description columns to shared_poi_links
ALTER TABLE public.shared_poi_links 
ADD COLUMN name text,
ADD COLUMN description text;