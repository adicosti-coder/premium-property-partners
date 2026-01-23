-- Create referrals table for tracking friend recommendations
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Referrer info (person who recommends)
  referrer_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL,
  referrer_phone TEXT,
  referrer_user_id UUID REFERENCES auth.users(id),
  
  -- Referred owner info (apartment owner)
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_message TEXT,
  
  -- Property info (optional details about the apartment)
  property_location TEXT,
  property_type TEXT,
  property_rooms INTEGER,
  
  -- Tracking and status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, contacted, meeting_scheduled, contract_signed, reward_granted, rejected
  
  admin_notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  meeting_date TIMESTAMP WITH TIME ZONE,
  contract_signed_at TIMESTAMP WITH TIME ZONE,
  reward_granted_at TIMESTAMP WITH TIME ZONE,
  
  -- Reward details
  reward_property_id UUID REFERENCES public.properties(id),
  reward_check_in DATE,
  reward_check_out DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can submit a referral
CREATE POLICY "Anyone can submit referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- Users can view their own referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (referrer_email = auth.jwt()->>'email' OR referrer_user_id = auth.uid());

-- Admins can manage all referrals
CREATE POLICY "Admins can manage referrals"
ON public.referrals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_referrer_email ON public.referrals(referrer_email);

-- Create function to update timestamps
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();