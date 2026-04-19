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
`;

const BASE_URL = 'https://www.realtrust.ro';
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
  ]},
];

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
      telephone: '+40723154520',
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
      telephone: '+40723154520',
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
      jsonLd: faqSchema ? [
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: `Apartamente ${n.fullName} Timișoara`,
          url: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
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
        telephone: '+40723154520',
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

  // /pentru-proprietari — pillar page for property owners
  routes.push({
    path: '/pentru-proprietari',
    title: 'Administrare Apartamente Regim Hotelier Timișoara | RealTrust',
    description: 'Oferim administrare completă pentru apartamente în Timișoara: regim hotelier, marketing, oaspeți, curățenie. Atinge un ROI de 9.4% net. Contactează-ne!',
    h1: 'Administrare Proprietăți și Apartamente Regim Hotelier în Timișoara',
    canonical: `${BASE_URL}/pentru-proprietari`,
    seoBody: `
      <h2>Servicii complete pentru proprietari de imobile în Timișoara</h2>
      <p>RealTrust oferă proprietarilor din Timișoara trei direcții principale: <strong>vânzare apartament Timișoara</strong> cu evaluare gratuită și negociere, <strong>închirieri pe termen lung</strong> cu verificarea chiriașilor, și <strong>administrare apartamente regim hotelier</strong> cu ROI 9.4% net verificat anual. Toate serviciile sunt livrate de o echipă locală cu peste 60 de proprietăți active în portofoliu.</p>

      <h2>Preț metru pătrat Timișoara — analiză piață pe cartiere</h2>
      <p>Analiza <strong>preț metru pătrat Timișoara</strong> pe principalele zone (aprilie 2026): ISHO 2.150 €/mp, Circumvalațiunii 1.920 €/mp, Aradului 1.780 €/mp, Complex Studențesc 1.720 €/mp, Girocului 1.650 €/mp, Șagului 1.580 €/mp, Calea Lipovei 1.550 €/mp. Factori care influențează valoarea: anul construcției, etaj, finisaje, eficiență energetică, proximitate față de UVT, Iulius Town, Aeroport și Spitalul Județean. Oferim evaluare gratuită personalizată pentru proprietatea ta.</p>

      <h2>Comision agenție imobiliară Timișoara — transparență totală</h2>
      <p>Structura noastră de <strong>comision agenție imobiliară Timișoara</strong>: 2% la vânzări (negociabil pentru proprietăți premium peste 200.000 €), o chirie pentru închirieri pe termen lung de 12 luni, 15–25% management pentru regim hotelier (plătit doar din încasările reale). Fără costuri ascunse, fără taxe de listare, fără abonamente.</p>

      <h2>Contract închiriere apartament — model standardizat</h2>
      <p>Punem la dispoziția proprietarilor un <strong>contract închiriere apartament model</strong> standardizat, conform legislației române (OUG 114/2018 și Codul Civil), cu clauze pentru garanție, întreținere, durată, reziliere, plata utilităților și inventar mobilier. Modelul poate fi descărcat gratuit după înregistrare.</p>

      <h2>Impozit vânzare imobil Timișoara — obligații fiscale</h2>
      <p><strong>Impozit vânzare imobil Timișoara</strong>: pentru proprietățile deținute sub 3 ani impozitul este 3% din valoarea tranzacției ce depășește 450.000 RON, iar pentru cele deținute peste 3 ani este 1%. Onorariul notarial se calculează după grilele Camerei Notarilor Publici Timișoara. Echipa noastră te asistă cu toate actele și calculul fiscal complet.</p>

      <h3>Administrare regim hotelier Timișoara — pachet complet</h3>
      <p>Pachetul de <strong>administrare regim hotelier Timișoara</strong>: marketing pe Booking, Airbnb și platforme directe; check-in / check-out 24/7; curățenie hotelieră; mentenanță; raportare lunară financiară transparentă; optimizare yield management. Comision 15–25% management + 15–23% comision platforme. ROI 9.4% net verificat anual pe portofoliul activ.</p>

      <h3>Calculator ROI online — randament chirie clasică vs regim hotelier</h3>
      <p>Folosește <a href="${BASE_URL}/calculator-roi" tabindex="-1">calculatorul ROI interactiv</a> pentru a compara randamentul apartamentului tău în chirie clasică vs regim hotelier. Introduci valoarea proprietății, suprafața și tier-ul de management, iar instrumentul afișează venitul lunar estimat, ROI anual și diferența netă. Instrumentul este gratuit și nu necesită înregistrare.</p>

      <h3>Zone acoperite: Centru, ISHO, Complex Studențesc, Dumbrăvița, Ghiroda</h3>
      <p>Acoperim toate cartierele din Timișoara — Centru / Cetate, Iosefin, Elisabetin, Fabric, ISHO, Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Girocului, Calea Șagului, Circumvalațiunii, Calea Lipovei, Complex Studențesc — și zonele metropolitane <strong>Dumbrăvița</strong>, <strong>Ghiroda</strong> (acces rapid la Aeroport) și <strong>Moșnița Nouă</strong> (case și vile noi).</p>

      <h3>Optimizare fiscală imobiliare — venituri din chirii</h3>
      <p><strong>Optimizare fiscală imobiliare</strong> Timișoara: pentru veniturile din chirii proprietarii pot opta între impozitul forfetar (10% după deducerea cotei de 40% cheltuieli) sau regimul real (deducere cheltuieli efective — utilități, reparații, comisioane, amortizare). Pentru regim hotelier înregistrat ca PFA sau SRL există optimizări suplimentare prin TVA și amortizare accelerată. Consultanță fiscală inclusă în pachetele de management.</p>

      <h3>Property management Timișoara — international owners</h3>
      <p>Serviciile noastre de administrare proprietăți (cunoscute internațional ca <strong>property management Timișoara</strong>) sunt potrivite și pentru proprietarii nerezidenți sau diaspora — comunicare bilingvă RO/EN, plăți internaționale, raportare lunară în EUR și asistență fiscală pentru declarațiile anuale ANAF.</p>

      <h3>Renovare apartament pentru închiriere — creștere randament</h3>
      <p><strong>Renovare apartament pentru închiriere</strong>: parteneriate cu antreprenori locali verificați pentru renovări strategice (zugrăveli, parchet, mobilier, electrocasnice, smart-home) cu ROI mediu de 18–24 luni. Investițiile țintite în finisaje și amenajare cresc tariful nopții cu 25–40% și ocuparea cu 10–15 puncte procentuale.</p>

      <h3>Firmă administrare imobile Timișoara — management proprietăți cu rezultate</h3>
      <p>RealTrust este <strong>firmă administrare imobile Timișoara</strong> cu echipă locală dedicată și peste 60 de proprietăți active în portofoliu. Oferim servicii complete de <strong>management proprietăți Timișoara</strong> — sinonim cu administrare proprietăți — incluzând marketing multi-canal, gestiunea oaspeților, mentenanță, raportare financiară și optimizare yield. Furnizor specializat pentru proprietari rezidenți și diaspora.</p>

      <h3>Consultanță fiscală imobiliare — servicii cu valoare adăugată</h3>
      <p><strong>Consultanță fiscală imobiliare</strong> inclusă în pachetele noastre: optimizarea veniturilor din chirii (forfetar vs regim real), declarații ANAF, înregistrare PFA / SRL pentru regim hotelier, recuperare TVA pentru investitori, calcul amortizare clădiri și deduceri cheltuieli. Suport complet pentru proprietari, de la achiziție la exit.</p>

      <h3>Repere geografice: Vasile Pârvan, Piața Traian, Giroc, Continental, Spitalul Louis Țurcanu</h3>
      <p>Apartamentele administrate în Complexul Studențesc sunt poziționate pe sau lângă <strong>Bulevardul Vasile Pârvan</strong>, artera principală care leagă UVT (Universitatea de Vest) și UPT (Politehnica) — proximitate decisivă pentru chirii studențești și cazare academică. În cartierul istoric Fabric oferim proprietăți cu valoare arhitecturală lângă <strong>Piața Traian</strong>, reper turistic major. Acoperim și comuna <strong>Giroc</strong> (zonă metropolitană distinctă de Calea Girocului), în plină expansiune cu case și apartamente noi pentru investitori. Pe Calea Aradului avem apartamente apreciate de angajații și expații companiei <strong>Continental Automotive Timișoara</strong>, unul dintre cei mai mari angajatori din regiune. Pentru cazare medicală oferim opțiuni în proximitatea <strong>Spitalului de Copii Louis Țurcanu</strong> și a Spitalului Județean — cerere constantă din partea familiilor și personalului medical.</p>

      <h3>Servicii property management Timișoara — optimizare venituri Airbnb</h3>
      <p><strong>Servicii property management Timișoara</strong> end-to-end pentru proprietari: <strong>optimizare venituri Airbnb Timișoara</strong> prin algoritmi de yield management dinamic (PriceLabs, Wheelhouse), repricing zilnic în funcție de evenimente locale (FITS, conferințe UVT, târguri) și sezonalitate, optimizare titlu/descriere/fotografii listing pentru CTR mai mare, sincronizare iCal multi-platformă (Booking, Airbnb, Vrbo, Direct). Rezultate medii: +28% RevPAR vs. self-management.</p>

      <h3>Contract administrare imobil — model RealTrust</h3>
      <p><strong>Contract administrare imobil</strong> RealTrust: contract bilateral standard cu durată minimă 12 luni, clauze clare privind comisionul (15–25% din încasări), obligațiile administratorului (marketing, check-in, curățenie, mentenanță minoră, raportare lunară), obligațiile proprietarului (utilități, mentenanță majoră, asigurare), modalități de plată (transfer lunar până în data de 15), reziliere amiabilă cu preaviz 30 zile. Modelul respectă legislația română și poate fi consultat înainte de semnare.</p>
    `,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'RealTrust & ApArt Hotel — Servicii Proprietari Timișoara',
        url: `${BASE_URL}/pentru-proprietari`,
        telephone: '+40723154520',
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

  const jsonLdStr = Array.isArray(route.jsonLd)
    ? route.jsonLd.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n      ')
    : `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`;

  // Use `inert` (not aria-hidden) so focusable descendants like <a> are properly removed
  // from the accessibility tree and tab order — fixes Lighthouse "aria-hidden with focusable
  // descendants" rule.
  // Only inject H1 for the homepage (where Hero may not be hydrated yet for non-JS crawlers).
  // For all other routes, the React page renders its own H1 — injecting another would create duplicate H1s.
  const isHomepage = route.path === '/' || route.path === '';
  const headingTag = isHomepage ? 'h1' : 'h2';
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

  // Keep the main stylesheet render-blocking.
  // Previous preload-swap optimization caused unstyled first paint and score instability.

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
        
        const allRoutes = [...staticRoutes, ...propertyRoutes];

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

        console.log(`[prerender-seo] Done — ${allRoutes.length} pages prerendered (${staticRoutes.length} static + ${propertyRoutes.length} properties)`);
      },
    },
  };
}
