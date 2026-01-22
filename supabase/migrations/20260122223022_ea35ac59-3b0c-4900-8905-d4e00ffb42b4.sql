
-- Add column for weekly report recipients
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS weekly_report_recipients text[] DEFAULT ARRAY['contact@realtrust.ro'];

-- Add column to enable/disable weekly reports
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean DEFAULT true;
