/**
 * Custom Vite plugin that generates static HTML files for SEO-critical routes
 * at build time. No Puppeteer/headless browser needed — injects SEO content
 * (title, meta, h1, JSON-LD) directly into the HTML template.
 */
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  h1: string;
  jsonLd: Record<string, unknown>;
  canonical: string;
}

const BASE_URL = 'https://www.realtrust.ro';

// SEO data for each route — mirrors what SEOHead/components would render
const neighborhoods = [
  { slug: 'zona-girocului', name: 'Zona Girocului', avgPrice: 1650 },
  { slug: 'zona-aradului', name: 'Zona Aradului', avgPrice: 1780 },
  { slug: 'circumvalatiunii', name: 'Circumvalațiunii', avgPrice: 1420 },
  { slug: 'sagului', name: 'Șagului', avgPrice: 1550 },
  { slug: 'complex-studentesc', name: 'Complex Studențesc', avgPrice: 1380 },
  { slug: 'calea-lipovei', name: 'Calea Lipovei', avgPrice: 1480 },
  { slug: 'isho', name: 'ISHO', avgPrice: 2100 },
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
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Timișoara',
        addressRegion: 'Timiș',
        addressCountry: 'RO',
      },
    },
  });

  // Neighborhood pages
  for (const n of neighborhoods) {
    routes.push({
      path: `/imobiliare-timisoara/${n.slug}`,
      title: `Apartamente ${n.name} Timișoara | RealTrust Imobiliare`,
      description: `Apartamente de vânzare în ${n.name}, Timișoara. Prețuri de la ${n.avgPrice.toLocaleString('ro-RO')} €/mp, administrare RealTrust inclusă.`,
      h1: `Apartamente de vânzare în ${n.name}, Timișoara`,
      canonical: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: `Apartamente ${n.name} Timișoara`,
        description: `Apartamente de vânzare în ${n.name}, Timișoara`,
        url: `${BASE_URL}/imobiliare-timisoara/${n.slug}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Timișoara',
          addressRegion: 'Timiș',
          addressCountry: 'RO',
        },
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
      description: 'Prețuri medii pe metru pătrat în Timișoara, tendințe 2026',
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
      provider: {
        '@type': 'Organization',
        name: 'RealTrust & ApArt Hotel',
      },
    },
  });

  return routes;
}

function generateHtml(template: string, route: PrerenderRoute): string {
  // Replace <title> tag
  let html = template.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(route.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escapeHtml(route.description)}">`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Inject SEO content block before <div id="root"> for crawlers
  const seoBlock = `
    <!-- Prerendered SEO content for crawlers -->
    <div id="seo-prerender" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden" aria-hidden="true">
      <h1>${escapeHtml(route.h1)}</h1>
      <script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>
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
