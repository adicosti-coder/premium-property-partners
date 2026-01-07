-- Create table for points of interest
CREATE TABLE public.points_of_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'cafe', 'shopping', 'attraction', 'transport', 'health', 'entertainment')),
  description TEXT,
  description_en TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "POIs are publicly readable" 
ON public.points_of_interest 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage POIs" 
ON public.points_of_interest 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_poi_updated_at
BEFORE UPDATE ON public.points_of_interest
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default POIs near Bucharest center
INSERT INTO public.points_of_interest (name, name_en, category, description, description_en, latitude, longitude, address, rating) VALUES
('Caru'' cu Bere', 'Caru'' cu Bere', 'restaurant', 'Restaurant tradițional românesc iconic, fondat în 1879', 'Iconic traditional Romanian restaurant, founded in 1879', 44.4318, 26.1015, 'Strada Stavropoleos 5', 4.6),
('Origo Coffee', 'Origo Coffee', 'cafe', 'Cafenea specialty cu boabe prăjite local', 'Specialty coffee shop with locally roasted beans', 44.4356, 26.0978, 'Strada Lipscani 9', 4.8),
('Unirea Shopping Center', 'Unirea Shopping Center', 'shopping', 'Cel mai mare mall din centrul Bucureștiului', 'The largest mall in central Bucharest', 44.4264, 26.1025, 'Piața Unirii 1', 4.2),
('Ateneul Român', 'Romanian Athenaeum', 'attraction', 'Sala de concerte emblematică, simbol al culturii românești', 'Iconic concert hall, symbol of Romanian culture', 44.4413, 26.0972, 'Strada Benjamin Franklin 1-3', 4.9),
('Berăria H', 'Berăria H', 'restaurant', 'Cea mai mare berărie din Europa de Est', 'The largest beer hall in Eastern Europe', 44.4689, 26.0772, 'Strada Barbu Văcărescu 170', 4.5),
('M60', 'M60', 'cafe', 'Cafenea trendy într-o clădire renovată', 'Trendy coffee shop in a renovated building', 44.4389, 26.0956, 'Strada Mendeleev 60', 4.7),
('Palatul Parlamentului', 'Palace of Parliament', 'attraction', 'A doua cea mai mare clădire administrativă din lume', 'The second largest administrative building in the world', 44.4275, 26.0875, 'Strada Izvor 2-4', 4.7),
('AFI Cotroceni', 'AFI Cotroceni', 'shopping', 'Mall modern cu magazine, cinema și restaurante', 'Modern mall with shops, cinema and restaurants', 44.4302, 26.0531, 'Bulevardul Vasile Milea 4', 4.4),
('Stația de Metrou Universitate', 'Universitate Metro Station', 'transport', 'Stație centrală de metrou', 'Central metro station', 44.4359, 26.1008, 'Bulevardul Regina Elisabeta', 4.0),
('Spitalul Universitar', 'University Hospital', 'health', 'Spital universitar de urgență', 'University emergency hospital', 44.4412, 26.0878, 'Splaiul Independenței 169', 3.8),
('Teatrul Național', 'National Theatre', 'entertainment', 'Teatrul Național București', 'Bucharest National Theatre', 44.4278, 26.1034, 'Bulevardul Nicolae Bălcescu 2', 4.6),
('Cinema City', 'Cinema City', 'entertainment', 'Lanț de cinematografe moderne', 'Modern cinema chain', 44.4302, 26.0531, 'AFI Cotroceni', 4.3);