-- Add follow_up_date column to leads table
ALTER TABLE public.leads 
ADD COLUMN follow_up_date timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of due follow-ups
CREATE INDEX idx_leads_follow_up_date ON public.leads(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Add RLS policy to allow admins to update leads (for setting follow_up_date)
CREATE POLICY "Admins can update leads" 
ON public.leads 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));