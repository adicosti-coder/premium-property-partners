/**
 * Custom Vite plugin that generates static HTML files for SEO-critical routes
 * at build time. Uses neighborhoods.ts as the Single Source of Truth for
 * neighborhood data (slugs, titles, descriptions, FAQs).
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
}

const BASE_URL = 'https://www.realtrust.ro';

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

function buildRoutes(): PrerenderRoute[] {
  const routes: PrerenderRoute[] = [];

  // Index page
  routes.push({
    path: '/imobiliare-timisoara',
    title: 'Imobiliare Timișoara — Apartamente pe Zone | RealTrust',
    description: 'Explorează apartamentele de vânzare din Timișoara pe zone: Girocului, Aradului, Circumvalațiunii, Șagului, Complex Studențesc, Calea Lipovei, ISHO.',
    h1: 'Apartamente de Vânzare în Timișoara',
    canonical: `${BASE_URL}/imobiliare-timisoara`,
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

  // Neighborhood pages — derived from the canonical neighborhoods array
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

function generateHtml(template: string, route: PrerenderRoute): string {
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
    </div>`;

  html = html.replace(
    '<div id="root">',
    `${seoBlock}\n    <div id="root">`
  );

  return html;
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
        const routes = buildRoutes();

        console.log(`[prerender-seo] Generating ${routes.length} static HTML files...`);

        for (const route of routes) {
          const dirPath = path.join(outDir, route.path);
          fs.mkdirSync(dirPath, { recursive: true });

          const htmlContent = generateHtml(template, route);
          const filePath = path.join(dirPath, 'index.html');
          fs.writeFileSync(filePath, htmlContent, 'utf-8');

          console.log(`  ✓ ${route.path}/index.html`);
        }

        console.log(`[prerender-seo] Done — ${routes.length} pages prerendered`);
      },
    },
  };
}
