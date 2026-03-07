
-- Fix remaining articles by appending regim hotelier mentions

-- Min-stay: append comparison
UPDATE blog_articles SET content = content || '
<p><em>Această flexibilitate în gestionarea sejurului minim este un avantaj exclusiv al regimului hotelier — în chiria clasică, ai un singur contract pe termen lung, fără posibilitatea de a optimiza.</em></p>',
updated_at = now()
WHERE slug = 'min-stay-strategie-adr-ocupare' AND content NOT ILIKE '%chirie clasică%';

-- Rezervări directe: append
UPDATE blog_articles SET content = content || '
<p><em>Rezervările directe sunt un avantaj exclusiv al regimului hotelier. În chiria clasică, nu ai această pârghie de optimizare — ești dependent de un singur chiriaș și de prețul fix din contract.</em></p>',
updated_at = now()
WHERE slug = 'rezervari-directe-ghid-complet' AND content NOT ILIKE '%regim hotelier%';

-- Titlu Booking: append
UPDATE blog_articles SET content = content || '
<p><em>Optimizarea titlurilor este specifică regimului hotelier — în chiria clasică, nu ai nevoie de listing-uri pe platforme. Dar tocmai aceste pârghii de marketing fac ca regimul hotelier să genereze venituri cu 80-100% mai mari decât închirierea clasică.</em></p>',
updated_at = now()
WHERE slug = 'titlu-booking-care-vinde' AND content NOT ILIKE '%regim hotelier%';

-- Reviews playbook: append
UPDATE blog_articles SET content = content || '
<h2>De ce recenziile contează mai mult în regim hotelier</h2>
<p>În chiria clasică, nu ai recenzii publice — relația e directă cu chiriașul. În regim hotelier, recenziile sunt moneda ta de schimb: ele determină clasamentul pe Booking și Airbnb, influențează decizia a 90% dintre potențialii oaspeți și justifică tarifele premium. Un rating de 9.0+ pe Booking poate crește ADR-ul cu 10-15€/noapte.</p>',
updated_at = now()
WHERE slug = 'reviews-playbook-ghid-recenzii' AND content NOT ILIKE '%regim hotelier%';

-- Staging & cleaning: append
UPDATE blog_articles SET content = content || '
<h2>Standardele hoteliere: diferența dintre chirie clasică și regim hotelier</h2>
<p>În chiria clasică, curățenia e responsabilitatea chiriașului. În regim hotelier, standardele de curățenie ale tale definesc experiența oaspetelui — și implicit recenziile, rating-ul și veniturile. Un apartament curat la standard de hotel 4* justifică cu 15-20€/noapte mai mult decât unul curat la nivel „acceptabil".</p>',
updated_at = now()
WHERE slug = 'staging-cleaning-standarde-hoteliere' AND content NOT ILIKE '%regim hotelier%';

-- Photo upgrade: append
UPDATE blog_articles SET content = content || '
<h2>Fotografiile în regim hotelier vs. chirie clasică</h2>
<p>În chiria clasică, o poză decentă pe OLX sau un site imobiliar este suficientă. În regim hotelier, fotografiile profesionale sunt investiția cu cel mai mare ROI: proprietățile cu poze de calitate primesc cu 24% mai multe rezervări și pot solicita tarife cu 15-20% mai mari. Diferența de venituri anuală poate depăși 2.000€ doar din acest upgrade.</p>',
updated_at = now()
WHERE slug = 'photo-upgrade-fotografii-care-vand' AND content NOT ILIKE '%regim hotelier%';

-- Mesaje automate: append
UPDATE blog_articles SET content = content || '
<p><em>Mesajele automate sunt esențiale în regim hotelier, unde comunici cu zeci de oaspeți pe lună. În chiria clasică, comunici cu un singur chiriaș de câteva ori pe an — de aceea automatizarea comunicării este un avantaj care face posibil regimul hotelier la scară.</em></p>',
updated_at = now()
WHERE slug = 'mesaje-automate-checkin-template' AND content NOT ILIKE '%regim hotelier%';
