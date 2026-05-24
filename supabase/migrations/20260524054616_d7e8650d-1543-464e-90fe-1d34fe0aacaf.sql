CREATE TABLE IF NOT EXISTS public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '[PM Lead] {{property_name}} — {{zone}}',
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach templates"
ON public.outreach_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_outreach_templates_updated_at
BEFORE UPDATE ON public.outreach_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.outreach_templates (platform, name, subject, body) VALUES
('airbnb', 'Airbnb — Pitch standard',
 '[PM Airbnb] {{property_name}} — {{zone}} (colaborare RealTrust)',
 'Bună {{host_name}},

Am observat anunțul tău „{{property_name}}” din zona {{zone}} pe Airbnb (rating {{rating}}, preț mediu {{average_price}} EUR/noapte). Felicitări pentru calitatea proprietății!

Sunt Andrei de la RealTrust Apart-Hotel — gestionăm în regim hotelier apartamente din Timișoara cu un model de Property Management complet (curățenie, check-in 24/7, fotografie, optimizare preț dinamic, gestionare recenzii).

În medie creștem veniturile gazdelor cu 30–45% față de auto-management, păstrând rating-uri 9.5+.

Ai fi deschis(ă) la o discuție de 15 min să vedem dacă se potrivește pentru {{property_name}}?

Mulțumesc,
Andrei Costi — RealTrust'),
('booking', 'Booking — Pitch standard',
 '[PM Booking] {{property_name}} — {{zone}} (colaborare RealTrust)',
 'Bună {{host_name}},

Am văzut anunțul „{{property_name}}” pe Booking în {{zone}} (scor {{rating}}, preț mediu {{average_price}} EUR/noapte). Frumoasă proprietate!

Sunt Andrei Costi de la RealTrust Apart-Hotel. Gestionăm peste 15 apartamente în Timișoara în regim hotelier și am ajuns la un scor consolidat 9.7/10 pe Booking.

Oferim management complet: dynamic pricing, fotografie profesională, curățenie hotelieră, check-in 24/7, gestionare recenzii și raportare lunară transparentă. Rezultat tipic: +30–45% venit net față de self-management.

Ai 15 min săptămâna asta pentru o scurtă discuție?

Mulțumesc,
Andrei Costi — RealTrust')
ON CONFLICT (platform) DO NOTHING;