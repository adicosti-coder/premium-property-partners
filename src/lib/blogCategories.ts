// Blog category metadata + slug mapping (content pillars / topic hubs).
export interface BlogCategoryMeta {
  slug: string;
  name: string;
  dbCategories: string[]; // categories in DB that map to this hub
  title: string;
  description: string;
  intro: string;
  /** Longer SEO-optimized hub paragraph rendered above the article grid. */
  hubIntro: string;
  /** 3-5 keyword phrases echoed in the hub H2 subtext for topical authority. */
  hubKeywords: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const BLOG_CATEGORIES: BlogCategoryMeta[] = [
  {
    slug: "ghid-turistic-timisoara",
    name: "Ghid Turistic Timișoara",
    dbCategories: ["Ghiduri Oaspeți", "Cazare Oaspeți", "ghiduri"],
    title: "Ghid Turistic Timișoara — Restaurante, Evenimente, Atracții 2026",
    description:
      "Ghidul complet pentru oaspeții Timișoarei: top restaurante, evenimente 2026, cartiere, transport public, cafenele specialty și excursii de o zi.",
    intro:
      "Tot ce trebuie să știi pentru o vizită memorabilă în Timișoara — selectat de echipa ApArt Hotel pentru oaspeții noștri.",
    hubIntro:
      "Timișoara — Capitala Culturală Europeană 2023 — rămâne în 2026 unul dintre cele mai vibrante orașe din România. Ghidul nostru turistic reunește recomandările testate ale echipei RealTrust: restaurante autentice în Cetate și Iosefin, cafenele specialty, festivaluri majore (JazzTM, Timișoara Open, Codru), muzee, excursii de o zi în jurul orașului și sfaturi practice de transport pentru oaspeții care caută experiențe locale, nu clișee turistice.",
    hubKeywords: [
      "restaurante Timișoara 2026",
      "evenimente Timișoara",
      "atracții turistice Timișoara",
      "cartiere Timișoara",
      "ce să vizitezi în Timișoara",
    ],
    ctaLabel: "Rezervă apartament în Timișoara",
    ctaHref: "/rezerva-direct",
  },
  {
    slug: "investitii-imobiliare",
    name: "Investiții Imobiliare",
    dbCategories: ["Investiții", "Imobiliare", "market-insights", "analize", "piață"],
    title: "Investiții Imobiliare Timișoara — Randament, ROI, Studii de Caz",
    description:
      "Analize de piață, ROI 9.4% net, studii de caz reale și ghiduri pentru investitori imobiliari în Timișoara — inclusiv regim hotelier.",
    intro:
      "Strategii verificate de investiții imobiliare în Timișoara: de la calcul randament până la exit strategy.",
    hubIntro:
      "Piața imobiliară din Timișoara oferă în 2026 unul dintre cele mai atractive raporturi randament/risc din România — cu ROI net documentat de 9.2–9.4% pe an în regim hotelier profesionist și o cerere susținută de digital nomads, angajați corporate (Continental, Hella, Nokia, Flex) și studenți. Articolele din acest pilon acoperă infrastructură (Autostrada A1 Lugoj–Deva), dobânzi (IRCC 2026 vs credit fix), zone cu potențial (Cetate, Iosefin, Fabric, Dumbrăvița) și studii de caz complete cu cifre reale.",
    hubKeywords: [
      "randament apartament Timișoara",
      "ROI regim hotelier",
      "investiție imobiliară Timiș",
      "yield real estate 2026",
      "IRCC 2026 vs fix",
    ],
    ctaLabel: "Vezi catalogul de investiții",
    ctaHref: "/catalog-investitii",
  },
  {
    slug: "sfaturi-proprietari",
    name: "Sfaturi Proprietari",
    dbCategories: [
      "Proprietari",
      "Operațional",
      "Administrare Hotelieră",
      "Revenue Management",
      "Distribuție",
      "Mentenanță",
      "Branding",
      "amenajare",
      "tehnologie",
      "sfaturi",
    ],
    title: "Sfaturi pentru Proprietari — Administrare Regim Hotelier Timișoara",
    description:
      "Ghiduri practice pentru proprietari de apartamente: revenue management, distribuție OTA, mentenanță, branding și amenajare pentru regim hotelier.",
    intro:
      "Cum transformi un apartament din Timișoara într-un activ profitabil administrat profesionist.",
    hubIntro:
      "Un apartament în Timișoara poate genera cu 40–60% mai mult venit în regim hotelier decât în chirie clasică — dar doar cu un stack operațional corect. Acest hub reunește playbook-urile RealTrust: smart locks și PMS pentru check-in 100% automat, distribuție multi-canal Booking + Airbnb + Expedia, revenue management dinamic, contracte corporate long-stay și tacticile care duc listările peste 9.5⭐ pe platforme.",
    hubKeywords: [
      "regim hotelier Timișoara",
      "smart lock Airbnb",
      "PMS închiriere pe termen scurt",
      "rating 9.5 Booking",
      "corporate long-stay Timișoara",
    ],
    ctaLabel: "Solicită evaluare gratuită",
    ctaHref: "/evaluare-gratuita",
  },
  {
    slug: "taxe-legislatie",
    name: "Taxe & Legislație",
    dbCategories: ["Taxe & Legislație"],
    title: "Taxe & Legislație Imobiliară 2026 — Ghid Fiscal pentru Proprietari",
    description:
      "Ghiduri actualizate despre fiscalitate, ANAF, e-Factura, e-TVA și obligațiile legale pentru proprietarii de apartamente în regim hotelier.",
    intro: "Tot ce trebuie să știi despre obligațiile fiscale pentru veniturile din chirii și regim hotelier.",
    hubIntro:
      "Legislația fiscală pentru regim hotelier în România s-a schimbat semnificativ în 2026: praguri noi de TVA, e-Factura obligatorie, cotă micro-întreprindere revizuită. Articolele din acest pilon compară concret SRL vs PFA pentru cazare turistică, calculează pragurile de profitabilitate și explică pas cu pas obligațiile ANAF, astfel încât proprietarii să aleagă structura optimă înainte de a semna primul contract de management.",
    hubKeywords: [
      "SRL vs PFA regim hotelier",
      "impozit chirii 2026",
      "e-Factura ANAF cazare",
      "TVA închiriere apartament",
      "fiscalitate Airbnb România",
    ],
    ctaLabel: "Calculator ROI net",
    ctaHref: "/calculator-roi",
  },
];

export const findBlogCategoryBySlug = (slug: string) =>
  BLOG_CATEGORIES.find((c) => c.slug === slug);
