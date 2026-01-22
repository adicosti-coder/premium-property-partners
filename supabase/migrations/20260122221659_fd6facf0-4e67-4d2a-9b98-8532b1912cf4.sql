-- Create table for A/B test configurations
CREATE TABLE public.email_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL, -- 'first_followup' or 'second_followup'
  variant_a_subject TEXT NOT NULL,
  variant_b_subject TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking which variant each user received
CREATE TABLE public.email_ab_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID NOT NULL REFERENCES public.email_ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  subject_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking email opens
CREATE TABLE public.email_open_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  followup_email_id UUID REFERENCES public.simulation_followup_emails(id),
  ab_assignment_id UUID REFERENCES public.email_ab_assignments(id),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.email_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_ab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_open_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for email_ab_tests
CREATE POLICY "Admins can manage A/B tests" ON public.email_ab_tests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read A/B tests" ON public.email_ab_tests
  FOR SELECT USING (true);

-- Policies for email_ab_assignments (service role only via false policies)
CREATE POLICY "Service role can manage assignments" ON public.email_ab_assignments
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Admins can view assignments" ON public.email_ab_assignments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for email_open_tracking
CREATE POLICY "Service role can manage open tracking" ON public.email_open_tracking
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Admins can view open tracking" ON public.email_open_tracking
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_ab_tests_email_type ON public.email_ab_tests(email_type, is_active);
CREATE INDEX idx_ab_assignments_test_id ON public.email_ab_assignments(test_id);
CREATE INDEX idx_ab_assignments_user_id ON public.email_ab_assignments(user_id);
CREATE INDEX idx_email_opens_assignment ON public.email_open_tracking(ab_assignment_id);

-- Insert default A/B tests
INSERT INTO public.email_ab_tests (email_type, variant_a_subject, variant_b_subject) VALUES
('first_followup', '🏠 Ai văzut câți bani poți câștiga din apartamentul tău?', '💰 Nu uita de simularea ta - vezi potențialul real al proprietății!'),
('second_followup', '🎁 Ofertă specială: +10% bonus la veniturile tale din închiriere', '⏰ Ultima șansă: Bonus exclusiv pentru proprietatea ta!');