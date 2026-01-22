-- Create table for advanced calculator simulations
CREATE TABLE public.advanced_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario TEXT NOT NULL DEFAULT 'piata',
  classic_rent NUMERIC NOT NULL DEFAULT 0,
  nightly_rate NUMERIC NOT NULL DEFAULT 0,
  occupancy_without_system NUMERIC NOT NULL DEFAULT 0,
  rate_uplift NUMERIC NOT NULL DEFAULT 0,
  occupancy_uplift NUMERIC NOT NULL DEFAULT 0,
  platform_commission NUMERIC NOT NULL DEFAULT 0,
  payment_processing_fee NUMERIC NOT NULL DEFAULT 0,
  cleaning_cost_per_stay NUMERIC NOT NULL DEFAULT 0,
  average_stay_duration NUMERIC NOT NULL DEFAULT 0,
  monthly_fixed_costs NUMERIC NOT NULL DEFAULT 0,
  management_fee NUMERIC NOT NULL DEFAULT 0,
  net_without_system NUMERIC NOT NULL DEFAULT 0,
  net_with_system NUMERIC NOT NULL DEFAULT 0,
  diff_vs_classic NUMERIC NOT NULL DEFAULT 0,
  percent_vs_classic NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.advanced_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own advanced simulations" 
ON public.advanced_simulations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own advanced simulations" 
ON public.advanced_simulations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advanced simulations" 
ON public.advanced_simulations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_advanced_simulations_user_id ON public.advanced_simulations(user_id);
CREATE INDEX idx_advanced_simulations_created_at ON public.advanced_simulations(created_at DESC);