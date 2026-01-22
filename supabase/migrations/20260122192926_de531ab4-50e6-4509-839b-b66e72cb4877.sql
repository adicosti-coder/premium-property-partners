-- Create table for local tips
CREATE TABLE public.local_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tip_ro TEXT NOT NULL,
  tip_en TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.local_tips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Local tips are publicly readable"
ON public.local_tips
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage local tips"
ON public.local_tips
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_local_tips_updated_at
BEFORE UPDATE ON public.local_tips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tips
INSERT INTO public.local_tips (tip_ro, tip_en, display_order) VALUES
('Vizitează Piața Victoriei seara pentru cele mai frumoase lumini', 'Visit Victory Square at night for the most beautiful lights', 1),
('Încearcă plăcinta bănățeană la Covrigăria Sârbească', 'Try the Banat pie at Covrigăria Sârbească', 2),
('Plimbă-te pe malul Begăi la apus pentru priveliști superbe', 'Walk along the Bega River at sunset for stunning views', 3),
('Rezervă la restaurante în weekend - sunt foarte căutate', 'Book restaurants on weekends - they''re very popular', 4);