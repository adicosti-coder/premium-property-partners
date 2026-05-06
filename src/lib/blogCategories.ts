// Blog category metadata + slug mapping
export interface BlogCategoryMeta {
  slug: string;
  name: string;
  dbCategories: string[]; // categories in DB that map to this hub
  title: string;
  description: string;
  intro: string;
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
    ctaLabel: "Calculator ROI net",
    ctaHref: "/calculator-roi",
  },
];

export const findBlogCategoryBySlug = (slug: string) =>
  BLOG_CATEGORIES.find((c) => c.slug === slug);
