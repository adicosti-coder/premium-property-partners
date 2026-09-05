/**
 * Build-time route builders for every remaining public URL that used to ship
 * without server-side HTML (blog articles, blog hubs, complexes, zone landings
 * and the remaining commercial/service pages).
 *
 * Runs inside vite-prerender-seo (build only). Data comes from the public
 * (anon) REST API, so only content that is genuinely readable by an anonymous
 * visitor ends up in the static HTML. Premium articles are not readable
 * publicly, so they are emitted as `noindex` documents instead.
 */

const BASE_URL = 'https://realtrust.ro';
const SUPABASE_URL = 'https://mvzssjyzbwccioqvhjpo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8';

export interface ExtraRoute {
  path: string;
  title: string;
  description: string;
  h1: string;
  jsonLd: Record<string, unknown> | Record<string, unknown>[];
  canonical: string;
  seoBody?: string;
  image?: string;
  /** Emitted with `<meta name="robots" content="noindex, follow">`. */
  noindex?: boolean;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Trims to a whole word without exceeding `max` characters. */
export function clampText(input: string, max: number): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—|]+$/, '');
}

async function restGet<T>(pathAndQuery: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[prerender-seo] REST ${pathAndQuery} → ${res.status}`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.warn(`[prerender-seo] REST ${pathAndQuery} failed:`, (err as Error).message);
    return [];
  }
}

async function rpc<T>(name: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
      },
      body: '{}',
    });
    if (!res.ok) {
      console.warn(`[prerender-seo] rpc ${name} → ${res.status}`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.warn(`[prerender-seo] rpc ${name} failed:`, (err as Error).message);
    return [];
  }
}

/* ------------------------------------------------------------------ markdown */

/**
 * Minimal, dependency-free Markdown → HTML for article bodies. Only the
 * constructs used by the editorial content are handled; anything else is
 * emitted as escaped text, so no raw HTML from the database can be injected.
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  let paragraph: string[] = [];

  const inline = (raw: string): string => {
    let s = esc(raw);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
  };

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      // Article H1 is the page title, so demote in-body headings by one level.
      const level = Math.min(heading[1].length + 1, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }
    if (/^\|/.test(line) || /^>\s?/.test(line)) {
      flushParagraph();
      closeList();
      out.push(`<p>${inline(line.replace(/^[|>]\s?/, '').replace(/\|/g, ' · '))}</p>`);
      continue;
    }
    closeList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}

/* ------------------------------------------------------------------ articles */

interface DbArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cover_image: string | null;
  main_image_url: string | null;
  faq_items: unknown;
  geo_location: string | null;
  tags: string[] | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'ghid-turistic-timisoara': 'Ghid turistic Timișoara',
  'investitii-imobiliare': 'Investiții imobiliare',
  'sfaturi-proprietari': 'Sfaturi proprietari',
  'taxe-legislatie': 'Taxe & legislație',
};

const CATEGORY_SLUGS = Object.keys(CATEGORY_LABELS);

/** Articles readable by an anonymous visitor (non-premium, published). */
export async function fetchPublicArticles(): Promise<DbArticle[]> {
  return restGet<DbArticle>(
    'blog_articles?is_published=eq.true&is_premium=eq.false&select=slug,title,excerpt,content,category,author_name,published_at,updated_at,created_at,meta_title,meta_description,cover_image,main_image_url,faq_items,geo_location,tags&order=published_at.desc',
  );
}

/** Published premium articles (slug + title only, via a security-definer RPC). */
export async function fetchPremiumArticleStubs(): Promise<Array<{ slug: string; title: string }>> {
  return rpc<{ slug: string; title: string }>('get_premium_article_slugs');
}

const imageUrl = (a: DbArticle): string | undefined => {
  const raw = (a.main_image_url || a.cover_image || '').trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SUPABASE_URL}/storage/v1/object/public/blog-images/${raw.replace(/^\/+/, '')}`;
};

const articleDate = (a: DbArticle): string =>
  (a.published_at || a.created_at || '').slice(0, 10);

function faqEntities(a: DbArticle): Array<Record<string, unknown>> {
  const items = Array.isArray(a.faq_items) ? a.faq_items : [];
  return items
    .map((raw) => raw as { question?: string; answer?: string; q?: string; a?: string })
    .map((it) => ({ q: (it.question || it.q || '').trim(), a: (it.answer || it.a || '').trim() }))
    .filter((it) => it.q && it.a)
    .map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    }));
}

export function buildArticleRoutes(articles: DbArticle[]): ExtraRoute[] {
  return articles.map((a) => {
    const canonical = `${BASE_URL}/blog/${a.slug}`;
    const title = clampText(a.meta_title?.trim() || `${a.title} | RealTrust`, 60);
    const description = clampText(
      a.meta_description?.trim() || a.excerpt?.trim() || a.title,
      158,
    );
    const category = a.category && CATEGORY_LABELS[a.category] ? a.category : null;
    const author = (a.author_name || 'Adrian Costi').trim();
    const date = articleDate(a);
    const img = imageUrl(a);
    const faqs = faqEntities(a);

    const bodyHtml = markdownToHtml(a.content || '');
    const metaLine = `<p><span>Autor: <a href="${BASE_URL}/autor/adrian-costi">${esc(author)}</a></span>${
      date ? ` · <span>Publicat: <time datetime="${date}">${date}</time></span>` : ''
    }${category ? ` · <span>Categorie: <a href="${BASE_URL}/blog/categorie/${category}">${esc(CATEGORY_LABELS[category])}</a></span>` : ''}</p>`;

    const faqHtml = faqs.length
      ? `<h2>Întrebări frecvente</h2>${faqs
          .map(
            (f) =>
              `<h3>${esc(String(f.name))}</h3><p>${esc(
                String((f.acceptedAnswer as { text: string }).text),
              )}</p>`,
          )
          .join('')}`
      : '';

    const seoBody = [
      metaLine,
      a.excerpt ? `<p>${esc(a.excerpt)}</p>` : '',
      bodyHtml,
      faqHtml,
      `<p>Vezi și: <a href="${BASE_URL}/blog">toate articolele</a>, <a href="${BASE_URL}/investitii">investiții imobiliare Timișoara</a>, <a href="${BASE_URL}/pentru-proprietari">administrare apartamente în regim hotelier</a>, <a href="${BASE_URL}/preturi">prețuri administrare</a>, <a href="${BASE_URL}/contact">contact RealTrust</a>.</p>`,
    ]
      .filter(Boolean)
      .join('\n');

    const jsonLd: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: clampText(a.title, 110),
        description,
        url: canonical,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        inLanguage: 'ro-RO',
        ...(date ? { datePublished: date, dateModified: (a.updated_at || a.published_at || '').slice(0, 10) || date } : {}),
        author: { '@type': 'Person', name: author, url: `${BASE_URL}/autor/adrian-costi` },
        publisher: {
          '@type': 'Organization',
          name: 'RealTrust',
          legalName: 'SC Imo Business Centrum SRL',
          url: BASE_URL,
        },
        ...(img ? { image: img } : {}),
        ...(a.tags && a.tags.length ? { keywords: a.tags.join(', ') } : {}),
        ...(category ? { articleSection: CATEGORY_LABELS[category] } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Acasă', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: clampText(a.title, 90), item: canonical },
        ],
      },
    ];
    if (faqs.length) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: faqs,
      });
    }

    return {
      path: `/blog/${a.slug}`,
      title,
      description,
      h1: a.title,
      canonical,
      seoBody,
      image: img,
      jsonLd,
    };
  });
}

/**
 * Premium articles are readable only by authenticated members, so they must not
 * be presented to crawlers as public documents: they ship a `noindex` head and
 * are excluded from the sitemap.
 */
export function buildPremiumStubRoutes(stubs: Array<{ slug: string; title: string }>): ExtraRoute[] {
  return stubs.map((s) => {
    const canonical = `${BASE_URL}/blog/${s.slug}`;
    return {
      path: `/blog/${s.slug}`,
      title: clampText(`${s.title} | RealTrust`, 60),
      description:
        'Articol disponibil exclusiv pentru membrii autentificați RealTrust. Autentifică-te pentru a-l citi integral.',
      h1: s.title,
      canonical,
      noindex: true,
      seoBody: `<p>Acest articol este disponibil exclusiv pentru membrii autentificați RealTrust. <a href="${BASE_URL}/blog">Vezi articolele publice</a>.</p>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url: canonical,
        name: s.title,
        isAccessibleForFree: false,
      },
    };
  });
}

/* ----------------------------------------------------------------- blog hubs */

export function buildBlogHubRoutes(articles: DbArticle[]): ExtraRoute[] {
  const routes: ExtraRoute[] = [];
  const recent = articles.slice(0, 20);

  routes.push({
    path: '/blog',
    title: 'Ghid imobiliar Timișoara | Blog RealTrust',
    description:
      'Ghidul pieței imobiliare din Timișoara: analize de randament, strategii de investiții și sfaturi pentru vânzări sau regim hotelier.',
    h1: 'Ghid imobiliar Timișoara: investiții & regim hotelier',
    canonical: `${BASE_URL}/blog`,
    seoBody: `
      <p>Analize de piață, studii de caz și ghiduri pentru proprietari, investitori și oaspeți din Timișoara, publicate de echipa RealTrust.</p>
      <h2>Categorii</h2>
      <ul>${CATEGORY_SLUGS.map(
        (s) => `<li><a href="${BASE_URL}/blog/categorie/${s}">${esc(CATEGORY_LABELS[s])}</a></li>`,
      ).join('')}</ul>
      <h2>Articole recente</h2>
      <ul>${recent
        .map((a) => `<li><a href="${BASE_URL}/blog/${a.slug}">${esc(a.title)}</a></li>`)
        .join('')}</ul>
    `,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${BASE_URL}/blog#blog`,
      name: 'Blog RealTrust',
      url: `${BASE_URL}/blog`,
      inLanguage: 'ro-RO',
      publisher: { '@type': 'Organization', name: 'RealTrust', url: BASE_URL },
      blogPost: recent.slice(0, 10).map((a) => ({
        '@type': 'BlogPosting',
        headline: clampText(a.title, 110),
        url: `${BASE_URL}/blog/${a.slug}`,
        datePublished: articleDate(a),
      })),
    },
  });

  // Location archives (/blog/locatie/:slug) built from geo_location values.
  const slugifyLocation = (input: string): string =>
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const byLocation = new Map<string, { label: string; items: DbArticle[] }>();
  for (const a of articles) {
    if (!a.geo_location) continue;
    const slug = slugifyLocation(a.geo_location);
    if (!slug) continue;
    const entry = byLocation.get(slug) ?? { label: a.geo_location, items: [] };
    entry.items.push(a);
    byLocation.set(slug, entry);
  }

  for (const [slug, { label, items }] of byLocation) {
    routes.push({
      path: `/blog/locatie/${slug}`,
      title: clampText(`Articole despre ${label} | RealTrust`, 60),
      description: clampText(
        `Toate analizele și ghidurile RealTrust despre piața imobiliară și cazarea în ${label}.`,
        158,
      ),
      h1: `Articole despre ${label}`,
      canonical: `${BASE_URL}/blog/locatie/${slug}`,
      seoBody: `<p>Analize, ghiduri și studii de caz publicate de RealTrust despre ${esc(label)}.</p><ul>${items
        .slice(0, 40)
        .map((a) => `<li><a href="${BASE_URL}/blog/${a.slug}">${esc(a.title)}</a></li>`)
        .join('')}</ul>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Articole despre ${label}`,
        url: `${BASE_URL}/blog/locatie/${slug}`,
        inLanguage: 'ro-RO',
      },
    });
  }

  return routes;
}

/* ---------------------------------------------------------------- complexes */

interface DbComplex {
  slug: string;
  name: string;
  zone: string | null;
  description_ro: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export async function fetchComplexes(): Promise<DbComplex[]> {
  return restGet<DbComplex>(
    'residential_complexes?is_active=eq.true&slug=not.is.null&select=slug,name,zone,description_ro,seo_title,seo_description&order=slug.asc',
  );
}

/**
 * Complex detail pages. `/complexe/<slug>` is the canonical route (the legacy
 * `/complex/<slug>` form redirects), so only that form is emitted. Complexes
 * that already have a hand-written landing route are skipped.
 */
export function buildComplexRoutes(
  complexes: DbComplex[],
  takenPaths: Set<string>,
): ExtraRoute[] {
  const routes: ExtraRoute[] = [];
  for (const c of complexes) {
    const zone = (c.zone || 'Timișoara').trim();
    const detailPath = `/complexe/${c.slug}`;
    if (takenPaths.has(detailPath)) continue;
    const canonical = `${BASE_URL}${detailPath}`;
    const description = clampText(
      c.seo_description?.trim() ||
        c.description_ro?.trim() ||
        `Apartamente în ansamblul ${c.name} din ${zone}, Timișoara: disponibilitate, administrare în regim hotelier și analiză de randament cu RealTrust.`,
      158,
    );
    routes.push({
      path: detailPath,
      title: clampText(c.seo_title?.trim() || `${c.name} Timișoara | Apartamente RealTrust`, 60),
      description,
      h1: `${c.name}, Timișoara`,
      canonical,
      seoBody: `
        <p>${esc(description)}</p>
        ${c.description_ro ? `<p>${esc(clampText(c.description_ro, 900))}</p>` : ''}
        <h2>Servicii RealTrust în ${esc(c.name)}</h2>
        <ul>
          <li>Administrare apartamente în regim hotelier sub brandul ApArt Hotel by RealTrust</li>
          <li>Analiză de randament și <a href="${BASE_URL}/calculator-roi">calculator ROI</a></li>
          <li>Vânzări și închirieri prin <a href="${BASE_URL}/servicii-imobiliare">serviciile imobiliare RealTrust</a></li>
        </ul>
        <p>Vezi toate <a href="${BASE_URL}/ansambluri-rezidentiale">ansamblurile rezidențiale</a> și <a href="${BASE_URL}/cartiere">cartierele din Timișoara</a>. Contact: +40 799 069 256, info@realtrust.ro.</p>
      `,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'ApartmentComplex',
          '@id': `${canonical}#complex`,
          name: c.name,
          url: canonical,
          description,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Timișoara',
            addressRegion: 'Timiș',
            addressCountry: 'RO',
            ...(zone ? { streetAddress: zone } : {}),
          },
        },
      ],
    });
    takenPaths.add(detailPath);
  }
  return routes;
}

/* --------------------------------------------------- remaining static routes */

const ENTITY_SHORT =
  'RealTrust este o companie imobiliară din Timișoara (SC Imo Business Centrum SRL, CUI RO14380627) specializată în investiții imobiliare, vânzare, închiriere și administrare de apartamente în regim hotelier sub brandul ApArt Hotel by RealTrust.';

const NAP_HTML = `<p>RealTrust — SC Imo Business Centrum SRL, Strada Samuil Micu Nr.14, ap.4, Timișoara 300125, județul Timiș. Telefon: +40 799 069 256. E-mail: info@realtrust.ro.</p>`;

export function buildRemainingStaticRoutes(): ExtraRoute[] {
  const page = (
    path: string,
    title: string,
    description: string,
    h1: string,
    body: string,
    schemaType = 'WebPage',
    extraSchema: Record<string, unknown> = {},
  ): ExtraRoute => ({
    path,
    title,
    description,
    h1,
    canonical: `${BASE_URL}${path}`,
    seoBody: `${body}\n${NAP_HTML}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: title,
      description,
      url: `${BASE_URL}${path}`,
      inLanguage: 'ro-RO',
      ...extraSchema,
    },
  });

  const routes: ExtraRoute[] = [];

  routes.push(
    page(
      '/preturi',
      'Prețuri administrare apartamente Timișoara | RealTrust',
      'Pachete administrare regim hotelier RealTrust: Starter 15%, Esențial 18%, Standard 20%, Premium 25%. Fără costuri ascunse. Comparație completă.',
      'Prețuri administrare apartamente în regim hotelier, Timișoara',
      `
      <p>${ENTITY_SHORT}</p>
      <h2>Pachete de administrare</h2>
      <ul>
        <li><strong>Starter — 15%</strong> din venitul încasat</li>
        <li><strong>Esențial — 18%</strong> din venitul încasat</li>
        <li><strong>Standard — 20%</strong> din venitul încasat</li>
        <li><strong>Premium — 25%</strong> din venitul încasat</li>
      </ul>
      <p>Comisionul se aplică la venitul efectiv încasat, fără costuri ascunse. Ipotezele folosite în proiecțiile noastre: randament net țintă 9,4%, ocupare medie 75% și 27% deduceri pentru management și taxe.</p>
      <p>Vezi <a href="${BASE_URL}/blog/cat-costa-administrarea-apartament-regim-hotelier-timisoara">cât costă administrarea unui apartament în regim hotelier</a>, <a href="${BASE_URL}/pentru-proprietari">serviciul complet pentru proprietari</a> și <a href="${BASE_URL}/calculator-roi">calculatorul de randament</a>.</p>
      `,
      'WebPage',
      { about: { '@type': 'Service', name: 'Administrare apartamente în regim hotelier', areaServed: 'Timișoara' } },
    ),
    page(
      '/imobiliare',
      'Imobiliare Timișoara: vânzări, închirieri, regim hotelier',
      'Anunțuri imobiliare Timișoara: apartamente de vânzare, de închiriat și unități administrate în regim hotelier, cu analiză de randament RealTrust.',
      'Imobiliare Timișoara: vânzări, închirieri și regim hotelier',
      `
      <p>${ENTITY_SHORT}</p>
      <p>Portofoliul include apartamente în ansambluri precum ISHO, RING, Paltim, Fructus Plaza și City of Mara, precum și unități în cartierele Cetate, Iosefin, Fabric, Dumbrăvița și zona Aradului.</p>
      <p>Vezi <a href="${BASE_URL}/servicii-imobiliare">serviciile imobiliare</a>, <a href="${BASE_URL}/catalog-investitii">catalogul de investiții</a>, <a href="${BASE_URL}/cartiere">cartierele din Timișoara</a> și <a href="${BASE_URL}/ansambluri-rezidentiale">ansamblurile rezidențiale</a>.</p>
      `,
      'CollectionPage',
    ),
    page(
      '/catalog-investitii',
      'Catalog investiții imobiliare Timișoara | RealTrust',
      'Catalog de apartamente pentru investiții în Timișoara: randament estimat, capital necesar și administrare completă în regim hotelier prin RealTrust.',
      'Catalog investiții imobiliare Timișoara',
      `
      <p>${ENTITY_SHORT}</p>
      <p>Fiecare oportunitate din catalog include zona, tipul de apartament, capitalul necesar și randamentul estimat. Proiecțiile pornesc de la ipotezele publicate: 9,4% randament net țintă, 75% ocupare medie și 27% deduceri pentru management și taxe.</p>
      <p>Vezi <a href="${BASE_URL}/investitii">pagina de investiții</a>, <a href="${BASE_URL}/zone-investitii-timisoara">zonele recomandate pentru investiții</a> și <a href="${BASE_URL}/calculator-roi">calculatorul de randament</a>.</p>
      `,
      'CollectionPage',
    ),
    page(
      '/hostscan-ai',
      'HostScan AI: analiză gratuită anunț regim hotelier',
      'HostScan AI analizează gratuit anunțul și fotografiile apartamentului tău în regim hotelier și îți arată ce poți îmbunătăți pentru mai multe rezervări.',
      'HostScan AI — analiza anunțului tău în regim hotelier',
      `
      <p>${ENTITY_SHORT}</p>
      <p>HostScan AI analizează fotografiile, titlul și descrierea unui apartament listat în regim hotelier și returnează un scor cu recomandări concrete de îmbunătățire. Analiza este gratuită și nu presupune un contract de administrare.</p>
      <p>Vezi și <a href="${BASE_URL}/pentru-proprietari">administrarea completă pentru proprietari</a>, <a href="${BASE_URL}/preturi">prețurile</a> și <a href="${BASE_URL}/evaluare-gratuita">evaluarea gratuită a proprietății</a>.</p>
      `,
      'WebApplication',
      { applicationCategory: 'BusinessApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    ),
    page(
      '/rezerva-direct',
      'Rezervare directă apartamente Timișoara | ApArt Hotel',
      'Rezervă direct un apartament în regim hotelier în Timișoara: disponibilitate reală, tarife fără comisioane de platformă și confirmare de la RealTrust.',
      'Rezervare directă apartamente în Timișoara',
      `
      <p>Apartamentele administrate sub brandul ApArt Hotel by RealTrust pot fi rezervate direct, fără comisioane de platformă. Confirmarea se face de echipa RealTrust din Timișoara.</p>
      <p>Vezi <a href="${BASE_URL}/cazare">toate unitățile de cazare</a> și <a href="${BASE_URL}/contact">datele de contact</a>.</p>
      `,
      'WebPage',
    ),
    page(
      '/comunitate',
      'Comunitate RealTrust: articole scrise de oaspeți',
      'Articole trimise de oaspeți și proprietari despre Timișoara, cazare în regim hotelier și viața în oraș, publicate în comunitatea RealTrust.',
      'Comunitatea RealTrust',
      `
      <p>Comunitatea RealTrust publică articole trimise de oaspeți și proprietari despre Timișoara și despre experiența cazării în regim hotelier.</p>
      <p>Vezi <a href="${BASE_URL}/blog">blogul RealTrust</a> și <a href="${BASE_URL}/cazare">apartamentele disponibile</a>.</p>
      `,
      'CollectionPage',
    ),
    page(
      '/recomanda-proprietar',
      'Program de recomandare proprietari | RealTrust',
      'Recomandă un proprietar de apartament din Timișoara și primești cazare gratuită sau comision, dacă apartamentul intră în administrare RealTrust.',
      'Recomandă un proprietar',
      `
      <p>Dacă recomanzi un proprietar de apartament din Timișoara și apartamentul intră în administrare RealTrust, primești cazare gratuită sau comision.</p>
      <p>Vezi <a href="${BASE_URL}/pentru-proprietari">ce include administrarea</a> și <a href="${BASE_URL}/preturi">pachetele de preț</a>.</p>
      `,
      'WebPage',
    ),
    page(
      '/adauga-anunt',
      'Adaugă un anunț imobiliar | RealTrust Timișoara',
      'Trimite datele apartamentului tău din Timișoara pentru listare sau administrare în regim hotelier. Echipa RealTrust verifică fiecare anunț.',
      'Adaugă un anunț imobiliar',
      `
      <p>Trimite datele apartamentului tău din Timișoara pentru listare sau pentru administrare în regim hotelier. Fiecare anunț este verificat de echipa RealTrust înainte de publicare.</p>
      <p>Vezi <a href="${BASE_URL}/pentru-proprietari">serviciile pentru proprietari</a> și <a href="${BASE_URL}/evaluare-gratuita">evaluarea gratuită</a>.</p>
      `,
      'WebPage',
    ),
  );

  // Zone landing pages (/zona/:zone) — copy mirrors src/pages/ZoneLanding.tsx.
  const zones: Array<{ slug: string; name: string; title: string; description: string; h1: string; intro: string }> = [
    {
      slug: 'centru',
      name: 'Centrul Istoric',
      title: 'Cazare regim hotelier Centrul Istoric Timișoara',
      description:
        'Cazare regim hotelier în Centrul Istoric Timișoara, la 2 minute de Piața Victoriei. Apartamente premium gestionate profesional, check-in inteligent.',
      h1: 'Cazare premium în Centrul Istoric Timișoara',
      intro:
        'Apartamente gestionate profesional la 2 minute de Piața Victoriei și Piața Unirii, în Centrul Istoric al Timișoarei.',
    },
    {
      slug: 'iulius-town',
      name: 'Iulius Town & Dâmbovița',
      title: 'Cazare regim hotelier lângă Iulius Town Timișoara',
      description:
        'Cazare regim hotelier lângă Iulius Town Mall Timișoara — apartamente moderne în complexe premium, smart lock, ideal business și familii.',
      h1: 'Cazare modernă lângă Iulius Town Timișoara',
      intro:
        'Apartamente noi în complexe rezidențiale premium, la 5 minute de cel mai mare mall din vestul României.',
    },
    {
      slug: 'fabric',
      name: 'Fabric & Aradului',
      title: 'Cazare regim hotelier Fabric & Aradului Timișoara',
      description:
        'Cazare regim hotelier în Fabric Timișoara — apartamente renovate lângă Calea Aradului, prețuri accesibile și potențial ridicat de creștere.',
      h1: 'Cazare autentică în Fabric Timișoara',
      intro:
        'Cartierul cu cel mai mare potențial de creștere — apartamente renovate în zona Fabric și Aradului.',
    },
  ];

  for (const z of zones) {
    routes.push({
      path: `/zona/${z.slug}`,
      title: z.title,
      description: z.description,
      h1: z.h1,
      canonical: `${BASE_URL}/zona/${z.slug}`,
      seoBody: `
        <p>${esc(z.intro)}</p>
        <p>${ENTITY_SHORT}</p>
        <p>Vezi <a href="${BASE_URL}/cazare">toate unitățile de cazare</a>, <a href="${BASE_URL}/cartiere">cartierele din Timișoara</a> și <a href="${BASE_URL}/rezerva-direct">rezervarea directă</a>.</p>
        ${NAP_HTML}
      `,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: z.title,
        description: z.description,
        url: `${BASE_URL}/zona/${z.slug}`,
        inLanguage: 'ro-RO',
        about: { '@type': 'Place', name: `${z.name}, Timișoara` },
      },
    });
  }

  return routes;
}
