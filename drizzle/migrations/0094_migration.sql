CREATE TABLE public.timisoara_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'cartier',
  aliases text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timisoara_zones TO authenticated;
GRANT ALL ON public.timisoara_zones TO service_role;
ALTER TABLE public.timisoara_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage timisoara zones" ON public.timisoara_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.timisoara_zones (name, kind, aliases) VALUES
('Cetate','cartier','{centru,"piata unirii","piata victoriei"}'),('Iosefin','cartier','{}'),('Fabric','cartier','{}'),('Elisabetin','cartier','{}'),('Josefin','cartier','{}'),
('Lipovei','cartier','{"calea lipovei"}'),('Aradului','cartier','{"calea aradului"}'),('Circumvalațiunii','cartier','{circumvalatiunii}'),('Girocului','cartier','{"calea girocului"}'),
('Soarelui','cartier','{}'),('Complexul Studențesc','cartier','{"complex studentesc"}'),('Take Ionescu','cartier','{}'),('Bucovina','cartier','{}'),('Calea Șagului','cartier','{sagului,"calea sagului"}'),
('Martirilor','cartier','{"calea martirilor"}'),('Fratelia','cartier','{}'),('Freidorf','cartier','{}'),('Mehala','cartier','{}'),('Plopi','cartier','{}'),('Ronaț','cartier','{ronat}'),
('Kuntz','cartier','{}'),('Odobescu','cartier','{}'),('Calea Buziașului','cartier','{buziasului}'),('Torontalului','cartier','{"calea torontalului"}'),('Blașcovici','cartier','{blascovici}'),
('Dâmbovița','cartier','{dambovita}'),('Badea Cârțan','cartier','{"badea cartan"}'),('Steaua','cartier','{}'),('Ghiroda','localitate','{}'),('Dumbrăvița','localitate','{dumbravita}'),
('Giroc','localitate','{}'),('Mosnița','localitate','{mosnita}'),('Săcălaz','localitate','{sacalaz}'),
('Iulius Town','reper','{"iulius mall",iulius}'),('Shopping City','reper','{}'),('Piața 700','reper','{"piata 700"}'),('Bega','reper','{"canalul bega"}'),('Spitalul Județean','reper','{"judetean","spitalul judetean"}'),('UMFT','reper','{"umf"}'),('Parcul Rozelor','reper','{"parcul trandafirilor"}');