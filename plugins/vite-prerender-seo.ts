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
  <p>RealTrust &amp; ApArt Hotel Timișoara este partenerul tău pentru <strong>investiții imobiliare profitabile</strong>, <strong>vânzări apartamente Timișoara</strong>, <strong>închirieri pe termen lung</strong> și <strong>administrare apartamente regim hotelier</strong> cu un randament net verificat de 9.4% anual. Acoperim toate cartierele importante ale orașului: Complex Studențesc (lângă UVT — Universitatea de Vest, UPT — Politehnica Timișoara și UMF Medicină), Iosefin, Elisabetin (lângă Parcul Rozelor și Parcul Botanic), Fabric, ISHO, Cetate și Centrul Vechi (Piața Unirii, Piața Victoriei, Catedrala Mitropolitană), Take Ionescu, Soarelui, Dâmbovița, Calea Aradului, Calea Girocului, Calea Șagului, Circumvalațiunii și Calea Lipovei.</p>

  <h3>Apartamente regim hotelier Complex Studențesc Timișoara</h3>
  <p>Apartamente regim hotelier în Complex Studențesc Timișoara, la 5 minute pe jos de UVT (Universitatea de Vest din Timișoara), Politehnica Timișoara (UPT) și UMF Medicină „Victor Babeș". Cazare lângă universități, ideală pentru studenți, părinți care vizitează studenții, profesori și participanți la evenimente academice și conferințe medicale.</p>

  <h3>Apartamente Iosefin și Elisabetin Timișoara</h3>
  <p>Apartamente de închiriat și regim hotelier în Iosefin Timișoara — cartier istoric și rezidențial central, aproape de malul Bega și de Centrul Vechi. În Elisabetin Timișoara oferim apartamente într-un cartier rezidențial liniștit, lângă Parcul Rozelor și Parcul Botanic, la câțiva pași de Catedrala Mitropolitană.</p>

  <h3>Cazare lângă Iulius Town, Shopping City Timișoara și Spitalul Județean</h3>
  <p>Proprietățile noastre sunt situate la 5–15 minute de Iulius Town / Iulius Mall Openville, Shopping City Timișoara (Auchan), Vox Park, Aeroportul Internațional Timișoara „Traian Vuia" și Gara de Nord Timișoara. Oferim de asemenea cazare lângă Spitalul Județean Timișoara, Spitalul Municipal și Spitalul de Copii „Louis Țurcanu" — opțiune confortabilă pentru familiile pacienților, medici și personal medical aflat în deplasare în Timișoara.</p>

  <h3>Investiții imobiliare în Centru Timișoara, ISHO și zonele premium</h3>
  <p>Pentru investitori, propunem oportunități verificate în Cetate / Centru, ISHO (cel mai iconic proiect de regenerare urbană din Timișoara, pe malul Begăi), Take Ionescu și Soarelui — zone cu randamente atractive (8–10% net pentru regim hotelier) și apreciere a capitalului peste media pieței. Calea Lipovei este o zonă în curs de modernizare cu potențial mare de apreciere, iar Zona Aradului oferă acces rapid la aeroport și la hub-urile de business Iulius Town și Openville.</p>

  <h3>Apartamente de vânzare Timișoara — proprietăți de vânzare în toate cartierele</h3>
  <p>Ca <strong>agenție imobiliară Timișoara</strong> de încredere, oferim <strong>apartamente de vânzare Timișoara</strong> și <strong>proprietăți de vânzare Timișoara</strong> verificate în toate cartierele importante: garsoniere, apartamente cu 2 camere, 3 camere și 4 camere de vânzare în Centru, Iosefin, Elisabetin, Complex Studențesc, ISHO, Take Ionescu, Calea Aradului, Calea Lipovei și Circumvalațiunii. Consultanță completă pentru cumpărătorii de apartamente în Timișoara, evaluare gratuită, negociere și asistență la actele notariale.</p>

  <h3>Apartamente de închiriat Timișoara — închirieri pe termen lung</h3>
  <p>Pentru chiriași și proprietari oferim <strong>apartamente de închiriat Timișoara</strong> și <strong>închirieri apartamente Timișoara pe termen lung</strong> (contracte 12 luni sau mai mult) — apartamente mobilate și utilate în Centru, Iosefin, Elisabetin, Complex Studențesc, Iulius Town, Calea Aradului și zona universitară (UVT, UPT, UMF). Verificare chiriași, contracte standardizate și gestionare profesională pe toată durata închirierii.</p>

  <h3>Administrare proprietăți Timișoara — servicii complete pentru proprietari</h3>
  <p><strong>Administrare proprietăți Timișoara</strong> oferită de RealTrust acoperă tot ciclul: marketing pe Booking, Airbnb și directe, check-in / check-out 24/7, curățenie hotelieră, mentenanță, raportare lunară financiară transparentă și optimizare yield management. <strong>Administrare apartamente regim hotelier Timișoara</strong> cu ROI 9.4% net verificat anual — partener de încredere pentru proprietari și investitori.</p>

  <h3>Servicii oferite</h3>
  <p>Investiții imobiliare Timișoara cu randament verificat, vânzări apartamente Timișoara, închirieri pe termen lung Timișoara, evaluare gratuită proprietate, calculator ROI online, consultanță investiții imobiliare și administrare profesională pentru proprietari, investitori și oaspeți.</p>

  <h3>Proximitate landmark-uri Timișoara</h3>
  <p>Toate proprietățile noastre sunt aproape de universități (UVT, UPT, UMF), mall-uri (Iulius Town, Shopping City Timișoara), parcuri (Parcul Central, Parcul Rozelor, Parcul Botanic), Catedrala Mitropolitană, malul Bega, Spitalul Județean Timișoara, Aeroportul Internațional și Gara de Nord — la 5, 10 sau 15 minute pe jos sau cu transport public.</p>
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
    title: 'RealTrust Timișoara | Imobiliare, Regim Hotelier & Investiții',
    description: 'Apartamente regim hotelier Timișoara — Centru, Iosefin, Elisabetin, Complex Studențesc, lângă UVT și Iulius Town. ROI 9.4% net. Calculează gratuit!',
    h1: 'RealTrust Timișoara — Imobiliare, Regim Hotelier & Investiții',
    canonical: `${BASE_URL}/`,
    seoBody: HOMEPAGE_SEO_BODY,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'RealTrust & ApArt Hotel Timișoara',
      description: 'Agenție imobiliară premium din Timișoara — vânzări, investiții și administrare apartamente regim hotelier cu ROI 9.4% net verificat.',
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

  const seoBlock = `
    <!-- Prerendered SEO content for crawlers -->
    <div id="seo-prerender" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true">
      <h1>${escapeHtml(route.h1)}</h1>
      ${jsonLdStr}
      <p>${escapeHtml(route.description)}</p>
      <a href="${route.canonical}">${escapeHtml(route.title)}</a>
      ${route.seoBody ?? ''}
    </div>`;

  html = html.replace(
    '<div id="root">',
    `${seoBlock}\n    <div id="root">`
  );

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

          console.log(`  ✓ ${isRoot ? '/' : route.path}/index.html`);
        }

        console.log(`[prerender-seo] Done — ${allRoutes.length} pages prerendered (${staticRoutes.length} static + ${propertyRoutes.length} properties)`);
      },
    },
  };
}
