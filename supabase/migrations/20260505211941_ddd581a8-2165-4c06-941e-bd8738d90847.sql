INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('yield-brut-vs-net-randament-investitie-imobiliara-timisoara', 'Yield brut vs net: cum calculezi corect randamentul unei investiții imobiliare în Timișoara', 'Diferența dintre yield brut și net poate ascunde 3–4 puncte procentuale. Iată formula completă, costurile reale și un exemplu pe un apartament de 2 camere în Iulius Town.', '<h2>De ce yield-ul brut îți minte despre randamentul real</h2>
<p>Cele mai multe anunțuri de vânzare promit un randament „de până la 12%”. În realitate, după ce scazi taxele, comisioanele de platforma și mentenanța, randamentul net coboară frecvent sub 6%. Pentru un investitor care decide pe baza acestor cifre — diferența înseamnă mii de euro pe an. Acest ghid explică formulele complete, integrate în <a href="/calculator-roi">calculatorul ROI RealTrust</a>, calibrat pe peste 180 de apartamente gestionate în Timișoara.</p>

<h2>Formula corectă pentru yield brut</h2>
<p>Yield brut = (Venit anual brut din chirie ÷ Preț achiziție) × 100. Pentru un apartament de 95.000 € care generează 9.500 € pe an, yield-ul brut este 10%. Atât. Nu spune nimic despre profitul real — și de aceea <a href="/blog/analiza-roi-apartamente-timisoara-2026">analiza ROI pe Timișoara 2026</a> folosește exclusiv yield net.</p>

<h2>Yield net: formula pe care o folosesc fondurile</h2>
<p>Yield net = ((Venit brut − Cheltuieli operaționale − Taxe) ÷ (Preț achiziție + Costuri tranzacționale)) × 100. Cheltuielile includ utilități în staționare, asigurare, mentenanță (1.5% din valoare/an), comisioane OTA (15–18% pe Booking), taxa pe clădiri și — pentru regim hotelier — <a href="/blog/ghid-complet-fiscalitate-regim-hotelier-2026">impozitul în sistem forfetar 2026</a>. Pe scurt: din 9.500 € brut rămân tipic 6.300–7.100 € net.</p>

<h2>Costuri pe care 80% dintre investitori le uită</h2>
<ul>
<li><strong>Notar și taxe ANCPI</strong> — aprox. 1.3% din preț, conform <a href="https://www.uniuneanotarilor.ro/" target="_blank" rel="noopener noreferrer">grilei UNNPR</a>.</li>
<li><strong>Asigurare PAD + facultativă</strong> — 90–180 €/an.</li>
<li><strong>Vacancy realist</strong> — 25% din nopți goale chiar și la <a href="/proprietati">proprietăți premium</a>.</li>
<li><strong>Replacement reserve</strong> — 2% din valoare/an pentru reînnoire mobilier și electrocasnice.</li>
<li><strong>Comision management</strong> — 15–25% în Timișoara, vezi <a href="/preturi">grila noastră transparentă de prețuri</a>.</li>
</ul>

<h2>Studiu de caz: 2 camere, Iulius Town, 95.000 €</h2>
<p>Apartament achiziționat în Q1 2026, finisaje moderne, 50 mp. ADR mediu 78 €/noapte, ocupare 75%. Venit brut 21.350 €. După comisioane Booking (3.200 €), management (4.270 €), <a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">impozit ANAF în sistem forfetar</a> (1.890 €), utilități și mentenanță (2.400 €) → net 9.590 €. Yield net = 9.94%. Detaliile complete în <a href="/blog/studiu-caz-roi-apartament-2-camere-2026">studiul de caz dedicat</a>.</p>

<h2>De ce yield-ul mediu Timișoara este 9.4%</h2>
<p>Pentru că este media ponderată din portofoliul nostru — apartamente reale, exploatate în regim hotelier real, nu proiecții optimiste. Comparativ, <a href="/blog/airbnb-vs-booking-2026-timisoara">distribuția pe Booking vs Airbnb</a> influențează yield-ul cu ±0.8 puncte. Iar zona contează enorm: vezi <a href="/blog/zone-hot-investitii-timisoara-2026">clasamentul zonelor hot 2026</a>.</p>

<h2>Greșeli care erodează yield-ul net</h2>
<p>Pricing static (pierdere 12–18% revenue), fotografii proaste, lipsa unei <a href="/evaluare-gratuita">evaluări obiective înainte de achiziție</a>, alegerea zonei greșite (<a href="/blog/cele-mai-bune-cartiere-investitii-timisoara-2026">cartierele recomandate aici</a>), și subestimarea CapEx-ului. Pentru o <a href="/analiza-proprietate">analiză personalizată a proprietății tale</a>, completează formularul în 2 minute.</p>

<h2>Concluzie</h2>
<p>Yield-ul brut este un indicator de marketing. Yield-ul net este indicatorul de decizie. La RealTrust folosim formula completă — și <a href="/contact">îți facem analiza gratuit</a> pentru orice apartament din Timișoara pe care îl analizezi.</p>', 'Investiții', ARRAY['yield','roi','randament','investitii','timisoara']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();