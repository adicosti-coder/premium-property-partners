-- Create owner_codes table for registration codes
CREATE TABLE public.owner_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create owner_properties table to link owners to their properties
CREATE TABLE public.owner_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_records table for income/expenses
CREATE TABLE public.financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create owner_payments table for tracking payments to owners
CREATE TABLE public.owner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.owner_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payments ENABLE ROW LEVEL SECURITY;

-- Add 'owner' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- RLS Policies for owner_codes
CREATE POLICY "Admins can manage owner codes"
ON public.owner_codes FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can verify unused codes"
ON public.owner_codes FOR SELECT
USING (is_used = false);

CREATE POLICY "Authenticated users can use codes"
ON public.owner_codes FOR UPDATE
USING (is_used = false AND auth.uid() IS NOT NULL)
WITH CHECK (is_used = true AND used_by = auth.uid());

-- RLS Policies for owner_properties
CREATE POLICY "Admins can manage owner properties"
ON public.owner_properties FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view their own properties"
ON public.owner_properties FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property links"
ON public.owner_properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for maintenance_records
CREATE POLICY "Admins can manage maintenance records"
ON public.maintenance_records FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view their property maintenance"
ON public.maintenance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties
    WHERE owner_properties.property_id = maintenance_records.property_id
    AND owner_properties.user_id = auth.uid()
  )
);

-- RLS Policies for financial_records
CREATE POLICY "Admins can manage financial records"
ON public.financial_records FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view their property financials"
ON public.financial_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties
    WHERE owner_properties.property_id = financial_records.property_id
    AND owner_properties.user_id = auth.uid()
  )
);

-- RLS Policies for owner_payments
CREATE POLICY "Admins can manage owner payments"
ON public.owner_payments FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view their payments"
ON public.owner_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.owner_properties
    WHERE owner_properties.property_id = owner_payments.property_id
    AND owner_properties.user_id = auth.uid()
  )
);

-- Trigger for maintenance_records updated_at
CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for maintenance images/invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-files', 'maintenance-files', false);

-- Storage policies for maintenance files
CREATE POLICY "Admins can manage maintenance files"
ON storage.objects FOR ALL
USING (bucket_id = 'maintenance-files' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'maintenance-files' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can view their property maintenance files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'maintenance-files' AND
  EXISTS (
    SELECT 1 FROM public.maintenance_records mr
    JOIN public.owner_properties op ON op.property_id = mr.property_id
    WHERE op.user_id = auth.uid()
    AND (mr.image_url LIKE '%' || name OR mr.invoice_url LIKE '%' || name)
  )
);