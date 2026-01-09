-- Create table for lead notes/follow-ups
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Admins can manage lead notes
CREATE POLICY "Admins can manage lead notes"
ON public.lead_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created_at ON public.lead_notes(created_at DESC);