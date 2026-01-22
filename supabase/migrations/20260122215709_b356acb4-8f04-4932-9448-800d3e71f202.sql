-- Create table for storing user simulations
CREATE TABLE public.user_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  city TEXT NOT NULL,
  rooms TEXT NOT NULL,
  location TEXT NOT NULL,
  property_area INTEGER,
  monthly_income NUMERIC NOT NULL,
  yearly_income NUMERIC NOT NULL,
  realtrurst_income NUMERIC NOT NULL,
  realtrust_yearly NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_simulations ENABLE ROW LEVEL SECURITY;

-- Users can view their own simulations
CREATE POLICY "Users can view their own simulations"
ON public.user_simulations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own simulations
CREATE POLICY "Users can insert their own simulations"
ON public.user_simulations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own simulations
CREATE POLICY "Users can delete their own simulations"
ON public.user_simulations
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_simulations_user_id ON public.user_simulations(user_id);
CREATE INDEX idx_user_simulations_created_at ON public.user_simulations(created_at DESC);