-- Add investment-related columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status_operativ text DEFAULT 'cazare',
ADD COLUMN IF NOT EXISTS estimated_revenue text,
ADD COLUMN IF NOT EXISTS roi_percentage text;