-- Add is_read column to leads table
ALTER TABLE public.leads 
ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster filtering
CREATE INDEX idx_leads_is_read ON public.leads(is_read);