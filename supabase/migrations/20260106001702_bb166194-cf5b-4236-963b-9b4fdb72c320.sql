-- Allow leads table to accept quick form submissions without calculator data
ALTER TABLE public.leads 
  ALTER COLUMN calculated_net_profit DROP NOT NULL,
  ALTER COLUMN calculated_yearly_profit DROP NOT NULL;

-- Add source column to distinguish between calculator and quick form leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'calculator';

-- Add email column for quick form
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add message/notes column  
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS message TEXT;