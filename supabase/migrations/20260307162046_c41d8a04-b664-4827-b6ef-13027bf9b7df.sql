
-- Update: Onboarding proprietar - add regim hotelier context
UPDATE blog_articles SET content = REPLACE(content, '<h2>De ce un onboarding structurat contează</h2>
<p>Primele săptămâni ale colaborării setează tonul pentru tot ce urmează. Un onboarding haotic = probleme continue.</p>', '<h2>De ce un onboarding structurat contează</h2>
<p>Primele săptămâni ale colaborării setează tonul pentru tot ce urmează — mai ales la trecerea de la închirierea clasică la regimul hotelier. Un onboarding haotic = probleme continue.</p>
<p><strong>Dacă treci de la chirie clasică la regim hotelier:</strong> pregătește-te pentru o schimbare de mindset. Nu mai ai un singur chiriaș, ci zeci de oaspeți pe lună. De aceea, un onboarding structurat cu o firmă de management profesionist face diferența.</p>'),
updated_at = now()
WHERE slug = 'onboarding-proprietar-7-pasi';

-- Update: Rezervări directe - add hotel regime mention
UPDATE blog_articles SET content = REPLACE(content, '<h2>De ce să vrei rezervări directe</h2>
<p>Booking și Airbnb iau 15-20% comision. Rezervările directe îți cresc marja. Dar nu e vorba de a „lupta" cu platformele - e vorba de a diversifica.</p>', '<h2>De ce să vrei rezervări directe</h2>
<p>Booking și Airbnb iau 15-20% comision. Rezervările directe îți cresc marja — un avantaj specific regimului hotelier care nu există în închirierea clasică (unde ai un singur chiriaș fix). Dar nu e vorba de a „lupta" cu platformele - e vorba de a diversifica.</p>'),
updated_at = now()
WHERE slug = 'rezervari-directe-ghid-complet';

-- Update: Mentenanță preventivă - add context
UPDATE blog_articles SET content = REPLACE(content, '<h2>De ce mentenanța preventivă salvează bani</h2>
<p>O intervenție de urgență costă de 3-5 ori mai mult decât una planificată. Plus că riști recenzii negative dacă oaspetele găsește ceva stricat.</p>', '<h2>De ce mentenanța preventivă salvează bani</h2>
<p>O intervenție de urgență costă de 3-5 ori mai mult decât una planificată. În regimul hotelier, riscul este amplificat: o problemă nerezolvată = recenzie negativă = pierdere de venituri. Spre deosebire de chiria clasică (unde chiriașul raportează problemele), în regim hotelier tu trebuie să fii proactiv.</p>'),
updated_at = now()
WHERE slug = 'mentenanta-preventiva-checklist-lunar';

-- Update: Min-stay strategie - add classic comparison
UPDATE blog_articles SET content = REPLACE(content, '<p><strong>Concluzie:</strong> Min-stay nu e despre a refuza bani, ci despre a maximiza veniturile pe termen lung.</p>', '<p><strong>Concluzie:</strong> Min-stay nu e despre a refuza bani, ci despre a maximiza veniturile pe termen lung. Este una dintre pârghiile care fac regimul hotelier superior ca randament față de chiria clasică — capacitatea de a optimiza continuu, nu doar de a încasa o chirie fixă.</p>'),
updated_at = now()
WHERE slug = 'min-stay-strategie-adr-ocupare';

-- Update: Prețuri dinamice - add classic comparison
UPDATE blog_articles SET content = REPLACE(content, '<p><strong>Concluzie:</strong> Prețurile dinamice nu înseamnă să fii lacom. Înseamnă să captezi valoarea corectă pentru ceea ce oferi, în momentul potrivit.</p>', '<p><strong>Concluzie:</strong> Prețurile dinamice nu înseamnă să fii lacom. Înseamnă să captezi valoarea corectă pentru ceea ce oferi, în momentul potrivit. Este exact avantajul care face regimul hotelier superior închirierii clasice: în loc de o chirie fixă de 350€/lună, captezi 55-65€/noapte în perioadele de vârf și menții ocuparea cu tarife competitive în extrasezon.</p>'),
updated_at = now()
WHERE slug = 'preturi-dinamice-2026-ghid';

-- Update: Self check-in - add context  
UPDATE blog_articles SET content = REPLACE(content, '<h2>Beneficiile self check-in</h2>
<p>Check-in-ul automat este standardul în industria ospitalității moderne. Oaspeții de azi se așteaptă la flexibilitate și autonomie.</p>', '<h2>Beneficiile self check-in</h2>
<p>Check-in-ul automat este standardul în regimul hotelier modern. Spre deosebire de închirierea clasică (unde predai cheia o singură dată), în regim hotelier ai zeci de check-in-uri pe lună — automatizarea devine obligatorie pentru eficiență.</p>'),
updated_at = now()
WHERE slug = 'self-checkin-politica-elibereaza-timpul';

-- Update: Smart locks - add context
UPDATE blog_articles SET content = REPLACE(content, '<h2>De ce smart locks</h2>
<p>Încuietorile inteligente sunt o investiție care se amortizează rapid prin eficiența operațională și flexibilitatea oferită oaspeților.</p>', '<h2>De ce smart locks</h2>
<p>Încuietorile inteligente sunt o investiție esențială pentru regimul hotelier, care se amortizează rapid prin eficiența operațională. Dacă ai chirie clasică, nu ai neapărat nevoie — dar dacă operezi în regim hotelier cu zeci de oaspeți pe lună, un smart lock elimină complet problema predării și returnării cheilor.</p>'),
updated_at = now()
WHERE slug = 'smart-locks-ghid-complet';

-- Update: Titlu Booking - add context
UPDATE blog_articles SET content = REPLACE(
  (SELECT content FROM blog_articles WHERE slug = 'titlu-booking-care-vinde'),
  'titlu',
  'titlu'
),
updated_at = now()
WHERE slug = 'titlu-booking-care-vinde' AND content NOT ILIKE '%regim hotelier%';
