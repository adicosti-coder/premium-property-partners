INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('apartament-1-2-3-camere-roi-regim-hotelier-timisoara', 'Apartament 1, 2 sau 3 camere: care aduce cel mai mare ROI în regim hotelier', 'Date reale din 180+ apartamente: ADR, ocupare, ROI net pe fiecare tipologie și recomandarea pentru bugetul tău de investiție în Timișoara.', '<h2>Tipologia greșită îți poate înjumătăți ROI-ul</h2>
<p>Cea mai frecventă eroare a investitorilor noi din Timișoara: cumpără tipologia greșită pentru zona aleasă. Un studio premium în Cetate poate aduce 11% net, în timp ce un 3 camere în aceeași zonă abia atinge 6%. Datele de mai jos sunt extrase din portofoliul RealTrust, validate cu <a href="/calculator-roi">calculatorul ROI public</a>.</p>
<h2>Studio (1 cameră) — campionul ADR-ului</h2>
<p>Investiție tipică: 55.000–72.000 €. ADR mediu 55–68 €, ocupare 78–82%. ROI net mediu: <strong>9.8–10.6%</strong>. Recomandate în <a href="/blog/zone-hot-investitii-timisoara-2026">zonele cu cerere de călători solo</a>: Cetate, Iulius Town, Iosefin. Atenție la <a href="https://www.timisoara.ro" target="_blank" rel="noopener noreferrer">regulamentul local de urbanism</a>.</p>
<h2>2 camere — sweet spot-ul investitorilor</h2>
<p>Investiție tipică: 88.000–115.000 €. ADR 75–95 €, ocupare 72–78%. ROI net mediu: <strong>9.0–9.8%</strong>. Vezi <a href="/blog/studiu-caz-roi-apartament-2-camere-2026">studiul de caz complet pe 12 luni</a> și <a href="/proprietati">disponibilitatea curentă</a>.</p>
<h2>3 camere — riscul de overstock</h2>
<p>Investiție tipică: 130.000–180.000 €. ADR 110–135 €, ocupare 58–65%. ROI net: <strong>6.2–7.4%</strong>. Recomandat doar în condiții speciale. Citește <a href="/blog/diversificare-portofoliu-imobiliar">strategia de diversificare</a>.</p>
<h2>Comparație vs piața clasică</h2>
<p>Conform <a href="https://www.imobiliare.ro" target="_blank" rel="noopener noreferrer">studiilor Imobiliare.ro</a>, chiria clasică pe 2 camere generează 4.0–4.6% yield net. Regim hotelier dublează — explicat în <a href="/blog/regim-hotelier-2026-sistem-forfetar-taxe">ghidul fiscal 2026</a>.</p>
<h2>Cum alegi tipologia</h2>
<ul><li>Buget &lt; 75.000 € → studio Cetate / Complex Studențesc</li><li>75.000–115.000 € → 2 camere Iulius Town, ISHO</li><li>115.000–160.000 € → 2× studio sau 1× 2-camere premium</li><li>160.000+ € → portofoliu mix (vezi <a href="/catalog-investitii">catalog investiții</a>)</li></ul>
<h2>Concluzie</h2>
<p>Pentru o <a href="/evaluare-gratuita">evaluare gratuită</a> sau <a href="/contact">discuție 1-la-1 cu Adrian Costi</a>, suntem la un click distanță.</p>', 'Investiții', ARRAY['tipologie','studio','2-camere','3-camere','roi']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('finantare-investitii-imobiliare-2026-credit-vs-cash', 'Finanțare pentru investiții imobiliare 2026: credit ipotecar vs cash vs leverage inteligent', 'Compari corect costul total: dobânzi 2026, IRCC vs ROBOR, raportul LTV optim și cum schimbă creditul ROI-ul real al unui apartament în regim hotelier.', '<h2>Cash vs credit: dilema 2026</h2>
<p>În 2026, dobânzile la creditul ipotecar pentru investiție variază între 6.4% și 7.9% (DAE). Răspunsul depinde de yield-ul net — vezi <a href="/blog/yield-brut-vs-net-randament-investitie-imobiliara-timisoara">distincția yield brut vs net</a>.</p>
<h2>IRCC, nu ROBOR</h2>
<p>Conform <a href="https://www.bnro.ro" target="_blank" rel="noopener noreferrer">BNR</a>, IRCC Q2 2026 este în zona 5.7%. La marja băncii rezultă DAE 7.2–7.9%. Vezi comparatoare la <a href="https://www.zf.ro/banci-si-asigurari/" target="_blank" rel="noopener noreferrer">ZF</a>.</p>
<h2>Leverage profitabil</h2>
<p>Regula: leverage doar când yield net > dobândă + 1.5 puncte risc. La studio premium cu yield 10.6% (vezi <a href="/blog/apartament-1-2-3-camere-roi-regim-hotelier-timisoara">comparația tipologiilor</a>), leverage devine atractiv.</p>
<h2>LTV optim regim hotelier</h2>
<p>Recomandare: 50–60% LTV. Pentru sezonalitate, vezi <a href="/blog/preturi-dinamice-2026-ghid">ghidul prețurilor dinamice</a>.</p>
<h2>Costuri ascunse</h2>
<ul><li>Comision dosar: 0.5–1%</li><li>Asigurare imobil: 0.08–0.12%/an</li><li>Asigurare viață: 0.3–0.6%/an</li><li>Evaluare bancară: 250–450 €</li><li>Notar ipotecă: ~0.2%</li></ul>
<p>Toate în <a href="/calculator-roi">calculatorul ROI</a>.</p>
<h2>Strategii avansate</h2>
<p><strong>Snowball</strong>, <strong>BRRRR</strong> pe apartamente vechi din <a href="/blog/cele-mai-bune-cartiere-investitii-timisoara-2026">Iosefin sau Fabric</a>, <strong>parteneriat</strong> via <a href="/recomanda-proprietar">programul RealTrust</a>.</p>
<h2>Diaspora</h2>
<p>Dobânzi UE 3.5–4.5% bat România dar risc valutar real. Vezi <a href="/blog/ghid-investitor-diaspora-regim-hotelier-timisoara">ghidul diasporei</a>.</p>
<h2>Concluzie</h2>
<p><a href="/contact">Discutăm scenariul concret</a> cu tine.</p>', 'Investiții', ARRAY['finantare','credit-ipotecar','leverage','ircc','cash']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('calendar-fiscal-2026-proprietari-regim-hotelier', 'Calendar fiscal complet 2026 pentru proprietarii în regim hotelier', 'Toate termenele ANAF pentru 2026: declarația unică, plăți trimestriale, e-Factura, e-TVA. Cu link-uri direct la formularele oficiale.', '<h2>De ce contează calendarul fiscal</h2>
<p>În 2026, sistemul forfetar a înlocuit norma de venit (vezi <a href="/blog/regim-hotelier-2026-sistem-forfetar-taxe">tranziția completă</a>). Amenzile <a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">ANAF</a> pleacă de la 250 RON.</p>
<h2>Q1 2026</h2>
<ul><li>25 ian — impozit Q4 2025</li><li>25 feb — D112</li><li>15 mar — clasificare la <a href="https://turism.gov.ro" target="_blank" rel="noopener noreferrer">MEAT</a></li><li>25 mar — Declarația unică D212</li></ul>
<h2>Q2 2026</h2>
<ul><li>25 apr — tranșa 1 impozit estimat</li><li>15 mai — termen <a href="/blog/checklist-due-diligence-achizitie-apartament-investitie">due diligence achiziții</a></li><li>30 iun — raportare <a href="https://insse.ro" target="_blank" rel="noopener noreferrer">INSSE</a></li></ul>
<h2>Q3 2026</h2>
<ul><li>25 iul — tranșa 2</li><li>1 sep — reverificare clasificare</li><li>25 sep — tranșa 3</li></ul>
<h2>Q4 2026</h2>
<ul><li>25 oct — D112</li><li>30 nov — optimizări fiscale</li><li>25 dec — tranșa 4</li><li>31 dec — inventar fizic</li></ul>
<h2>Obligații transversale</h2>
<p><strong>e-Factura</strong>: B2B obligatoriu via <a href="https://www.anaf.ro" target="_blank" rel="noopener noreferrer">SPV ANAF</a>. <strong>e-TVA</strong>: lunar pre-completat. Detalii în <a href="/blog/ghid-complet-fiscalitate-regim-hotelier-2026">ghidul fiscal complet</a>.</p>
<h2>Ce facem noi</h2>
<p>Gestionăm e-Factura, raportare SPV, reconciliere bancară. Vezi <a href="/blog/raportare-lunara-kpi-uri-care-conteaza">formatul raportului KPI</a> și <a href="/pentru-proprietari">pagina pentru proprietari</a> sau <a href="/contact">contactează-ne</a>.</p>
<h2>Concluzie</h2>
<p><a href="/evaluare-gratuita">Salvează articolul și revino trimestrial</a>.</p>', 'Taxe & Legislație', ARRAY['calendar-fiscal','anaf','2026','declaratia-unica','e-factura']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('cum-alegi-property-manager-timisoara-23-intrebari', 'Cum alegi un property manager în Timișoara: 23 întrebări obligatorii înainte de a semna', 'Comisionul de 18% nu e tot. Iată cele 23 întrebări care separă o agenție profesionistă de una amatoare.', '<h2>De ce 60% schimbă administratorul în primul an</h2>
<p>Date interne RealTrust: 6 din 10 proprietari preluați veneau de la administrator nemulțumitor. Cauze: rapoarte opace, comunicare lentă, lipsa pricing-ului dinamic.</p>
<h2>Comision și transparență (Î1–Î7)</h2>
<ol><li>Care este comisionul exact? Vezi <a href="/preturi">grila publică</a>.</li><li>Costuri ascunse?</li><li>Cine plătește comisionul OTA?</li><li>Raport detaliat lunar?</li><li>Calendar real-time?</li><li>Cum facturezi?</li><li>Perioadă minimă contract?</li></ol>
<p>Contractul nostru: <a href="/procesul-nostru">procesul de onboarding</a>.</p>
<h2>Operațional și calitate (Î8–Î15)</h2>
<ol start="8"><li>Check-in uman vs <a href="/blog/self-checkin-politica-elibereaza-timpul">self-checkin</a>?</li><li>Housekeeping angajat sau outsourced?</li><li>Aveți <a href="/blog/housekeeping-qc-checklist-hotel">checklist QC</a>?</li><li>Răspuns &lt; 8 min?</li><li><a href="/blog/mesaje-automate-checkin-template">Template-uri automate</a>?</li><li>Recenzii negative?</li><li>Mentenanță 24/7?</li><li>Consumabile?</li></ol>
<h2>Pricing & marketing (Î16–Î20)</h2>
<ol start="16"><li><a href="/blog/preturi-dinamice-2026-ghid">Pricing dinamic</a>?</li><li>Booking, Airbnb, Expedia?</li><li><a href="/blog/rezervari-directe-ghid-complet">Rezervări directe</a>?</li><li>Conversie pe Booking?</li><li>Email marketing?</li></ol>
<h2>Legal & financiar (Î21–Î23)</h2>
<ol start="21"><li>RC operator?</li><li>Cine declară la <a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">ANAF</a>?</li><li><a href="/blog/security-deposit-protejeaza-investitia">Garanție</a>?</li></ol>
<h2>Red flags</h2>
<p>Refuză cine nu arată raport KPI, lucrează „pe încredere”, refuză calendar, promite randamente garantate. Vezi <a href="/despre-noi">transparența RealTrust</a> și <a href="/comunitate">recenzii proprietari</a>.</p>
<h2>Concluzie</h2>
<p><a href="/contact">Cere ofertă</a> sau <a href="/evaluare-gratuita">evaluare gratuită</a>.</p>', 'Proprietari', ARRAY['property-manager','administrare','alegere','contract']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('apartamente-nzeb-timisoara-lista-completa-2026-impact-roi', 'Apartamente nZEB în Timișoara: lista proiectelor 2026 + impact real asupra ROI', 'De la City of Mara la ISHO și XCity Towers: lista proiectelor nZEB, costuri reduse cu utilitățile, ROI cu +1.2–1.8 puncte.', '<h2>Ce înseamnă nZEB</h2>
<p>nZEB = nearly Zero Energy Building. Conform <a href="https://www.mdlpa.ro" target="_blank" rel="noopener noreferrer">MDLPA</a>, toate clădirile autorizate după 31.12.2020 trebuie nZEB. Beneficiu: utilități −60–75%, premium price, rating mai mare. Vezi <a href="/blog/chirii-termen-lung-apartamente-nzeb-timisoara">ghidul nZEB termen lung</a>.</p>
<h2>Proiecte nZEB Timișoara</h2>
<ul><li><a href="/complexe/city-of-mara">City of Mara</a> — Aradului</li><li><a href="/complexe/isho">ISHO</a> — Cetate</li><li><a href="/complexe/xcity-towers">XCity Towers</a> — Iosefin</li><li><a href="/complexe/nord-one">Nord One</a> — Aradului</li><li><a href="/complexe/denya-forest">Denya Forest</a> — Dumbrăvița</li><li><a href="/complexe/vivalia">Vivalia</a></li><li><a href="/complexe/green-forest">Green Forest</a></li></ul>
<p><a href="/complexe">Catalog complet complexe noi</a>.</p>
<h2>Impact financiar</h2>
<p>Apartament standard pre-2020: 65 €/lună utilități staționare, 92 € ocupat. nZEB: 22 €/lună staționare, 38 € ocupat. Diferență anuală ~640 €. La yield 9.4% (vezi <a href="/blog/analiza-roi-apartamente-timisoara-2026">analiza ROI 2026</a>), uplift 0.7%.</p>
<h2>Premium price</h2>
<p>Date Booking interne: nZEB ADR +8–12%, rating +0.3 puncte. Combinat cu <a href="/blog/design-interior-regim-hotelier-timisoara">design optimizat</a>, uplift total 1.8 puncte ROI.</p>
<h2>Capcane nZEB</h2>
<ul><li>Verifică certificatul real (<a href="https://www.mdlpa.ro" target="_blank" rel="noopener noreferrer">MDLPA</a>)</li><li>Cere fișa VMC</li><li>Garanție extinsă pompă căldură</li></ul>
<p><a href="/analiza-proprietate">Analiză tehnică obiectivă</a>.</p>
<h2>Concluzie</h2>
<p>Vezi <a href="/catalog-investitii">catalog investiții nZEB</a> sau <a href="/contact">programează vizionare</a>.</p>', 'Investiții', ARRAY['nzeb','eficienta-energetica','city-of-mara','isho','xcity-towers']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('cash-flow-lunar-real-apartament-2-camere-iulius-town-95000', 'Cash flow lunar real: descompunere apartament 2 camere de 95.000€ în Iulius Town', '12 luni de date reale din 2025: venituri pe canal, costuri, sezonalitate, cash flow net. Cifrele pe care nu le vezi în pitch.', '<h2>Pitch vs realitate</h2>
<p>Realitatea unui investitor RealTrust 2025: ianuarie sub 600 €, august peste 2.300 €, yield net 9.94%. Bază pentru <a href="/blog/yield-brut-vs-net-randament-investitie-imobiliara-timisoara">calculul yield brut vs net</a>.</p>
<h2>Date</h2>
<ul><li>Achiziție 95.000 € (dec 2024), <a href="/zona/iulius-town">Iulius Town</a></li><li>2 camere, 50 mp, etaj 4/8</li><li>Setup mobilier 8.200 €</li><li>Mix Booking + Airbnb + direct</li></ul>
<h2>Cash flow lună cu lună</h2>
<table><tr><th>Luna</th><th>Brut</th><th>OTA</th><th>RT</th><th>Util</th><th>Net</th></tr>
<tr><td>Ian</td><td>980</td><td>147</td><td>196</td><td>180</td><td>457</td></tr>
<tr><td>Feb</td><td>1120</td><td>168</td><td>224</td><td>175</td><td>553</td></tr>
<tr><td>Mar</td><td>1480</td><td>222</td><td>296</td><td>185</td><td>777</td></tr>
<tr><td>Apr</td><td>1760</td><td>264</td><td>352</td><td>180</td><td>964</td></tr>
<tr><td>Mai</td><td>2040</td><td>306</td><td>408</td><td>185</td><td>1141</td></tr>
<tr><td>Iun</td><td>2180</td><td>327</td><td>436</td><td>195</td><td>1222</td></tr>
<tr><td>Iul</td><td>2260</td><td>339</td><td>452</td><td>210</td><td>1259</td></tr>
<tr><td>Aug</td><td>2380</td><td>357</td><td>476</td><td>215</td><td>1332</td></tr>
<tr><td>Sep</td><td>1940</td><td>291</td><td>388</td><td>185</td><td>1076</td></tr>
<tr><td>Oct</td><td>1720</td><td>258</td><td>344</td><td>180</td><td>938</td></tr>
<tr><td>Nov</td><td>1420</td><td>213</td><td>284</td><td>180</td><td>743</td></tr>
<tr><td>Dec</td><td>2070</td><td>310</td><td>414</td><td>200</td><td>1146</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>21350</strong></td><td><strong>3202</strong></td><td><strong>4270</strong></td><td><strong>2270</strong></td><td><strong>11608</strong></td></tr></table>
<h2>Impozit forfetar</h2>
<p>Conform <a href="/blog/regim-hotelier-2026-sistem-forfetar-taxe">sistemului forfetar 2026</a>, baza 50%. Impozit ~1.870 €. PAD/RC 165 €. <strong>Net: 9.573 €</strong>. Yield net 9.94%.</p>
<h2>Mix canale</h2>
<ul><li>Booking 58%</li><li>Airbnb 27%</li><li><a href="/rezerva-direct">Direct</a> 12%</li><li>Expedia 3%</li></ul>
<p>Detalii <a href="/blog/airbnb-vs-booking-2026-timisoara">Airbnb vs Booking</a>.</p>
<h2>Lecții</h2>
<p>Cash buffer 2 luni pentru ian-feb. Pricing dinamic (<a href="/blog/preturi-dinamice-2026-ghid">ghid</a>) +12–18% revenue.</p>
<h2>Concluzie</h2>
<p><a href="/analiza-proprietate">Analiză similară</a> sau <a href="/contact">întâlnire 1-la-1</a>.</p>', 'Investiții', ARRAY['cash-flow','studiu-caz','iulius-town','2-camere']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('strategii-exit-investitor-imobiliar-timisoara-2026', 'Strategii de exit pentru investitori imobiliari: când și cum vinzi cu profit maxim', 'Hold forever, refinance & hold, 1031-like, sale-leaseback: 4 strategii aplicabile în RO 2026.', '<h2>Plan de exit din ziua 1</h2>
<p>Acest ghid completează <a href="/blog/diversificare-portofoliu-imobiliar">diversificarea portofoliului</a>.</p>
<h2>1. Hold Forever</h2>
<p>Cash flow lunar (vezi <a href="/blog/cash-flow-lunar-real-apartament-2-camere-iulius-town-95000">9.573 €/an</a>) + apreciere. 70% portofoliile noastre.</p>
<h2>2. Refinance & Hold</h2>
<p>Cash, apoi refinanțare 60–65% LTV. Vezi <a href="/blog/finantare-investitii-imobiliare-2026-credit-vs-cash">ghidul finanțării</a>.</p>
<h2>3. Echivalent 1031 (RO)</h2>
<p>Art. 116 din <a href="https://static.anaf.ro/static/10/Anaf/Codfiscal/Codfiscal.htm" target="_blank" rel="noopener noreferrer">Codul Fiscal</a> permite scutire după 3 ani. Apreciere +25–35% în 4 ani conform <a href="/blog/predictii-piata-imobiliara-timisoara-2026-2027">predicțiilor</a>.</p>
<h2>4. Sale-Leaseback</h2>
<p>Vinzi instituțional, rămâi operator. RealTrust facilitează în <a href="/catalog-investitii">catalog investiții</a>.</p>
<h2>Timing 2026–2030</h2>
<p>Conform <a href="https://www.imobiliare.ro" target="_blank" rel="noopener noreferrer">studiilor Imobiliare.ro</a>:</p>
<ul><li>2026–2027: cumperi</li><li>2028–2029: hold</li><li>2030+: exit apreciere maximă</li></ul>
<p>Date pe cartiere în <a href="/blog/zone-hot-investitii-timisoara-2026">clasamentul zonelor</a>.</p>
<h2>Pași exit</h2>
<ol><li>Documentație impecabilă</li><li>Facelift cu ROI 4x — vezi <a href="/blog/design-interior-regim-hotelier-timisoara">design</a></li><li><a href="/evaluare-gratuita">Evaluare obiectivă</a></li><li>Listare premium foto</li><li>Negociere termeni</li></ol>
<h2>Concluzie</h2>
<p><a href="/contact">Discutăm scenariul tău</a> cu Adrian Costi.</p>', 'Investiții', ARRAY['exit','strategie','vanzare','refinantare','apreciere']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('top-10-erori-investitori-noi-timisoara-2026', 'Top 10 erori ale investitorilor noi în Timișoara (și cum le-am rezolvat la 180+ proprietăți)', 'Lecții brute din 6 ani de administrare: erorile care costă cel mai mult, soluții concrete.', '<h2>De ce 4 din 10 vând în pierdere</h2>
<p>Date interne RealTrust: 38% apartamente preluate aveau cash flow negativ. Iată top 10.</p>
<h2>1. Tipologie greșită</h2>
<p>Vezi <a href="/blog/apartament-1-2-3-camere-roi-regim-hotelier-timisoara">comparația tipologiilor</a>.</p>
<h2>2. Costuri setup subestimate</h2>
<p>2 camere premium = 7.500–9.500 €. Vezi <a href="/blog/design-interior-regim-hotelier-timisoara">design care se vinde</a>.</p>
<h2>3. Pricing static</h2>
<p>Pierdere 12–18%. Vezi <a href="/blog/preturi-dinamice-2026-ghid">ghidul</a>.</p>
<h2>4. Dependență Booking</h2>
<p>Mix obligatoriu cu Airbnb + <a href="/rezerva-direct">direct</a>. Vezi <a href="/blog/rezervari-directe-ghid-complet">strategia</a>.</p>
<h2>5. Foto cu telefonul</h2>
<p>Foto pro = +18% conversie. Vezi <a href="/blog/photo-upgrade-fotografii-care-vand">foto upgrade</a>.</p>
<h2>6. Ignoră fiscalitatea</h2>
<p>Amenzi <a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">ANAF</a> 500–2.000 RON. Vezi <a href="/blog/calendar-fiscal-2026-proprietari-regim-hotelier">calendarul fiscal 2026</a>.</p>
<h2>7. Self-management „salvez 18%”</h2>
<p>Cash flow −22–28%. Vezi <a href="/preturi">de ce 18% comision aduce ROI mai mare</a>.</p>
<h2>8. Răspuns lent</h2>
<p>Booking penalizează. Vezi <a href="/blog/mesaje-automate-checkin-template">mesaje automate</a>.</p>
<h2>9. Primele 10 reviews</h2>
<p>Definesc trajectoria pe Booking.</p>
<h2>10. Fără due diligence</h2>
<p>Vezi <a href="/blog/checklist-due-diligence-achizitie-apartament-investitie">checklist 47 puncte</a>.</p>
<h2>Cum prevenim</h2>
<p><a href="/blog/onboarding-proprietar-7-pasi">Onboarding 7 pași</a>, <a href="/evaluare-gratuita">evaluare gratuită</a>, <a href="/pentru-proprietari">pagina proprietari</a>.</p>
<h2>Concluzie</h2>
<p><a href="/contact">Discută înainte să cumperi</a>.</p>', 'Investiții', ARRAY['greseli','erori','investitori','incepatori','lectii']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();

INSERT INTO public.blog_articles (slug, title, excerpt, content, category, tags, author_name, is_published, is_premium, published_at)
VALUES ('ghid-anaf-regim-hotelier-2026-efactura-etva-casa-marcat', 'Ghid complet ANAF pentru regim hotelier: e-Factura, e-TVA, casa de marcat 2026', 'Toate obligațiile digitale ANAF 2026: SPV, e-Factura, e-TVA, casa de marcat — explicate pe înțeles.', '<h2>2026: anul digitalizării fiscale</h2>
<p><a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">ANAF</a> a finalizat tranziția digitală. Acest ghid completează <a href="/blog/calendar-fiscal-2026-proprietari-regim-hotelier">calendarul fiscal 2026</a>.</p>
<h2>Pas 1: SPV</h2>
<p><a href="https://www.anaf.ro" target="_blank" rel="noopener noreferrer">SPV ANAF</a> obligatoriu. Certificat digital (<a href="https://certsign.ro" target="_blank" rel="noopener noreferrer">certSIGN</a>, <a href="https://digisign.ro" target="_blank" rel="noopener noreferrer">DigiSign</a>) — 25–50 €/an.</p>
<h2>Pas 2: e-Factura</h2>
<p>Obligatoriu B2B. Pentru B2C via Booking/Airbnb — platforma emite chitanța. Proces:</p>
<ol><li>XML conform <a href="https://mfinante.gov.ro" target="_blank" rel="noopener noreferrer">specificațiilor MF</a></li><li>Upload SPV</li><li>ANAF validează</li><li>Stochezi 10 ani</li></ol>
<p>Soluții: <a href="https://saga.ro" target="_blank" rel="noopener noreferrer">SAGA</a>, <a href="https://smartbill.ro" target="_blank" rel="noopener noreferrer">SmartBill</a>, <a href="https://oblio.eu" target="_blank" rel="noopener noreferrer">Oblio</a>. RealTrust gestionează — vezi <a href="/pentru-proprietari">pagina proprietari</a>.</p>
<h2>Pas 3: e-TVA</h2>
<p>Doar peste pragul 88.500 € cifră. Pentru un apartament — în an 4–5.</p>
<h2>Pas 4: Casa de marcat</h2>
<ul><li><strong>NU</strong> pentru Booking/Airbnb/Expedia</li><li><strong>NU</strong> pentru transfer bancar direct</li><li><strong>DA</strong> pentru cash direct la cazare</li></ul>
<p>Cost 200–350 €. Detalii <a href="/blog/ghid-complet-fiscalitate-regim-hotelier-2026">fiscalitate completă</a>.</p>
<h2>Pas 5: SAF-T</h2>
<p>Doar contribuabili mari. Pentru 10+ apartamente prin SRL — contabil specialist.</p>
<h2>Cum simplifică RealTrust</h2>
<ul><li><a href="/blog/raportare-lunara-kpi-uri-care-conteaza">Raport KPI lunar</a></li><li>e-Factura când necesar</li><li>Reconciliere bancară</li><li>Optimizare pre-D212</li></ul>
<h2>Resurse oficiale</h2>
<ul><li><a href="https://anaf.ro" target="_blank" rel="noopener noreferrer">Portal ANAF</a></li><li><a href="https://www.anaf.ro" target="_blank" rel="noopener noreferrer">SPV</a></li><li><a href="https://mfinante.gov.ro" target="_blank" rel="noopener noreferrer">MF</a></li><li><a href="https://static.anaf.ro/static/10/Anaf/Codfiscal/Codfiscal.htm" target="_blank" rel="noopener noreferrer">Cod Fiscal</a></li></ul>
<h2>Concluzie</h2>
<p><a href="/evaluare-gratuita">Evaluare structură fiscală</a> sau <a href="/contact">discuție cu echipa</a>.</p>', 'Taxe & Legislație', ARRAY['anaf','e-factura','e-tva','casa-marcat','spv']::text[], 'Adrian Costi', true, true, now())
ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, category=EXCLUDED.category, tags=EXCLUDED.tags, is_premium=true, is_published=true, updated_at=now();