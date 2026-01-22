-- Create table to track sent follow-up emails
CREATE TABLE public.simulation_followup_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  simulation_id UUID REFERENCES public.user_simulations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL DEFAULT 'first_followup',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulation_followup_emails ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage this table (edge function)
CREATE POLICY "Service role can manage followup emails"
ON public.simulation_followup_emails
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for efficient queries
CREATE INDEX idx_followup_emails_user_id ON public.simulation_followup_emails(user_id);
CREATE INDEX idx_followup_emails_email_type ON public.simulation_followup_emails(email_type);