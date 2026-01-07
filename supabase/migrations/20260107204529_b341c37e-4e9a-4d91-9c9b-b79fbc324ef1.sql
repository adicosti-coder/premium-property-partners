-- Create table for video testimonials
CREATE TABLE public.video_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_ro TEXT NOT NULL,
  role_en TEXT NOT NULL,
  property_ro TEXT NOT NULL,
  property_en TEXT NOT NULL,
  location TEXT NOT NULL,
  quote_ro TEXT NOT NULL,
  quote_en TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  months_as_client INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_testimonials ENABLE ROW LEVEL SECURITY;

-- Public can view active testimonials
CREATE POLICY "Anyone can view active video testimonials"
ON public.video_testimonials
FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage video testimonials"
ON public.video_testimonials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_video_testimonials_updated_at
BEFORE UPDATE ON public.video_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.video_testimonials (name, role_ro, role_en, property_ro, property_en, location, quote_ro, quote_en, youtube_id, rating, months_as_client, display_order)
VALUES 
  ('Alexandru Marinescu', 'Proprietar Apartament', 'Apartment Owner', 'Apartament 2 Camere Premium', '2 Bedroom Premium Apartment', 'Complexul Isho, Timișoara', 'Am trecut de la 40% ocupare gestionând singur la 95% cu ApArt Hotel. Venitul meu s-a triplat în primele 6 luni. Recomand cu încredere!', 'I went from 40% occupancy managing myself to 95% with ApArt Hotel. My income tripled in the first 6 months. Highly recommend!', 'dQw4w9WgXcQ', 5, 18, 1),
  ('Ioana Dumitrescu', 'Investitor Imobiliar', 'Real Estate Investor', '3 Apartamente în Portofoliu', '3 Apartments in Portfolio', 'Zone Premium, Timișoara', 'Ca investitor cu mai multe proprietăți, aveam nevoie de un partener de încredere. Transparența financiară și rapoartele detaliate m-au convins să rămân.', 'As an investor with multiple properties, I needed a reliable partner. The financial transparency and detailed reports convinced me to stay.', 'dQw4w9WgXcQ', 5, 24, 2),
  ('Mihai Popa', 'Proprietar Rezident', 'Expat Owner', 'Apartament Studio', 'Studio Apartment', 'Iulius Town, Timișoara', 'Locuiesc în străinătate și nu aveam cum să gestionez închirierea. Echipa ApArt Hotel se ocupă de tot, iar eu primesc banii direct în cont. Perfect!', 'I live abroad and couldn''t manage the rental. The ApArt Hotel team handles everything, and I receive money directly in my account. Perfect!', 'dQw4w9WgXcQ', 5, 12, 3);