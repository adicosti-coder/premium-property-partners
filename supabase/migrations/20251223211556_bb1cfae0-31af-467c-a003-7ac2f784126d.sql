-- Create leads table for property calculator
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  property_area INTEGER NOT NULL,
  property_type TEXT NOT NULL,
  calculated_net_profit INTEGER NOT NULL,
  calculated_yearly_profit INTEGER NOT NULL,
  simulation_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert (anyone can submit a lead)
CREATE POLICY "Anyone can submit a lead" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Create policy for reading leads (only admins should read, but for now we'll restrict)
-- No SELECT policy = no public read access