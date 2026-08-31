/**
 * Custom Vite plugin that generates static HTML files for SEO-critical routes
 * at build time. Uses neighborhoods.ts as the Single Source of Truth for
 * neighborhood data (slugs, titles, descriptions, FAQs).
 * 
 * Also fetches active property listings from the database to generate
 * individual static HTML files for each property URL.
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  h1: string;
  jsonLd: Record<string, unknown> | Record<string, unknown>[];
  canonical: string;
  /** Optional rich SEO body content (HTML string) injected in the prerendered block.
   *  Used to give crawlers like Firecrawl/Bing dense local-SEO content even
   *  before React hydrates. Safe HTML — built from trusted constants only. */
  seoBody?: string;
  /** Optional absolute image URL used for og:image / twitter:image. */
  image?: string;
}

/**
 * Rich, dense local-SEO HTML for the homepage. Mirrors SEOLocalEntitiesBlock.tsx
 * but injected into the static HTML so crawlers without JS still see it.
 * Includes all 27 local entities tracked by seo-ai-optimizer/localGeo.ts.
 */
const HOMEPAGE_SEO_BODY = `
  <h2>Servicii imobiliare și regim hotelier în toate cartierele Timișoarei</h2>
  <p>RealTrust &amp; ApArt Hotel Timișoara este partenerul tău pentru <strong>investiții imobiliare profitabile</strong>, <strong>vânzări apartamente Timișoara</strong>, <strong>închirieri pe termen lung</strong> și <strong>administrare apartamente regim hotelier</strong> cu un randament net verificat de 9.4% anual. Acoperim toate cartierele importante ale orașului și zonele metropolitane: Complex Studențesc (lângă UVT — Universitatea de Vest, UPT — Politehnica Timișoara și UMF Medicină), Iosefin, Elisabetin (lângă Parcul Rozelor și Parcul Botanic), Fabric, ISHO, Cetate și Centrul Vechi (Piața Unirii, Piața Victoriei, Catedrala Mitropolitană), Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Girocului, Calea Șagului, Circumvalațiunii, Calea Lipovei, precum și zonele metropolitane <strong>imobiliare Dumbrăvița</strong>, <strong>apartamente Ghiroda</strong> (acces rapid la Aeroport și zona industrială) și <strong>case Moșnița Nouă</strong> pentru investitorii interesați de vile și case noi.</p>

  <h2>Ansambluri rezidențiale Timișoara — colaborări cu dezvoltatori</h2>
  <p>Lucrăm cu cele mai importante <strong>ansambluri rezidențiale Timișoara</strong>: ISHO, ATENEO, City of Mara, Fructus Plaza, XCity Towers, Openville Residential, Vox Park și complexele noi din Dumbrăvița și Ghiroda. Selecție premium de <strong>apartamente noi Timișoara</strong> — eficiență energetică clasa A, finisaje moderne, smart-home și apreciere a capitalului peste media pieței.</p>

  <h2>Credit ipotecar Timișoara — consultanță financiară pentru cumpărători</h2>
  <p>Oferim consultanță gratuită pentru <strong>credit ipotecar Timișoara</strong> prin parteneriatele noastre cu brokerii de credite și principalele bănci active local (BCR, BRD, Raiffeisen, ING, Banca Transilvania). Te ajutăm să compari ofertele, să optimizezi avansul și să obții cea mai bună rată DAE pentru achiziția apartamentului tău în Timișoara, Dumbrăvița sau Ghiroda.</p>

  <h2>Comision agenție imobiliară Timișoara — transparență totală</h2>
  <p><strong>Comision agenție imobiliară Timișoara</strong> RealTrust: structură transparentă pentru tranzacții — 2% comision standard la vânzări (negociabil pentru proprietăți premium), o chirie pentru închirieri pe termen lung, fără costuri ascunse. Pentru administrare regim hotelier comisionul este 15–25% din veniturile generate, plătit doar din încasările reale.</p>

  <h3>Apartamente regim hotelier Complex Studențesc Timișoara</h3>
  <p>Apartamente regim hotelier în Complex Studențesc Timișoara, la 5 minute pe jos de UVT (Universitatea de Vest din Timișoara), Politehnica Timișoara (UPT) și UMF Medicină „Victor Babeș". Cazare lângă universități, ideală pentru studenți, părinți care vizitează studenții, profesori și participanți la evenimente academice și conferințe medicale.</p>

  <h3>Apartamente Iosefin și Elisabetin Timișoara</h3>
  <p>Apartamente de închiriat și regim hotelier în Iosefin Timișoara — cartier istoric și rezidențial central, aproape de malul Bega și de Centrul Vechi. În Elisabetin Timișoara oferim apartamente într-un cartier rezidențial liniștit, lângă Parcul Rozelor și Parcul Botanic, la câțiva pași de Catedrala Mitropolitană.</p>

  <h3>Cazare lângă Iulius Town, Shopping City Timișoara, Aeroport Timișoara și Spitalul Județean</h3>
  <p>Proprietățile noastre sunt situate la 5–15 minute de Iulius Town / Iulius Mall Openville, Shopping City Timișoara (Auchan), Vox Park, <strong>Aeroport Timișoara</strong> / Aeroportul Internațional Timișoara „Traian Vuia" și Gara de Nord Timișoara. Oferim <strong>apartamente de închiriat Timișoara Aeroport</strong>, <strong>cazare Timișoara Spitalul Județean</strong> și opțiuni de <strong>regim hotelier Timișoara Gara de Nord</strong> — ideale pentru pasageri în tranzit, familiile pacienților, medici, personal medical și călători business.</p>

  <h3>Investiții imobiliare în Centru Timișoara, ISHO și zonele premium</h3>
  <p>Pentru investitori, propunem oportunități verificate în Cetate / Centru, ISHO (cel mai iconic proiect de regenerare urbană din Timișoara, pe malul Begăi), Take Ionescu și Soarelui — zone cu randamente atractive (8–10% net pentru regim hotelier) și apreciere a capitalului peste media pieței. Avem inclusiv <strong>apartamente de vânzare Timișoara Openville</strong>, proprietăți premium lângă hub-ul de business Iulius Town / Openville și <strong>apartamente Timișoara Piața Unirii</strong> pentru cumpărători care caută Centru Vechi și randament excelent.</p>

  <h3>Apartamente de vânzare Timișoara — proprietăți de vânzare în toate cartierele</h3>
  <p>Ca <strong>agenție imobiliară Timișoara</strong> de încredere, oferim <strong>apartamente de vânzare Timișoara</strong> și <strong>proprietăți de vânzare Timișoara</strong> verificate în toate cartierele importante: garsoniere, apartamente cu 2 camere, 3 camere și 4 camere de vânzare în Centru, Iosefin, Elisabetin, Complex Studențesc, ISHO, Take Ionescu, Calea Aradului, Calea Lipovei și Circumvalațiunii. Consultanță completă pentru cumpărătorii de apartamente în Timișoara, evaluare gratuită, negociere și asistență la actele notariale.</p>

  <h3>Apartamente de închiriat Timișoara — închirieri pe termen lung</h3>
  <p>Pentru chiriași și proprietari oferim <strong>apartamente de închiriat Timișoara</strong> și <strong>închirieri apartamente Timișoara pe termen lung</strong> (contracte 12 luni sau mai mult) — apartamente mobilate și utilate în Centru, Iosefin, Elisabetin, Complex Studențesc, Iulius Town, Calea Aradului și zona universitară (UVT, UPT, UMF). Verificare chiriași, contracte standardizate și gestionare profesională pe toată durata închirierii.</p>

  <h3>Administrare proprietăți Timișoara — servicii complete pentru proprietari</h3>
  <p><strong>Administrare proprietăți Timișoara</strong> oferită de RealTrust acoperă tot ciclul: marketing pe Booking, Airbnb și directe, check-in / check-out 24/7, curățenie hotelieră, mentenanță, raportare lunară financiară transparentă și optimizare yield management. <strong>Administrare apartamente regim hotelier Timișoara</strong> cu ROI 9.4% net verificat anual — partener de încredere pentru proprietari și investitori.</p>

  <h3>Servicii oferite</h3>
  <p>Investiții imobiliare Timișoara cu randament verificat, vânzări apartamente Timișoara, închirieri pe termen lung Timișoara, evaluare gratuită proprietate, calculator ROI online, consultanță investiții imobiliare și administrare profesională pentru proprietari, investitori și oaspeți.</p>

  <h3>Proximitate landmark-uri Timișoara și acces transport public</h3>
  <p>Toate proprietățile noastre sunt aproape de universități (UVT, UPT, UMF), mall-uri (Iulius Town, Shopping City Timișoara), parcuri (Parcul Central, Parcul Rozelor, Parcul Botanic), Catedrala Mitropolitană, malul Bega, Spitalul Județean Timișoara, Aeroportul Internațional și Gara de Nord — la 5, 10 sau 15 minute pe jos sau cu transport public. Acces facil la stația de tramvai (linii 1, 2, 4, 8) și autobuz (E1, E4, 33, 40), cu mijloc de transport în comun la sub 100m de fiecare proprietate.</p>

  <h3>Apartamente de lux Timișoara Centru și apartamente noi Timișoara</h3>
  <p><strong>Apartamente de lux Timișoara Centru</strong> și <strong>apartamente noi Timișoara</strong> — selecție premium în ISHO, Piața Unirii, Take Ionescu, City of Mara Circumvalațiunii și Openville. Dezvoltări moderne 2022–2026, eficiență energetică clasa A, finisaje de top, smart-home și amenajări de design pentru investitori și cumpărători exigenți.</p>

  <h3>Închirieri apartamente studenți Timișoara — Complex Studențesc</h3>
  <p><strong>Închirieri apartamente studenți Timișoara</strong> în Complexul Studențesc, la 5 minute pe jos de UVT, UPT (Politehnica) și UMF Medicină „Victor Babeș" — garsoniere și apartamente cu 2 camere mobilate, contracte 9–12 luni, utilități incluse, internet de mare viteză și verificare proprietar pentru siguranță.</p>

  <h3>Administrare proprietăți Timișoara — prețuri transparente</h3>
  <p><strong>Administrare proprietăți Timișoara prețuri</strong> transparente: comision 15–25% management + 15–23% comision platforme (Booking, Airbnb). Pachet complet care include marketing pe toate platformele, check-in / check-out 24/7, curățenie hotelieră, mentenanță, raportare lunară financiară și optimizare yield management. ROI 9.4% net verificat anual.</p>

  <h3>Cazare temporară Timișoara Centru și apartamente lângă Iulius Town</h3>
  <p><strong>Cazare temporară Timișoara Centru</strong>, <strong>închirieri apartamente Timișoara termen scurt</strong> și <strong>apartamente de închiriat lângă Iulius Town</strong> — soluții flexibile pentru sejururi de 1 noapte până la 1 lună, ideale pentru turism business, conferințe, vizite medicale și relocare temporară. Proprietăți premium la 5–15 minute de Iulius Mall, Openville, Piața Unirii și Piața Victoriei.</p>

  <h3>Proprietăți de vânzare Zona Aradului</h3>
  <p><strong>Proprietăți de vânzare Zona Aradului</strong> Timișoara — apartamente cu 2, 3 și 4 camere în zone cu acces rapid la Aeroportul Internațional „Traian Vuia", Iulius Town și Openville. Profil de chiriași cu venituri ridicate, apreciere a capitalului peste media pieței.</p>

  <h3>Cazare evenimente Timișoara — FEST-FDR, Festivalul Inimilor și conferințe</h3>
  <p>Cazare pentru evenimente locale majore: <strong>cazare FEST-FDR Timișoara</strong> (Festivalul European al Spectacolului), <strong>apartamente închiriere Festivalul Inimilor</strong>, Timișoara Jazz Festival, Plai Festival, Revolution Festival și conferințe medicale UMF — apartamente disponibile cu rezervare anticipată în Centru, Iosefin și Complex Studențesc.</p>

  <h3>Zona metropolitană extinsă — Giarmata Vii, Săcălaz, Moșnița Nouă, Ghiroda</h3>
  <p>Acoperim întreaga zonă metropolitană Timișoara, inclusiv comunele în expansiune rapidă: <strong>imobiliare Giarmata Vii</strong> (case noi și ansambluri rezidențiale lângă Aeroportul „Traian Vuia", profil cumpărători tineri profesioniști IT și piloți Wizz Air / TAROM), <strong>case Moșnița Nouă</strong>, <strong>apartamente Ghiroda</strong> și <strong>terenuri intravilane Săcălaz</strong>. Aceste zone metropolitane oferă raport calitate-preț excelent (1.350–1.680 €/mp), clasa A energetică și acces direct la centura Timișoara.</p>

  <h3>Hub-uri de business Timișoara — Olympia Business Park, Vox Park, City Business Centre</h3>
  <p>Apartamente regim hotelier și închirieri corporate lângă cele mai importante hub-uri de business din Timișoara: <strong>Olympia Business Park</strong> (zona de nord, sediu pentru companii multinaționale și relocări corporate pe termen mediu), <strong>Vox Park</strong>, Iulius Town &amp; Openville, City Business Centre (ISHO), Continental Automotive (Calea Aradului) și Nokia Campus. Proprietățile noastre acomodează business travelers cu sejururi de 1–4 săptămâni, expați și echipe de proiect.</p>

  <h3>Bulevardul Vasile Pârvan — închirieri studenți Complex Studențesc</h3>
  <p><strong>Închirieri apartamente studenți Bulevardul Vasile Pârvan</strong> — artera principală care traversează Complexul Studențesc Timișoara, oferind acces direct (sub 5 minute pe jos) la UVT — Universitatea de Vest, Politehnica Timișoara (UPT) și UMF „Victor Babeș". Apartamente cu 1, 2 și 3 camere mobilate, contracte 9–12 luni cu utilități incluse, internet de mare viteză și verificare proprietar pentru siguranța studenților și părinților.</p>

  <h3>Randament chirie Timișoara — comparație termen lung vs regim hotelier</h3>
  <p><strong>Randament chirie Timișoara</strong>: chirie clasică pe termen lung oferă 4,5–6% anual brut (după impozit 8% și ANAF rămân 4–5,5% net), în timp ce regimul hotelier administrat de RealTrust generează un <strong>ROI net verificat de 9.4%</strong> anual datorită ocupării 78–88% și ADR de 55–95 €/noapte. Vezi <a href="https://realtrust.ro/calculator-roi">calculatorul de randament</a> pentru o comparație personalizată pe proprietatea ta.</p>

  <h3>Evaluator ANEVAR Timișoara — evaluări oficiale acreditate</h3>
  <p>Pentru tranzacțiile bancare, succesiuni, partaje sau credite ipotecare colaborăm cu <strong>evaluator ANEVAR Timișoara</strong> acreditat (Asociația Națională a Evaluatorilor Autorizați din România). Rapoarte de evaluare oficiale acceptate de toate băncile (BCR, BRD, Raiffeisen, ING, Banca Transilvania), notari și instanțe — livrare 3–5 zile lucrătoare, prețuri transparente.</p>

  <h3>Piața imobiliară Timișoara — evoluție și analize trimestriale</h3>
  <p>Monitorizăm continuu <strong>piața imobiliară Timișoara evoluție</strong>: rapoarte trimestriale pe micro-zone (ISHO, Complex Studențesc, Iosefin, Dumbrăvița, Giroc), date despre prețul mediu pe metru pătrat, randamentul chiriilor, viteza de tranzacționare și impactul proiectelor majore (Iulius Town, Openville, Parcul Industrial Timișoara). Vezi <a href="https://realtrust.ro/piata-imobiliara-timisoara">analiza completă a pieței imobiliare Timișoara</a>.</p>
`;

const BASE_URL = 'https://realtrust.ro';
const SUPABASE_URL = 'https://mvzssjyzbwccioqvhjpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8';
const PROTECTED_HEAD_PATTERNS = [
  /<!-- GA4 Global Site Tag -->[\s\S]*?<!-- \/GA4 Global Site Tag -->/i,
  /<meta name="google-site-verification" content="[^"]*"\s*\/?>/i,
];

/**
 * Neighborhood data mirrored from src/data/neighborhoods.ts.
 * This is the canonical source — keep in sync when adding zones.
 */
const neighborhoods = [
  { slug: 'zona-girocului', name: 'Zona Girocului', fullName: 'Zona Girocului', avgPrice: 1650, faq: [
    { q: 'Care este prețul mediu pe metru pătrat în zona Girocului?', a: 'Prețul mediu în zona Girocului este de aproximativ 1.650 €/mp, cu 10-15% sub media orașului Timișoara.' },
    { q: 'Ce facilități sunt disponibile în zona Girocului?', a: 'Shopping City Timișoara la 5 minute, parcuri, școli, grădinițe și linii de autobuz frecvente.' },
    { q: 'Este Girocului potrivit pentru investiții în regim hotelier?', a: 'Da, prețuri accesibile și cerere ridicată. RealTrust oferă administrare completă cu randamente de 7-9% net.' },
  ]},
  { slug: 'zona-aradului', name: 'Zona Aradului', fullName: 'Zona Aradului', avgPrice: 1780, faq: [
    { q: 'Cât de aproape este zona Aradului de aeroport?', a: 'Aeroportul Internațional Timișoara este la aproximativ 10 minute cu mașina.' },
    { q: 'Care sunt avantajele zonei Aradului?', a: 'Acces rapid la aeroport, proximitatea Iulius Town și Openville, profil de chiriași cu venituri ridicate.' },
  ]},
  { slug: 'circumvalatiunii', name: 'Circumvalațiunii', fullName: 'Circumvalațiunii', avgPrice: 1920, faq: [
    { q: 'Ce rată de ocupare au apartamentele din Circumvalațiunii?', a: 'Peste 90% ocupare în Complex City of Mara, gestionate de RealTrust.' },
    { q: 'Ce facilități sunt în zona Circumvalațiunii?', a: 'Parcul Rozelor, Bega Shopping Center, Universitatea de Vest, tramvai și autobuz la sub 100m.' },
  ]},
  { slug: 'sagului', name: 'Șagului', fullName: 'Zona Șagului', avgPrice: 1580, faq: [
    { q: 'Cât costă un apartament pe Calea Șagului?', a: 'Prețul mediu este 1.580 €/mp, cu 15-20% sub media orașului.' },
    { q: 'Ce atracții sunt în zona Șagului?', a: 'Amazonia Aquapark la 5 minute, parcuri, școli și tramvai spre centru (15 min).' },
  ]},
  { slug: 'complex-studentesc', name: 'Complex Studențesc', fullName: 'Complexul Studențesc', avgPrice: 1720, faq: [
    { q: 'Ce randament oferă o investiție în Complexul Studențesc?', a: 'Randamente de 8-10% net, susținute de cererea celor peste 40.000 de studenți.' },
  ]},
  { slug: 'calea-lipovei', name: 'Calea Lipovei', fullName: 'Calea Lipovei', avgPrice: 1550, faq: [
    { q: 'De ce sunt prețurile mai mici pe Calea Lipovei?', a: 'Zonă în curs de modernizare (1.550 €/mp), cu potențial mare de apreciere.' },
  ]},
  { slug: 'isho', name: 'ISHO', fullName: 'ISHO & Fabric', avgPrice: 2150, faq: [
    { q: 'Ce face ISHO diferit?', a: 'Cel mai iconic proiect de regenerare urbană din Timișoara — complex mixed-use pe malul Begăi.' },
    { q: 'Care este prețul mediu la ISHO?', a: '2.150 €/mp, cel mai ridicat din Timișoara.' },
    { q: 'Ce randament au investițiile imobiliare în ISHO?', a: 'ROI net 8–10% în regim hotelier RealTrust, datorită cererii constante și aprecierii capitalului peste media pieței Timișoara.' },
    { q: 'Ce este în apropiere de ISHO și Fabric?', a: 'Piața Traian, City Business Centre, Iulius Town, malul Begăi, Centrul Vechi (Piața Unirii) — toate la 5–15 minute pe jos sau cu mașina.' },
  ], seoBody: `
    <h2>Apartamente de vânzare în ISHO &amp; Fabric, Timișoara</h2>
    <p>Cartierul <strong>ISHO</strong> și zona istorică <strong>Fabric</strong> formează cea mai dinamică micro-piață imobiliară din Timișoara. ISHO este cel mai iconic proiect de regenerare urbană din oraș — complex mixed-use pe malul Begăi cu apartamente premium, birouri, retail și spații verzi. Preț mediu 2.150 €/mp, cu apreciere constantă și cerere de chirie ridicată.</p>
    <h2>Investiții imobiliare ISHO Timișoara — randament și ROI</h2>
    <p>Apartamentele din ISHO oferă <strong>randament net 8–10% în regim hotelier</strong> administrat de RealTrust, datorită proximității față de <strong>City Business Centre</strong>, <strong>Iulius Town</strong>, Vox Park și Centrul Vechi. Cumpărătorii pot accesa <strong>credit ipotecar Timișoara</strong> cu DAE de la 6,2% prin partenerii noștri bancari.</p>
    <h3>Puncte de interes lângă ISHO &amp; Fabric</h3>
    <p><strong>Piața Traian</strong> (reper istoric Fabric, 5 min), <strong>City Business Centre</strong> (hub corporate, 7 min), Iulius Town &amp; Openville (10 min), Centrul Vechi cu Piața Unirii și Catedrala Mitropolitană (10 min), Spitalul Județean (8 min), UVT &amp; Politehnica (12 min), Aeroport (15 min).</p>
    <h3>Apartamente de închiriat ISHO Timișoara</h3>
    <p>Pentru chirie clasică, ISHO atrage chiriași corporate (Continental, Hella, Nokia) și expați cu venituri ridicate. Chirie medie 1 cameră: 450–550 €/lună; 2 camere: 600–800 €/lună. Pentru regim hotelier, ocupare medie 78% și ADR 65–95€/noapte.</p>
    <h3>Spații comerciale &amp; terenuri ISHO Fabric</h3>
    <p>Zona include și <strong>spații comerciale Timișoara</strong> de tip street retail în ISHO Galleria și pe Bulevardul Take Ionescu, plus <strong>terenuri de vânzare Timișoara</strong> intravilan în Fabric pentru dezvoltări mici. RealTrust intermediază închirieri și vânzări pentru investitori interesați de yield comercial 7–9% net.</p>
    <h3>Piața imobiliară Timișoara — context ISHO</h3>
    <p><strong>Piața imobiliară Timișoara</strong> crește anual cu 5–8% în 2025–2026, iar ISHO este pol de creștere cu apreciere peste medie. Vezi <a href="https://realtrust.ro/piata-imobiliara-timisoara">analiza completă a pieței</a> și <a href="https://realtrust.ro/calculator-roi">calculatorul de randament</a>.</p>
  ` },
  { slug: 'iosefin', name: 'Iosefin', fullName: 'Iosefin', avgPrice: 1850, faq: [
    { q: 'Care este prețul mediu pe metru pătrat în Iosefin Timișoara?', a: 'Prețurile apartamentelor în Iosefin variază între 1.700 și 2.100 €/mp (medie 1.850 €/mp). Garsonierele se tranzacționează între 60.000 și 75.000 €.' },
    { q: 'De ce să investesc în Iosefin?', a: 'Arhitectură habsburgică, Piața Iosefin, Sinagoga din Iosefin, acces 8 min pe jos spre Piața Unirii. Randament regim hotelier 8–9% net.' },
    { q: 'Cum evoluează piața imobiliară Iosefin?', a: 'Creștere de ~7% în 2025, susținută de cererea expaților și aprecierea clădirilor istorice renovate.' },
    { q: 'Sunt disponibile garsoniere de vânzare Iosefin?', a: 'Da, 60.000–75.000 €, atât în clădiri istorice renovate, cât și în proiecte noi pe malul Begăi.' },
  ], seoBody: `
    <h2>Apartamente de vânzare în Iosefin, Timișoara — cartier istoric pe malul Begăi</h2>
    <p>Cartierul <strong>Iosefin</strong> este una dintre cele mai vechi și emblematice zone ale Timișoarei, recunoscut pentru arhitectura habsburgică, <strong>Piața Iosefin</strong> (reper comercial vital), <strong>Sinagoga din Iosefin</strong> (monument istoric emblematic) și acces pietonal de 8 minute spre Piața Unirii. <strong>Bulevardul 16 Decembrie 1989</strong> traversează cartierul și asigură legături excelente de tramvai (liniile 1, 2) către UVT și Iulius Town (10 minute).</p>
    <h2>Prețuri apartamente Iosefin Timișoara — analiză 2026</h2>
    <p><strong>Prețurile apartamentelor în Iosefin Timișoara</strong> variază între 1.700 și 2.100 €/mp (medie 1.850 €/mp). Clădirile istorice renovate ating 2.000–2.100 €/mp, iar cele cu lucrări necesare 1.700–1.800 €/mp. Factori de influență: starea structurală (clădiri monument vs. blocuri noi), proximitatea față de malul Begăi și nivelul de finisaje. Față de Cetate (2.300+ €/mp), Iosefin oferă același acces ultracentral la prețuri cu 15–20% mai mici.</p>
    <h3>Garsoniere de vânzare Iosefin Timișoara</h3>
    <p><strong>Garsonierele de vânzare în Iosefin</strong> sunt o tipologie foarte căutată în zona centrală — preț 60.000–75.000 €, suprafețe 28–38 mp. Cerere ridicată pentru regim hotelier (turism cultural) și pentru chirie pe termen lung din partea studenților UVT și a tinerilor profesioniști.</p>
    <h3>Piața imobiliară Iosefin — tendințe și investitori</h3>
    <p><strong>Piața imobiliară Iosefin</strong> a crescut cu ~7% în 2025, susținută de cererea pentru închirieri pe termen lung din partea expaților și a profesioniștilor creativi, plus apreciere de capital constantă pentru clădirile istorice renovate. Profil tipic investitor: cumpărător 35–55 ani, focus pe randament regim hotelier (8–9% net) și apreciere capital pe 5–10 ani.</p>
    <h3>Puncte de interes lângă Iosefin</h3>
    <p><strong>Piața Iosefin</strong> (reper comercial, 2 min), <strong>Sinagoga din Iosefin</strong> (monument istoric, 5 min), Catedrala Romano-Catolică (3 min), malul Begăi (1 min), Piața Unirii (8 min pe jos), Gara de Nord (5 min), UVT (10 min cu tramvaiul de pe Bulevardul 16 Decembrie 1989), Iulius Town (10 min).</p>
    <h3>Apartamente de închiriat Iosefin Timișoara</h3>
    <p>Pentru chirie clasică, Iosefin atrage expați, profesioniști creativi și familii tinere. Chirie medie 1 cameră: 380–480 €/lună; 2 camere: 520–680 €/lună. Pentru regim hotelier, ocupare 78–85% și ADR 55–80€/noapte. Vezi <a href="https://realtrust.ro/calculator-roi">calculatorul de randament</a> și <a href="https://realtrust.ro/piata-imobiliara-timisoara">analiza pieței Timișoara</a>.</p>
  ` },
  { slug: 'dumbravita', name: 'Dumbrăvița', fullName: 'Dumbrăvița', avgPrice: 1680, faq: [
    { q: 'Care este prețul mediu pe metru pătrat în Dumbrăvița?', a: 'Apartamente noi 1.680 €/mp, cu 15–20% sub media Timișoara. Case și vile între 180.000 și 380.000 €.' },
    { q: 'Ce ansambluri rezidențiale sunt disponibile în Dumbrăvița?', a: 'Iris Residence, Lipovei Residence, Cetatea Veche Residence — apartamente clasa A energetică cu parcare inclusă.' },
    { q: 'Sunt disponibile case de vânzare în Dumbrăvița?', a: 'Da, vile P+1, duplex-uri și case individuale între 180.000 și 380.000 €, aproape de Pădurea Verde și școli.' },
    { q: 'Cum este accesul din Dumbrăvița spre centură și aeroport?', a: 'Acces centura Timișoara direct (3 min), Aeroportul „Traian Vuia" la 8 min. Autobuze E1, E4, 33 spre Iulius Town și Centru.' },
    { q: 'Există terenuri intravilane de vânzare Dumbrăvița?', a: 'Da, teren intravilan Dumbrăvița 80–150 €/mp, pentru case, duplex-uri sau ansambluri mici.' },
  ], seoBody: `
    <h2>Imobiliare Dumbrăvița — apartamente noi, case și vile lângă Pădurea Verde</h2>
    <p><strong>Dumbrăvița</strong> este cea mai dinamică zonă metropolitană a Timișoarei, situată la nord-est, cu <strong>acces centura Timișoara</strong> direct (3 minute) și Aeroportul Internațional „Traian Vuia" la 8 minute. Profil cumpărători: familii tinere 28–45 ani, profesioniști IT din Iulius Town &amp; Openville, navetiști care preferă liniștea suburbană.</p>

    <h2>Tipuri de proprietăți în Dumbrăvița</h2>
    <h3>Apartamente noi în ansambluri rezidențiale</h3>
    <p>Apartamente noi în <strong>ansamblu rezidențial Dumbrăvița</strong> — Iris Residence, Lipovei Residence, Cetatea Veche Residence și dezvoltări 2024–2026. Prețuri 65.000–145.000 € (1.680 €/mp medie), clasa A energetică, finisaje moderne, locuri de parcare incluse, lifturi, intercom video.</p>
    <h3>Case de vânzare Dumbrăvița</h3>
    <p><strong>Case de vânzare Dumbrăvița</strong> — vile P+1, duplex-uri și case individuale între 180.000 și 380.000 €, în zone rezidențiale liniștite. Construcții 2018–2026, terenuri 250–500 mp, finisaje premium, garaj inclus.</p>
    <h3>Teren intravilan Dumbrăvița</h3>
    <p><strong>Teren intravilan Dumbrăvița</strong> 80–150 €/mp, ideal pentru construcții rezidențiale (case, duplex-uri) sau pentru dezvoltatori interesați de ansambluri mici. Parcele 400–800 mp cu utilități la limită.</p>

    <h2>Stil de viață și facilități în Dumbrăvița</h2>
    <p><strong>Pădurea Verde</strong> — parc natural protejat la marginea cartierului, spațiu unic de recreere pentru familii cu copii (jogging, ciclism, picnic). Supermarketuri Lidl și Kaufland în zonă, Selgros la 3 minute, plus restaurante locale și cafenele de specialitate.</p>

    <h3>Educație și facilități pentru familii — școli și grădinițe Dumbrăvița</h3>
    <p><strong>Școli și grădinițe Dumbrăvița</strong>: Școala Gimnazială „Dimitrie Țichindeal", grădinițele Smart Kids și Happy Kids, Liceul Spectrum (particular), creșe private. Infrastructură educațională completă pentru segmentul demografic principal — familii cu copii.</p>

    <h3>Transport și accesibilitate</h3>
    <p>Autobuze E1, E4 și 33 leagă Dumbrăvița de Iulius Town (10 min) și Centru (15 min). <strong>Acces centura Timișoara</strong> permite navigarea rapidă către Aeroport, zona industrială Calea Aradului și DN6 spre Arad.</p>

    <h3>Piața imobiliară Dumbrăvița — analiză 2026</h3>
    <p>Dumbrăvița a crescut cu ~6% în 2025, susținută de cererea familiilor tinere și a profesioniștilor IT relocați. Preț mediu apartamente noi: 1.680 €/mp (vs. 2.000+ €/mp în Centru). Comparativ cu Giroc (1.650 €/mp) și Moșnița Nouă (1.580 €/mp), Dumbrăvița oferă cea mai bună infrastructură și acces la aeroport.</p>

    <p>Vezi <a href="https://realtrust.ro/calculator-roi">calculatorul de randament</a> și <a href="https://realtrust.ro/evaluare-gratuita">evaluarea gratuită</a> pentru proprietățile tale din Dumbrăvița.</p>
  ` },
  { slug: 'giroc', name: 'Giroc', fullName: 'Giroc', avgPrice: 1620, faq: [
    { q: 'Care este prețul mediu pe metru pătrat în Giroc?', a: 'Apartamente 1.500–1.800 €/mp (medie 1.620 €/mp). Case 165.000–320.000 €. Terenuri intravilane 70–130 €/mp.' },
    { q: 'Ce ansambluri rezidențiale sunt în Giroc?', a: 'Green Forest Residence, Pădurea Verde Giroc, Lake View Residence, City Garden Giroc — apartamente clasa A cu parcare.' },
    { q: 'Ce școli sunt în Giroc?', a: 'Școala Gimnazială Giroc, Liceul Tehnologic și 5+ grădinițe publice și private.' },
    { q: 'Cum este transportul în comun Giroc Timișoara?', a: 'Autobuze 33 și 40 spre Piața Maria și UVT, frecvență 15 min. Drum 12–25 min în funcție de oră.' },
    { q: 'Ce magazine sunt în Giroc?', a: 'Lidl, Penny Market, supermarket-uri locale, plus Shopping City Timișoara (Auchan) la 5 min.' },
  ], seoBody: `
    <h2>Apartamente de vânzare și închiriat Giroc — comuna metropolitană la 10 minute de Centru</h2>
    <p><strong>Giroc</strong> este una dintre cele mai căutate comune metropolitane de la sud de Timișoara, situată la 10 minute de Centru și la 5 minute de Shopping City Timișoara (Auchan). Pol rezidențial premium pentru familii tinere și profesioniști care lucrează la Continental, Hella și în zona industrială Calea Șagului.</p>

    <h2>Tipuri de proprietăți în Giroc</h2>
    <h3>Apartamente de vânzare Giroc</h3>
    <p><strong>Apartamente de vânzare în Giroc</strong> — prețuri 1.500–1.800 €/mp (medie 1.620 €/mp). Garsoniere 55.000–72.000 €, 2 camere 80.000–105.000 €, 3 camere 120.000–145.000 €. Apartamente noi clasa A energetică în ansamblurile principale.</p>
    <h3>Case noi Giroc</h3>
    <p><strong>Case noi Giroc</strong> între 165.000 și 320.000 € — vile P+1, duplex-uri și case individuale. Construcții 2020–2026, terenuri 300–600 mp, finisaje moderne, garaj inclus.</p>
    <h3>Ansamblu rezidențial Giroc</h3>
    <p>Principalele <strong>ansambluri rezidențiale Giroc</strong>: Green Forest Residence, Pădurea Verde Giroc, Lake View Residence, City Garden Giroc — apartamente clasa A energetică, parcare inclusă, locuri de joacă pentru copii.</p>
    <h3>Teren intravilan Giroc</h3>
    <p><strong>Teren intravilan Giroc</strong> 70–130 €/mp, parcele 400–800 mp ideale pentru construcții familiale. Utilități la limită.</p>

    <h2>Ghidul cumpărătorului în Giroc — facilități și viață locală</h2>
    <h3>Școli Giroc și grădinițe</h3>
    <p><strong>Școli Giroc</strong>: Școala Gimnazială Giroc, Liceul Tehnologic, plus 5+ grădinițe publice și private — infrastructură educațională completă pentru familii cu copii.</p>
    <h3>Magazine Giroc și viață cotidiană</h3>
    <p><strong>Magazine Giroc</strong>: Lidl, Penny Market, supermarket-uri locale, farmacii. Shopping City Timișoara (Auchan) la 5 min. Stadion comunal renovat, lacul Giroc și parcuri.</p>
    <h3>Transport în comun Giroc Timișoara</h3>
    <p><strong>Transport în comun Giroc Timișoara</strong>: autobuzele 33 și 40 leagă Giroc de Piața Maria și UVT (frecvență 15 min). Drum 12 min în afara orelor de vârf, 25–30 min la ora de vârf pe DJ595.</p>
    <h3>Administrație locală — Primăria Giroc</h3>
    <p><strong>Primăria Giroc</strong> oferă servicii moderne pentru rezidenți: certificate de urbanism rapide (5 zile), taxe locale cu 20% sub Timișoara, programe de modernizare a infrastructurii.</p>

    <h3>Avantaje și dezavantaje Giroc</h3>
    <p><strong>Avantaje</strong>: liniște, spațiu verde abundent (lacul Giroc, parcuri), aer curat, taxe locale mai mici, școli bune. <strong>Dezavantaje</strong>: trafic aglomerat dimineața pe DJ595, distanță față de Centrul Vechi (10–25 min).</p>

    <p>Vezi <a href="https://realtrust.ro/calculator-roi">calculatorul de randament</a> și <a href="https://realtrust.ro/evaluare-gratuita">evaluarea gratuită</a> pentru proprietățile tale din Giroc.</p>
  ` },
];

// Map for type-safety on optional seoBody
type Neighborhood = (typeof neighborhoods)[number] & { seoBody?: string };

interface DbProperty {
  slug: string;
  name: string;
  location: string;
  bedrooms: number | null;
  size: number | null;
  floor: string | null;
  roi_percentage: string | null;
  capital_necesar: number | null;
  listing_type: string | null;
  year_built: number | null;
  base_price_per_night: number | null;
}

/**
 * Fetches active properties with slugs from the database at build time.
 */
async function fetchActiveProperties(): Promise<DbProperty[]> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/properties?is_active=eq.true&slug=not.is.null&select=slug,name,location,bedrooms,size,floor,roi_percentage,capital_necesar,listing_type,year_built,base_price_per_night&order=display_order.asc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn(`[prerender-seo] Failed to fetch properties: ${res.status}`);
      return [];
    }
    return await res.json() as DbProperty[];
  } catch (err) {
    console.warn('[prerender-seo] Could not fetch properties from DB:', err);
    return [];
  }
}

/**
 * Extracts a clean zone from location.
 */
function extractZone(location: string): string {
  if (!location || location.startsWith('http')) return 'Timișoara';
  return location.replace(/,?\s*(Timișoara|Timisoara|Timiș|Timis)\s*/gi, '').replace(/^Strada\s+/i, 'Str. ').trim() || 'Timișoara';
}

function getPropertyType(bedrooms: number | null): string {
  if (bedrooms === 1) return 'Garsonieră';
  if (bedrooms && bedrooms >= 2) return `Apartament ${bedrooms} camere`;
  return 'Apartament';
}

function buildPropertyRoutes(properties: DbProperty[]): PrerenderRoute[] {
  return properties.map((p) => {
    const zone = extractZone(p.location);
    const type = getPropertyType(p.bedrooms);
    const rooms = p.bedrooms || 1;
    const pricePart = p.capital_necesar
      ? `${p.capital_necesar.toLocaleString('ro-RO')}€`
      : p.base_price_per_night
      ? `${p.base_price_per_night}€/noapte`
      : '';

    const title = pricePart
      ? `${type} în ${zone}, Timișoara | ${pricePart} | RealTrust`
      : `${type} în ${zone}, Timișoara | RealTrust`;

    const descParts: string[] = [];
    descParts.push(`Descoperă acest ${type.toLowerCase()} situat în ${zone}`);
    if (p.floor) descParts[0] += `, etaj ${p.floor}`;
    descParts[0] += '.';
    if (p.roi_percentage) {
      descParts.push(`Ideal pentru investiție cu un randament estimat de ${p.roi_percentage}.`);
    }
    descParts.push('Administrare prin RealTrust inclusă.');
    const description = descParts.join(' ').slice(0, 160);

    const canonical = `${BASE_URL}/proprietate/${p.slug}`;

    return {
      path: `/proprietate/${p.slug}`,
      title,
      description,
      h1: `${type} de vânzare în ${zone}, Timișoara`,
      canonical,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: p.name,
          url: canonical,
          description,
          ...(p.capital_necesar && { price: p.capital_necesar, priceCurrency: 'EUR' }),
          numberOfRooms: rooms,
          ...(p.size && { floorSize: { '@type': 'QuantitativeValue', value: p.size, unitCode: 'MTK' } }),
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Timișoara',
            addressRegion: 'Timiș',
            addressCountry: 'RO',
            ...(zone !== 'Timișoara' && { streetAddress: zone }),
          },
          ...(p.year_built && { yearBuilt: p.year_built }),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description,
          url: canonical,
          brand: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: p.capital_necesar || p.base_price_per_night || 0,
            availability: 'https://schema.org/InStock',
            url: canonical,
          },
        },
      ],
    };
  });
}

/**
 * Guest apartments live in src/data/properties.ts (static, not in the DB).
 * Parse the minimal SEO fields out of the source so each unit gets a
 * prerendered page with a "cazare regim hotelier" title, RO description and
 * LodgingBusiness + HotelRoom structured data.
 */
interface StaticGuestProperty {
  slug: string;
  name: string;
  location: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  pricePerNight: number;
  amenities: string[];
  image?: string;
  isActive: boolean;
}

export function parseStaticGuestProperties(): StaticGuestProperty[] {
  const file = path.resolve(process.cwd(), 'src/data/properties.ts');
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, 'utf-8');
  const blocks = src.split(/\n\s{4}\{\n/).slice(1);
  const num = (block: string, key: string): number => {
    const m = block.match(new RegExp(`${key}:\\s*([0-9.]+)`));
    return m ? Number(m[1]) : 0;
  };
  const str = (block: string, key: string): string => {
    const m = block.match(new RegExp(`${key}:\\s*"([^"]*)"`));
    return m ? m[1] : '';
  };
  const out: StaticGuestProperty[] = [];
  for (const block of blocks) {
    const slug = str(block, 'slug');
    const name = str(block, 'name');
    if (!slug || !name) continue;
    const amenitiesMatch = block.match(/amenities:\s*\[([\s\S]*?)\]/);
    const amenities = amenitiesMatch
      ? Array.from(amenitiesMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
      : [];
    const imgMatch = block.match(/images:\s*\[\s*([^,\]]+)/);
    const rawImg = imgMatch ? imgMatch[1].trim() : '';
    out.push({
      slug,
      name,
      location: str(block, 'location'),
      capacity: num(block, 'capacity'),
      bedrooms: num(block, 'bedrooms'),
      bathrooms: num(block, 'bathrooms'),
      size: num(block, 'size'),
      pricePerNight: num(block, 'pricePerNight'),
      amenities,
      image: /^"?https?:/.test(rawImg) ? rawImg.replace(/^"|"$/g, '') : undefined,
      isActive: !/isActive:\s*false/.test(block),
    });
  }
  return out;
}

export function buildGuestPropertyRoutes(taken: Set<string>): PrerenderRoute[] {
  return parseStaticGuestProperties()
    .filter((p) => p.isActive && !taken.has(`/proprietate/${p.slug}`))
    .map((p) => {
      const zone = extractZone(p.location);
      const canonical = `${BASE_URL}/proprietate/${p.slug}`;
      const title = `${p.name} - Cazare Regim Hotelier Timișoara | RealTrust`;
      const highlights = ['parcare', 'Wi-Fi', 'self check-in'].filter((h) =>
        p.amenities.some((a) => a.toLowerCase().includes(h.toLowerCase().split(' ')[0]))
      );
      const amenityText = (highlights.length ? highlights : ['parcare', 'Wi-Fi', 'self check-in']).join(', ');
      const rawDesc = `Cazare regim hotelier în ${zone}, Timișoara. ${p.capacity ? `${p.capacity} oaspeți. ` : ''}${amenityText}. Rezervare directă, fără comision.`;
      const description = rawDesc.length > 158 ? `${rawDesc.slice(0, 155).trimEnd()}…` : rawDesc;

      return {
        path: `/proprietate/${p.slug}`,
        title,
        description,
        h1: `${p.name} — cazare regim hotelier în ${zone}, Timișoara`,
        canonical,
        image: p.image,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'LodgingBusiness',
            name: p.name,
            description,
            url: canonical,
            ...(p.image && { image: p.image }),
            priceRange: '€€',
            address: {
              '@type': 'PostalAddress',
              streetAddress: zone,
              addressLocality: 'Timișoara',
              addressRegion: 'Timiș',
              addressCountry: 'RO',
            },
            ...(p.amenities.length > 0 && {
              amenityFeature: p.amenities.slice(0, 15).map((a) => ({
                '@type': 'LocationFeatureSpecification',
                name: a,
                value: true,
              })),
            }),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'HotelRoom',
            name: p.name,
            description,
            url: canonical,
            ...(p.image && { image: p.image }),
            ...(p.bedrooms && { numberOfRooms: p.bedrooms }),
            ...(p.bathrooms && { numberOfBathroomsTotal: p.bathrooms }),
            ...(p.size && { floorSize: { '@type': 'QuantitativeValue', value: p.size, unitCode: 'MTK' } }),
            ...(p.capacity && {
              occupancy: { '@type': 'QuantitativeValue', maxValue: p.capacity, unitText: 'oaspeți' },
            }),
            ...(p.amenities.length > 0 && {
              amenityFeature: p.amenities.slice(0, 15).map((a) => ({
                '@type': 'LocationFeatureSpecification',
                name: a,
                value: true,
              })),
            }),
            ...(p.pricePerNight && {
              offers: {
                '@type': 'Offer',
                price: p.pricePerNight,
                priceCurrency: 'EUR',
                availability: 'https://schema.org/InStock',
                url: `${canonical}#disponibilitate`,
              },
            }),
          },
        ],
      } satisfies PrerenderRoute;
    });
}

function buildStaticRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [];

  // Homepage — overrides dist/index.html with rich SEO body so crawlers
  // (Firecrawl, Bingbot, AI Overviews) see local entities without JS.
  routes.push({
    path: '/',
    title: 'RealTrust Timișoara | Imobiliare, Regim Hotelier & ROI',
    description: 'Investește profitabil în imobiliare Timișoara! Apartamente regim hotelier, vânzări, închirieri lângă UVT, Iulius Town, Aeroport. Calculează ROI gratuit!',
    h1: 'RealTrust Timișoara — Investiții Imobiliare Profitabile & Regim Hotelier',
    canonical: `${BASE_URL}/`,
    seoBody: HOMEPAGE_SEO_BODY,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'RealTrust & ApArt Hotel Timișoara',
      description: 'Investește profitabil în imobiliare Timișoara! Apartamente regim hotelier, vânzări, închirieri lângă UVT, Iulius Town, Aeroport. Calculează ROI gratuit!',
      url: `${BASE_URL}/`,
      telephone: '+40799069256',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Strada Samuel Clain Micu Nr.14, ap.4',
        addressLocality: 'Timișoara',
        addressRegion: 'Timiș',
        postalCode: '300125',
        addressCountry: 'RO',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 45.7489, longitude: 21.2087 },
      areaServed: 'Timișoara',
      priceRange: '$$',
    },
  });

  // /imobiliare-timisoara
  routes.push({
    path: '/imobiliare-timisoara',
    title: 'Imobiliare Timișoara — Apartamente pe Zone | RealTrust',
    description: 'Explorează apartamentele de vânzare din Timișoara pe zone: Girocului, Aradului, Circumvalațiunii, Șagului, Complex Studențesc, Calea Lipovei, ISHO.',
    h1: 'Apartamente de Vânzare în Timișoara',
    canonical: `${BASE_URL}/imobiliare-timisoara`,
    seoBody: HOMEPAGE_SEO_BODY,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'RealTrust Imobiliare Timișoara',
      description: 'Agenție imobiliară premium din Timișoara specializată în vânzări, investiții și administrare apartamente în regim hotelier.',
      url: `${BASE_URL}/imobiliare-timisoara`,
      telephone: '+40799069256',
      address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
    },
  });

  // Neighborhood pages
  for (const n of neighborhoods) {
    const faqSchema = n.faq.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: n.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    } : null;

    routes.push({
      path: `/imobiliare-timisoara/${n.slug}`,
      title: `Apartamente ${n.name} Timișoara | RealTrust Imobiliare`,
      description: `Apartamente de vânzare în ${n.fullName}, Timișoara. Prețuri de la ${n.avgPrice.toLocaleString('ro-RO')} €/mp, administrare RealTrust inclusă.`,
      h1: `Apartamente de vânzare în ${n.fullName}, Timișoara`,
      canonical: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
      seoBody: (n as Neighborhood).seoBody,
      jsonLd: faqSchema ? [
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: `Apartamente ${n.fullName} Timișoara`,
          url: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
          address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateAgent',
          name: `RealTrust — ${n.fullName}, Timișoara`,
          url: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
          telephone: '+40799069256',
          areaServed: { '@type': 'Place', name: `${n.fullName}, Timișoara` },
          address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
        },
        faqSchema,
      ] : {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: `Apartamente ${n.fullName} Timișoara`,
        url: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
        address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
      },
    });
  }

  // Calculator ROI
  routes.push({
    path: '/calculator-roi',
    title: 'Calculator ROI Regim Hotelier vs Chirie Clasică | RealTrust',
    description: 'Calculează randamentul apartamentului tău: regim hotelier vs chirie clasică. Compară veniturile lunare și ROI-ul anual cu management RealTrust.',
    h1: 'Calculator ROI — Regim Hotelier',
    canonical: `${BASE_URL}/calculator-roi`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Calculator ROI RealTrust',
      description: 'Calculator randament investiție imobiliară regim hotelier vs chirie clasică Timișoara',
      url: `${BASE_URL}/calculator-roi`,
      applicationCategory: 'FinanceApplication',
    },
  });

  // Analiza ROI Apartament
  routes.push({
    path: '/analiza-roi-apartament',
    title: 'Analiza ROI Apartament | Randament investiții imobiliare',
    description: 'Analiză profit apartament România: calculează randament investiții imobiliare, ROI net, evoluția prețurilor și zonele potrivite pentru investiții în complexe.',
    h1: 'Analiza ROI Apartament pentru investiții profitabile în România',
    canonical: `${BASE_URL}/analiza-roi-apartament`,
    seoBody: `
      <h2>Randament investiții imobiliare și analiză profit apartament România</h2>
      <p>Pagina Analiza ROI Apartament oferă un calculator interactiv pentru investitori care vor să compare chiria clasică, administrarea în regim hotelier și aprecierea capitalului. Modelul folosește ocupare de 75%, deducere operațională de 27% și scenarii de randament pentru apartamente standard, RealTrust standard și complex premium.</p>
      <h2>Complexe rezidențiale recomandate pentru ROI</h2>
      <p>Analiza conectează direct investitorii cu <a href="${BASE_URL}/complexe" tabindex="-1">secțiunea Complexe</a>, inclusiv ISHO, City of Mara, Ateneo și Fructus Plaza — zone unde randamentul depinde de poziționare, cerere corporate, lichiditate și calitatea administrării.</p>
    `,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FinancialProduct',
        name: 'Analiza ROI Apartament România',
        description: 'Calculator pentru randament investiții imobiliare, profit apartament și evoluția prețurilor în România.',
        url: `${BASE_URL}/analiza-roi-apartament`,
        provider: { '@type': 'RealEstateAgent', name: 'RealTrust & ApArt Hotel' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Cum se calculează randamentul unei investiții imobiliare?', acceptedAnswer: { '@type': 'Answer', text: 'Randamentul net se calculează împărțind venitul anual după costuri la valoarea totală a investiției.' } },
          { '@type': 'Question', name: 'De ce sunt importante complexele rezidențiale în analiza ROI?', acceptedAnswer: { '@type': 'Answer', text: 'Complexele noi au cerere mai bună, costuri previzibile și poziționare mai ușor de promovat către chiriași sau oaspeți premium.' } },
        ],
      },
    ],
  });

  routes.push({
    path: '/complexe/city-of-mara',
    title: 'Apartamente City of Mara Timișoara | Vânzare apartamente noi',
    description: 'Apartamente City of Mara Timișoara: investiții imobiliare Timișoara centru, randament estimat, tipuri de apartamente și disponibilități actualizate.',
    h1: 'Apartamente City of Mara Timișoara pentru locuire premium și investiție',
    canonical: `${BASE_URL}/complexe/city-of-mara`,
    seoBody: `
      <h2>Apartamente City of Mara — investiții imobiliare Timișoara centru</h2>
      <p>City of Mara este un complex rezidențial central din Timișoara, potrivit pentru cumpărători care caută apartamente noi, parcare, acces rapid către Iulius Town și potențial de randament prin închiriere sau regim hotelier.</p>
      <h2>Vânzare apartamente noi City of Mara</h2>
      <p>RealTrust oferă consultanță pentru selecția unităților disponibile, analiză ROI, comparație cu ISHO, Ateneo și Fructus Plaza și solicitare rapidă a listei actualizate de disponibilități.</p>
    `,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ApartmentComplex',
      name: 'City of Mara Timișoara',
      url: `${BASE_URL}/complexe/city-of-mara`,
      address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
    },
  });

  // Piața imobiliară
  routes.push({
    path: '/piata-imobiliara-timisoara',
    title: 'Piața Imobiliară Timișoara 2026 — Prețuri și Tendințe | RealTrust',
    description: 'Prețuri medii pe metru pătrat în Timișoara, tendințe piață imobiliară 2026. Cele mai scumpe și accesibile cartiere. Date actualizate lunar.',
    h1: 'Piața Imobiliară Timișoara — Aprilie 2026',
    canonical: `${BASE_URL}/piata-imobiliara-timisoara`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Piața Imobiliară Timișoara 2026',
      url: `${BASE_URL}/piata-imobiliara-timisoara`,
    },
  });

  // Evaluare gratuită
  routes.push({
    path: '/evaluare-gratuita',
    title: 'Evaluare Gratuită Proprietate Timișoara | RealTrust',
    description: 'Solicită o evaluare gratuită pentru proprietatea ta din Timișoara. Răspundem în maxim 24 de ore cu o estimare personalizată.',
    h1: 'Evaluare Gratuită a Proprietății',
    canonical: `${BASE_URL}/evaluare-gratuita`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Evaluare Gratuită Proprietate',
      description: 'Evaluare gratuită a proprietății tale din Timișoara de către echipa RealTrust',
      url: `${BASE_URL}/evaluare-gratuita`,
      provider: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
    },
  });

  // /despre-noi — page about the team and company (NOT a service pillar)
  routes.push({
    path: '/despre-noi',
    title: 'Despre RealTrust: Imobiliare & Regim Hotelier Timișoara',
    description: 'Echipa RealTrust: experți în imobiliare și regim hotelier Timișoara. Peste 60 proprietăți administrate cu ROI 9.4% net. Contactează-ne acum!',
    h1: 'Echipa din spatele RealTrust Timișoara',
    canonical: `${BASE_URL}/despre-noi`,
    seoBody: `
      <h2>Despre echipa RealTrust Timișoara</h2>
      <p>RealTrust este o echipă locală din Timișoara, coordonată de Adrian Costi (Fondator & CEO), specializată în <strong>consultanță imobiliară Timișoara</strong>, administrare proprietăți și regim hotelier.</p>
      <h3>Misiune, transparență și rezultate măsurabile</h3>
      <p>Oferim <strong>evaluare apartament Timișoara</strong> gratuită, analiză de <strong>randament chirie Timișoara</strong> versus regim hotelier, și comunicare transparentă pentru fiecare colaborare — ROI 9.4% net verificat pe peste 60 proprietăți.</p>
      <h3>Cuprins pagină</h3>
      <ul>
        <li>Misiunea noastră</li>
        <li>Povestea RealTrust & ApArt Hotel</li>
        <li>Două branduri, servicii complete</li>
        <li>Valorile companiei</li>
        <li>Date de contact</li>
        <li>Întrebări frecvente</li>
      </ul>
    `,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Despre RealTrust Timișoara',
      url: `${BASE_URL}/despre-noi`,
      mainEntity: {
        '@type': 'RealEstateAgent',
        name: 'RealTrust & ApArt Hotel',
        url: `${BASE_URL}/despre-noi`,
        telephone: '+40799069256',
        areaServed: 'Timișoara',
        address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
        founder: { '@type': 'Person', name: 'Adrian Costi', jobTitle: 'Fondator & CEO' },
      },
    },
  });

  // /oaspeti & /pentru-oaspeti — premium stays for guests
  for (const path of ['/oaspeti', '/pentru-oaspeti']) {
    routes.push({
      path,
      title: 'Cazare Premium Timișoara — Apartamente Regim Hotelier | RealTrust',
      description: 'Apartamente premium pentru cazare în Timișoara: check-in flexibil, rezervare directă, locații lângă Iulius Town, Centru, Spitalul Județean și Aeroport.',
      h1: 'Cazare Premium pentru Oaspeți în Timișoara',
      canonical: `${BASE_URL}${path}`,
      seoBody: `
        <h2>Apartamente premium pentru oaspeți în Timișoara</h2>
        <p>Listăm apartamentele disponibile pentru cazare în <strong>regim hotelier Timișoara</strong>, cu check-in flexibil, rezervare directă și filtrare după locație, preț, rating și capacitate.</p>
        <h3>Cazare business, city break și sejururi medicale</h3>
        <p>Oferta include apartamente aproape de Iulius Town, Complex Studențesc, Centru, Spitalul Județean, <strong>Continental Automotive Timișoara</strong>, <strong>Nokia Timișoara</strong> și Aeroportul Internațional Timișoara — ideale pentru turiști, familii, expați și călători business.</p>
      `,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Cazare Premium Timișoara',
        url: `${BASE_URL}${path}`,
      },
    });
  }

  // /investitii — investor-focused pillar page (distinct from /pentru-proprietari)
  routes.push({
    path: '/investitii',
    title: 'Investiții Imobiliare Timișoara | Randament 9.4% Net | RealTrust',
    description: 'Investiții imobiliare profitabile în Timișoara cu RealTrust. ROI 9.4% net, randament garantat, ghid gratuit 2026. Descarcă analiza completă.',
    h1: 'Investiții Imobiliare Timișoara: Ghid Complet pentru Randament Profitabil',
    canonical: `${BASE_URL}/investitii`,
    seoBody: `
      <h2>Tipuri de investiții imobiliare în Timișoara</h2>
      <p>Ca <strong>consultant imobiliar Timișoara</strong>, RealTrust structurează portofoliul de oportunități pentru investitori pe trei direcții clare: <strong>investiții în regim hotelier</strong> (ROI 9.4% net verificat anual), <strong>investiții buy-to-let</strong> pentru chirii pe termen lung (randament 6–7% brut) și <strong>flip imobiliar</strong> cu renovare strategică pentru revânzare (marjă 15–25% în 8–14 luni). Fiecare oportunitate include due diligence complet, proiecții ROI conservative și administrare profesională inclusă.</p>

      <h2>Evoluție prețuri imobiliare Timișoara 2020–2026</h2>
      <p><strong>Evoluție prețuri imobiliare Timișoara</strong>: media €/mp a crescut de la 1.250 € (2020) la 1.890 € (Q1 2026), cu un CAGR de aproximativ 7,1%. Cele mai puternice creșteri s-au înregistrat în ISHO (+62%), Circumvalațiunii / City of Mara (+48%) și Complex Studențesc (+41%). Prognoză 2026–2028: apreciere medie 5–8% anual, susținută de cererea din partea companiilor mari (Continental, Nokia, Hella, Flex, Atos) și de fluxul universitar (UVT, UPT, UMF — peste 40.000 studenți activi).</p>

      <h2>Analiza zonelor cheie din Timișoara pentru investitori</h2>
      <p>Cele mai performante micro-piețe pentru investitori în 2026: <strong>ISHO</strong> (2.150 €/mp, ocupare 85–90% regim hotelier), <strong>Centru / Cetate</strong> (apreciere capital + venit dual din business travel și turism), <strong>Complex Studențesc</strong> (cerere garantată 9 luni/an, randament 8–10% net), <strong>Calea Aradului</strong> (proximitate Aeroport + Continental Automotive — chiriași business cu venituri mari) și <strong>Dumbrăvița / Ghiroda</strong> (case noi, profil familial, apreciere capital peste media orașului).</p>

      <h3>Investiții în regim hotelier — randament verificat</h3>
      <p>Modelul nostru de <strong>regim hotelier Timișoara</strong> generează ROI 9.4% net verificat pe portofoliul activ (60+ apartamente). Include marketing pe Booking, Airbnb și platforme directe, check-in / check-out 24/7, curățenie hotelieră, mentenanță, raportare lunară și yield management dinamic. Comision 15–25% management + 15–23% comision platforme. Capital necesar de la 75.000 € pentru o garsonieră în Centru sau Complex Studențesc.</p>

      <h3>Calculator taxe notariale și costuri tranzacție</h3>
      <p>Costurile complete pentru cumpărarea unui apartament în Timișoara includ: <strong>onorariu notarial</strong> (~1% din valoarea tranzacției, conform grilei Camerei Notarilor Timiș), <strong>impozit pe tranzacție</strong> (3% peste 450.000 RON pentru proprietăți deținute sub 3 ani de vânzător; 1% peste 3 ani — suportat de vânzător), <strong>taxe ANCPI</strong> (intabulare ~0,15% + tarife fixe), <strong>comision agenție</strong> (2% RealTrust). Exemplu: pentru un apartament de 100.000 €, costurile suplimentare ale cumpărătorului sunt aproximativ 3.500–4.500 €. Folosește <a href="${BASE_URL}/calculator-roi" tabindex="-1">calculatorul ROI</a> pentru proiecția completă a investiției.</p>

      <h3>Credit ipotecar Timișoara — finanțare investiții</h3>
      <p>Consultanță gratuită <strong>credit ipotecar Timișoara</strong> prin parteneriatele cu BCR, BRD, Raiffeisen, ING și Banca Transilvania. Pentru investiții optime: avans 25–35%, perioadă 25–30 ani, DAE competitiv 6,5–7,5% (aprilie 2026). Te ajutăm să compari ofertele și să optimizezi structura financiară pentru maximizarea cash-flow-ului lunar.</p>

      <h3>Consultant imobiliar Timișoara — due diligence complet</h3>
      <p>Ca <strong>consultant imobiliar Timișoara</strong> de top, RealTrust verifică pentru fiecare oportunitate: situația juridică (extras CF actualizat, sarcini, litigii), starea tehnică (expertiză structurală, instalații), eficiența energetică, istoricul tranzacțiilor și potențialul real de venit (analiză comparabilă cu portofoliul nostru de 60+ proprietăți administrate). Raportul complet de due diligence este livrat în 5–7 zile.</p>

      <h3>Ghid investitor 2026 — descarcă gratuit</h3>
      <p>Ghidul investitorului 2026 (PDF, 40 pagini) include: analiză detaliată pe cartiere, calculator ROI cu scenarii multiple, structură fiscală optimă (PFA vs SRL), checklist due diligence, top 5 ansambluri rezidențiale recomandate și studii de caz reale din portofoliul RealTrust.</p>
    `,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'RealTrust & ApArt Hotel — Investiții Imobiliare Timișoara',
        url: `${BASE_URL}/investitii`,
        telephone: '+40799069256',
        areaServed: 'Timișoara',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Strada Samuel Clain Micu Nr.14, ap.4',
          addressLocality: 'Timișoara',
          addressRegion: 'Timiș',
          postalCode: '300125',
          addressCountry: 'RO',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Investiții Imobiliare Timișoara: Ghid Complet pentru Randament Profitabil',
        description: 'Ghid complet de investiții imobiliare în Timișoara: ROI 9.4% net, analiză cartiere, evoluție prețuri 2020–2026 și calculator costuri tranzacție.',
        author: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
        publisher: {
          '@type': 'Organization',
          name: 'RealTrust & ApArt Hotel',
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/images/hero-optimized-800w.webp` },
        },
        mainEntityOfPage: `${BASE_URL}/investitii`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Care este randamentul mediu al investițiilor imobiliare în Timișoara?',
            acceptedAnswer: { '@type': 'Answer', text: 'Pentru regim hotelier administrat de RealTrust, ROI mediu este 9.4% net anual, verificat pe portofoliul de 60+ apartamente. Pentru chirii pe termen lung, randamentul brut este 6–7%.' },
          },
          {
            '@type': 'Question',
            name: 'Ce capital minim este necesar pentru o investiție imobiliară în Timișoara?',
            acceptedAnswer: { '@type': 'Answer', text: 'De la 75.000 € pentru o garsonieră în Centru sau Complex Studențesc, cu finanțare bancară până la 75% din valoare prin credit ipotecar.' },
          },
          {
            '@type': 'Question',
            name: 'Care sunt taxele notariale pentru cumpărarea unui apartament în Timișoara?',
            acceptedAnswer: { '@type': 'Answer', text: 'Onorariu notarial ~1% din valoarea tranzacției, taxe ANCPI ~0,15%, comision agenție RealTrust 2%. Pentru un apartament de 100.000 €, costurile totale sunt aproximativ 3.500–4.500 €.' },
          },
        ],
      },
    ],
  });

  // /pentru-proprietari — pillar page for property owners
  routes.push({
    path: '/pentru-proprietari',
    title: 'Administrare Apartamente Regim Hotelier Timișoara | RealTrust',
    description: 'Oferim administrare completă pentru apartamente în Timișoara: regim hotelier, marketing, oaspeți, curățenie. Atinge un ROI de 9.4% net. Contactează-ne!',
    h1: 'Administrare Proprietăți și Apartamente Regim Hotelier în Timișoara',
    canonical: `${BASE_URL}/pentru-proprietari`,
    seoBody: `
      <h2>Property management Timișoara — operare hotelieră zilnică pentru proprietari</h2>
      <p>RealTrust este firmă specializată de <strong>property management Timișoara</strong> dedicată exclusiv proprietarilor care vor să externalizeze complet operarea apartamentului. Ne ocupăm de tot ce ține de exploatarea zilnică: listare multi-canal, comunicare cu oaspeții 24/7, check-in / check-out, curățenie hotelieră între rezervări, lenjerie, mentenanță, raportare lunară. Tu primești venitul; restul îl gestionăm noi cu o echipă locală de 12 persoane.</p>

      <h2>Onboarding proprietate — pașii de la semnare la prima rezervare</h2>
      <p>Procesul standard de preluare în administrare durează 7–10 zile lucrătoare: (1) vizionare și audit tehnic gratuit la apartament, (2) propunere comercială cu proiecție de venit personalizată, (3) semnarea contractului de mandat, (4) shooting foto profesional și redactare descriere bilingvă RO/EN, (5) configurare listing-uri pe Booking, Airbnb, Vrbo și site-ul direct, (6) instalare yală smart cu cod unic per oaspete, (7) primul transport de lenjerie și consumabile, (8) lansare cu tarife introductive pentru reviews rapide.</p>

      <h2>Marketing și distribuție — channel manager multi-platformă</h2>
      <p>Folosim un channel manager profesional (Hostaway / Smoobu) sincronizat în timp real cu Booking, Airbnb, Vrbo, Expedia și site-ul direct, pentru a evita dublele rezervări. Strategia de marketing include optimizare SEO listing (titlu, primele 3 fotografii, descriere bilingvă), repricing zilnic prin algoritmi de yield management (PriceLabs / Wheelhouse), promovarea pe canale de business travel pentru clienții corporate Continental, Hella, Atos, Flex, și retargeting pe rezervări directe pentru clienți recurenți.</p>

      <h2>Curățenie hotelieră și consumabile — standard 5 stele</h2>
      <p>Echipă internă de curățenie cu protocol hotelier standardizat (checklist de 47 puncte per turnover), schimb complet de lenjerie albă spălată profesional la 60°C, kit consumabile reaprovizionat (hârtie igienică, sare, ulei, cafea, ceai, zahăr, săpun lichid, șampon, gel duș), control calitate randomizat săptămânal de un supervisor. Costul curățeniei este suportat de oaspete (cleaning fee inclus în tarif), nu reduce încasările proprietarului.</p>

      <h2>Mentenanță 24/7 și gestiunea defecțiunilor</h2>
      <p>Linie unică de intervenție pentru oaspeți (telefon + WhatsApp), cu rețea de meseriași partener pre-aprobați: instalator, electrician, frigotehnist AC, lăcătuș, IT pentru WiFi/router. Intervenții minore (sub 200 RON) sunt rezolvate fără aprobare prealabilă, pentru a nu deranja proprietarul; pentru reparații majore primești foto + ofertă scrisă în maxim 4 ore. Toate cheltuielile sunt detaliate în raportul lunar cu factură atașată.</p>

      <h3>Raportare financiară lunară — transparență totală</h3>
      <p>Primești în primele 5 zile ale lunii un raport PDF cu: număr nopți rezervate, număr oaspeți, ADR (tarif mediu pe noapte), ocupare %, RevPAR, încasări brute pe canal (Booking, Airbnb, direct), comisioane platforme, costuri operaționale (curățenie, consumabile, mentenanță), comision management RealTrust, <strong>net plătit proprietarului</strong>. Plata se face prin transfer bancar până în data de 15 a lunii. Acces 24/7 la dashboard online cu istoric și calendar rezervări.</p>

      <h3>Verificare oaspeți și protecție proprietate</h3>
      <p>Filtrăm rezervările pentru a proteja apartamentul tău: blocare rezervări locale (Timișoara) pentru evitarea petrecerilor, verificare ID la check-in, garanție prin pre-autorizare card 200–500 €, contract de cazare semnat digital, monitorizare nivel decibeli prin senzor smart NoiseAware (nu camere — respectăm intimitatea). Asigurare suplimentară Booking AirCover și Airbnb Host Protection activate implicit.</p>

      <h3>Pachete de management — Lite, Standard, Premium</h3>
      <p>Trei pachete adaptate nevoilor proprietarilor: <strong>Lite</strong> (15% comision, doar marketing și rezervări — proprietarul gestionează curățenia și check-in-urile), <strong>Standard</strong> (20% comision, full-service operațional), <strong>Premium</strong> (25% comision, full-service + reportaj foto trimestrial actualizat + consultanță upgrade-uri și mobilier). Toate pachetele includ acces dashboard, raport lunar și suport telefonic.</p>

      <h3>Contract de mandat — model standard pentru proprietari</h3>
      <p>Contractul de mandat RealTrust pentru administrare are durată minimă 12 luni, exclusivitate pe canalele Booking/Airbnb (proprietarul își păstrează dreptul de utilizare personală cu rezervare prealabilă), comision flat din încasări (fără surprize), obligația noastră de raportare și plată lunară, posibilitate de reziliere amiabilă cu preaviz 30 zile. Modelul este redactat conform Codului Civil român (mandat cu reprezentare) și poate fi consultat înainte de semnare.</p>

      <h3>Asistență administrativă: ANAF, asociație, utilități</h3>
      <p>Te asistăm cu obligațiile administrative recurente: declarații lunare ANAF pentru veniturile din chirii și regim hotelier (formular 224 / 212), comunicare cu asociația de proprietari (cote întreținere, ședințe), gestiune contracte furnizori utilități (Enel, E-On, Aquatim, RetimGrup), reînnoire RAR/ITP pentru centralele termice, asigurare obligatorie PAD și asigurare facultativă conținut. Toate documentele sunt arhivate digital și accesibile în dashboard.</p>

      <h3>Repere geografice acoperite — Vasile Pârvan, City Business Centre, Continental, Spitalul Louis Țurcanu</h3>
      <p>Echipa noastră operațională acoperă apartamente situate pe <strong>Bulevardul Vasile Pârvan</strong> (Complex Studențesc — cerere academică UVT/UPT), în jurul polului <strong>City Business Centre</strong> (clienți corporate, business travel pe termen scurt — alături de Iulius Town și Vox Park), pe Calea Aradului în proximitatea sediului <strong>Continental Automotive Timișoara</strong> (chiriași expat și business travelers cu sejururi de 1–4 săptămâni), și în zona <strong>Spitalului de Copii Louis Țurcanu</strong> (cerere medicală constantă din partea familiilor pacienților). Pentru fiecare zonă avem o echipă mobilă de check-in și curățenie cu timp de răspuns sub 30 de minute.</p>

      <h3>Randament chirie Timișoara — comparație termen lung vs regim hotelier</h3>
      <p>Comparație directă <strong>randament chirie Timișoara</strong> pentru un apartament de 2 camere de 60 mp în Centru, evaluat la 95.000 €: chirie clasică 12 luni la 480 €/lună = 5.760 €/an brut (~6,1% brut, ~4,5% net după impozit forfetar și pauze între chiriași); regim hotelier RealTrust la ADR 65 € și ocupare 78% = ~14.800 € net anual proprietarului (~9,4% net, după toate comisioanele și costurile). Diferența anuală: aproximativ +9.000 € în favoarea regimului hotelier. Calcule personalizate disponibile la cerere.</p>

      <h3>Consultanță imobiliară Timișoara — exit strategy și optimizare portofoliu</h3>
      <p>Pentru proprietarii care administrează cu noi mai multe apartamente oferim <strong>consultanță imobiliară Timișoara</strong> dedicată: analiză anuală a portofoliului, recomandări de upgrade pentru creșterea ADR (mobilier, smart-home, redecorare), strategie de exit (vânzare la momentul optim al ciclului de piață), reinvestire în proprietăți complementare (de ex. completare cu o garsonieră lângă un apartament de familie pentru a captura ambele segmente). Pentru investiții noi sau analiză detaliată de piață, consultă pagina dedicată <a href="${BASE_URL}/investitii" tabindex="-1">Investiții Imobiliare Timișoara</a>.</p>
    `,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'RealTrust & ApArt Hotel — Servicii Proprietari Timișoara',
        url: `${BASE_URL}/pentru-proprietari`,
        telephone: '+40799069256',
        areaServed: 'Timișoara',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Strada Samuel Clain Micu Nr.14, ap.4',
          addressLocality: 'Timișoara',
          addressRegion: 'Timiș',
          postalCode: '300125',
          addressCountry: 'RO',
        },
        priceRange: '$$',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Administrare apartamente regim hotelier',
        provider: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
        areaServed: 'Timișoara',
        url: `${BASE_URL}/pentru-proprietari`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Vânzare apartamente Timișoara',
        provider: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
        areaServed: 'Timișoara',
        url: `${BASE_URL}/pentru-proprietari`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Închirieri pe termen lung Timișoara',
        provider: { '@type': 'Organization', name: 'RealTrust & ApArt Hotel' },
        areaServed: 'Timișoara',
        url: `${BASE_URL}/pentru-proprietari`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Cât este comisionul agenției RealTrust pentru vânzarea unui apartament în Timișoara?',
            acceptedAnswer: { '@type': 'Answer', text: 'Comisionul standard este 2% din valoarea tranzacției, negociabil pentru proprietăți premium peste 200.000 €. Fără costuri ascunse sau taxe de listare.' },
          },
          {
            '@type': 'Question',
            name: 'Ce randament pot obține în regim hotelier față de chirie clasică?',
            acceptedAnswer: { '@type': 'Answer', text: 'ROI net verificat de 9.4% anual în regim hotelier RealTrust, comparativ cu 4-5% pentru chirie clasică. Diferența medie netă este 60–80% în favoarea regimului hotelier.' },
          },
          {
            '@type': 'Question',
            name: 'Care este impozitul pe vânzarea unui imobil în Timișoara?',
            acceptedAnswer: { '@type': 'Answer', text: 'Pentru imobile deținute sub 3 ani: 3% din valoarea ce depășește 450.000 RON. Pentru cele peste 3 ani: 1%. Onorariu notarial conform grilelor Camerei Notarilor Publici Timișoara.' },
          },
          {
            '@type': 'Question',
            name: 'Ce tip de contract se semnează pentru administrarea proprietății?',
            acceptedAnswer: { '@type': 'Answer', text: 'Contract administrare imobil standard RealTrust pe minim 12 luni, cu comision 15–25% din încasări, raportare lunară transparentă, plată până în data de 15, reziliere amiabilă cu preaviz 30 zile. Conform legislației române.' },
          },
        ],
      },
    ],
  });

  // /complexe — managed residential complexes
  routes.push({
    path: '/complexe',
    title: 'Ansambluri Rezidențiale Timișoara — ISHO, ATENEO, City of Mara | RealTrust',
    description: 'Complexe rezidențiale Timișoara administrate de RealTrust: ISHO, ATENEO, City of Mara, Fructus Plaza, XCity Towers. Investiții cu randament verificat.',
    h1: 'Complexe Rezidențiale Premium Timișoara',
    canonical: `${BASE_URL}/complexe`,
    seoBody: `
      <h2>Complexe rezidențiale din Timișoara administrate de RealTrust</h2>
      <p>Pagina /complexe este dedicată ansamblurilor rezidențiale și proprietăților administrate de RealTrust în Timișoara: <strong>ISHO</strong>, <strong>ATENEO Residence</strong>, <strong>City of Mara</strong>, <strong>Fructus Plaza</strong>, <strong>XCity Towers</strong> și alte dezvoltări premium.</p>
      <h3>Ansambluri rezidențiale Timișoara cu potențial investițional</h3>
      <p>Prezentăm zone, facilități și rezultate reale de ocupare pentru investitori interesați de apartamente noi, randament verificat și administrare în regim hotelier în cele mai căutate micro-piețe din Timișoara.</p>
    `,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Complexe Rezidențiale Timișoara',
      url: `${BASE_URL}/complexe`,
    },
  });

  // Blog category hubs — prerender meta + JSON-LD so Google has them
  // immediately when discovering them via the new blog sitemap.
  const blogCategories: Array<{ slug: string; name: string; title: string; description: string; intro: string }> = [
    {
      slug: 'ghid-turistic-timisoara',
      name: 'Ghid Turistic Timișoara',
      title: 'Ghid Turistic Timișoara — Restaurante, Evenimente, Atracții 2026 | RealTrust',
      description: 'Ghidul complet pentru oaspeții Timișoarei: top restaurante, evenimente 2026, cartiere, transport public, cafenele specialty și excursii de o zi.',
      intro: 'Tot ce trebuie să știi pentru o vizită memorabilă în Timișoara — selectat de echipa ApArt Hotel pentru oaspeții noștri.',
    },
    {
      slug: 'investitii-imobiliare',
      name: 'Investiții Imobiliare',
      title: 'Investiții Imobiliare Timișoara — Randament, ROI, Studii de Caz | RealTrust',
      description: 'Analize de piață, ROI 9.4% net, studii de caz reale și ghiduri pentru investitori imobiliari în Timișoara — inclusiv regim hotelier.',
      intro: 'Strategii verificate de investiții imobiliare în Timișoara: de la calcul randament până la exit strategy.',
    },
    {
      slug: 'sfaturi-proprietari',
      name: 'Sfaturi Proprietari',
      title: 'Sfaturi pentru Proprietari — Administrare Regim Hotelier Timișoara | RealTrust',
      description: 'Ghiduri practice pentru proprietari de apartamente: revenue management, distribuție OTA, mentenanță, branding și amenajare pentru regim hotelier.',
      intro: 'Cum transformi un apartament din Timișoara într-un activ profitabil administrat profesionist.',
    },
    {
      slug: 'taxe-legislatie',
      name: 'Taxe & Legislație',
      title: 'Taxe & Legislație Imobiliară 2026 — Ghid Fiscal pentru Proprietari | RealTrust',
      description: 'Ghiduri actualizate despre fiscalitate, ANAF, e-Factura, e-TVA și obligațiile legale pentru proprietarii de apartamente în regim hotelier.',
      intro: 'Tot ce trebuie să știi despre obligațiile fiscale pentru veniturile din chirii și regim hotelier.',
    },
  ];

  for (const c of blogCategories) {
    routes.push({
      path: `/blog/categorie/${c.slug}`,
      title: c.title,
      description: c.description,
      h1: c.name,
      canonical: `${BASE_URL}/blog/categorie/${c.slug}`,
      seoBody: `<h2>${c.name}</h2><p>${c.intro}</p>`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: c.title,
          description: c.description,
          url: `${BASE_URL}/blog/categorie/${c.slug}`,
          isPartOf: { '@type': 'Blog', name: 'Blog RealTrust', url: `${BASE_URL}/blog` },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Acasă', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: c.name, item: `${BASE_URL}/blog/categorie/${c.slug}` },
          ],
        },
      ],
    });
  }

  return routes;
}

function collectProtectedHeadNodes(template: string): string[] {
  return PROTECTED_HEAD_PATTERNS
    .map((pattern) => template.match(pattern)?.[0] ?? null)
    .filter((node): node is string => Boolean(node));
}

function ensureProtectedHeadNodes(html: string, protectedHeadNodes: string[]): string {
  const missingNodes = protectedHeadNodes.filter((node) => !html.includes(node));

  if (missingNodes.length === 0) {
    return html;
  }

  return html.replace(
    '</head>',
    `  ${missingNodes.join('\n  ')}\n</head>`
  );
}

function generateHtml(template: string, route: PrerenderRoute, protectedHeadNodes: string[]): string {
  let html = template.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(route.title)}</title>`
  );

  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHtml(route.description)}">`
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Per-route Open Graph / Twitter tags. The static shell ships sitewide
  // values; without this, every prerendered page shares the homepage preview.
  const socialImage = route.image || `${BASE_URL}/images/hero-optimized-1920w.webp`;
  const setMeta = (attr: 'property' | 'name', key: string, value: string) => {
    const re = new RegExp(`<meta ${attr}="${key.replace(':', ':')}" content="[^"]*"\\s*/?>`);
    const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
    html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
  };
  setMeta('property', 'og:title', route.title);
  setMeta('property', 'og:description', route.description);
  setMeta('property', 'og:url', route.canonical);
  setMeta('property', 'og:image', socialImage);
  setMeta('name', 'twitter:title', route.title);
  setMeta('name', 'twitter:description', route.description);
  setMeta('name', 'twitter:url', route.canonical);
  setMeta('name', 'twitter:image', socialImage);

  const jsonLdStr = Array.isArray(route.jsonLd)
    ? route.jsonLd.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n      ')
    : `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`;

  // Use `inert` (not aria-hidden) so focusable descendants like <a> are properly removed
  // from the accessibility tree and tab order — fixes Lighthouse "aria-hidden with focusable
  // descendants" rule.
  // Inject H1 for routes that don't reliably render one in the static shell
  // (homepage + neighborhood landing pages). React hydration replaces #root
  // content but the inert SEO div outside #root remains for crawlers.
  const isHomepage = route.path === '/' || route.path === '';
  const isNeighborhood = route.path.startsWith('/imobiliare-timisoara/');
  const headingTag = (isHomepage || isNeighborhood) ? 'h1' : 'h2';
  const seoBlock = `
    <!-- Prerendered SEO content for crawlers -->
    <div id="seo-prerender" inert style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden">
      <${headingTag} data-prerender-title>${escapeHtml(route.h1)}</${headingTag}>
      ${jsonLdStr}
      <p>${escapeHtml(route.description)}</p>
      <a href="${route.canonical}" tabindex="-1">${escapeHtml(route.title)}</a>
      ${route.seoBody ?? ''}
    </div>`;

  html = html.replace(
    '<div id="root">',
    `${seoBlock}\n    <div id="root">`
  );

  // Deduplicate CSS links: if a preload-swap tag already exists for the same
  // href, strip the render-blocking <link rel="stylesheet"> Vite injected.
  // Critical CSS is inlined in index.html, so no FOUC occurs.
  const preloadedHrefs = new Set<string>();
  const preloadRe = /<link\b[^>]*\brel="preload"[^>]*\bas="style"[^>]*\bhref="([^"]+\.css)"[^>]*>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = preloadRe.exec(html)) !== null) preloadedHrefs.add(pm[1]);
  if (preloadedHrefs.size > 0) {
    html = html.replace(
      /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"[^>]*>\s*/gi,
      (match, href) => (preloadedHrefs.has(href) ? '' : match)
    );
  }

  return ensureProtectedHeadNodes(html, protectedHeadNodes);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function vitePrerenderSeo(): Plugin {
  return {
    name: 'vite-prerender-seo',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const outDir = path.resolve(process.cwd(), 'dist');
        const templatePath = path.join(outDir, 'index.html');

        if (!fs.existsSync(templatePath)) {
          console.warn('[prerender-seo] dist/index.html not found, skipping prerender');
          return;
        }

        const template = fs.readFileSync(templatePath, 'utf-8');
        const protectedHeadNodes = collectProtectedHeadNodes(template);
        
        // Build static routes (neighborhoods, calculators, etc.)
        const staticRoutes = buildStaticRoutes();
        
        // Fetch property routes from database
        console.log('[prerender-seo] Fetching active properties from database...');
        const properties = await fetchActiveProperties();
        const propertyRoutes = buildPropertyRoutes(properties);
        console.log(`[prerender-seo] Found ${properties.length} active properties with slugs`);
        
        // Guest apartments (static data file) — cazare pages with HotelRoom schema
        const taken = new Set([...staticRoutes, ...propertyRoutes].map((r) => r.path));
        const guestRoutes = buildGuestPropertyRoutes(taken);
        console.log(`[prerender-seo] Found ${guestRoutes.length} static guest apartments`);

        const allRoutes = [...staticRoutes, ...propertyRoutes, ...guestRoutes];

        console.log(`[prerender-seo] Generating ${allRoutes.length} static HTML files...`);

        for (const route of allRoutes) {
          // Homepage ('/') overwrites dist/index.html in place; subroutes get
          // their own dist/<path>/index.html.
          const isRoot = route.path === '/' || route.path === '';
          const dirPath = isRoot ? outDir : path.join(outDir, route.path);
          if (!isRoot) fs.mkdirSync(dirPath, { recursive: true });

          const htmlContent = generateHtml(template, route, protectedHeadNodes);
          const filePath = path.join(dirPath, 'index.html');
          fs.writeFileSync(filePath, htmlContent, 'utf-8');

          // Also emit flat route files (e.g. /pentru-proprietari.html) as a
          // hosting fallback for Apache/edge setups that don't honor nested
          // directory index resolution before the SPA catch-all rule.
          if (!isRoot) {
            const flatFilePath = path.join(outDir, `${route.path.replace(/^\//, '')}.html`);
            fs.mkdirSync(path.dirname(flatFilePath), { recursive: true });
            fs.writeFileSync(flatFilePath, htmlContent, 'utf-8');
          }

          console.log(`  ✓ ${isRoot ? '/' : route.path}/index.html`);
        }

        console.log(`[prerender-seo] Done — ${allRoutes.length} pages prerendered (${staticRoutes.length} static + ${propertyRoutes.length} db properties + ${guestRoutes.length} guest apartments)`);
      },
    },
  };
}
