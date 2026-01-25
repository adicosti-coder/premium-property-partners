-- Create discount codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_booking_nights INTEGER DEFAULT 1,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount code usage tracking table
CREATE TABLE public.discount_code_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID,
  user_email TEXT,
  property_name TEXT,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_codes
CREATE POLICY "Admins can manage discount codes"
  ON public.discount_codes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active discount codes for validation"
  ON public.discount_codes
  FOR SELECT
  USING (is_active = true);

-- RLS policies for discount_code_uses
CREATE POLICY "Admins can view all usage"
  ON public.discount_code_uses
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert usage records"
  ON public.discount_code_uses
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_active ON public.discount_codes(is_active, valid_from, valid_until);
CREATE INDEX idx_discount_code_uses_code_id ON public.discount_code_uses(code_id);
CREATE INDEX idx_discount_code_uses_used_at ON public.discount_code_uses(used_at);

-- Create trigger to update current_uses count
CREATE OR REPLACE FUNCTION public.increment_discount_code_uses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = NEW.code_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_discount_code_use
  AFTER INSERT ON public.discount_code_uses
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_discount_code_uses();

-- Insert default DIRECT5 code
INSERT INTO public.discount_codes (code, description, discount_type, discount_value, min_booking_nights)
VALUES ('DIRECT5', 'Cod promoțional rezervare directă - 5% discount', 'percentage', 5, 1);