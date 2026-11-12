/**
 * Blog slugs consolidated into another page (mirror of the keys in
 * src/data/consolidatedArticleRedirects.ts — seoLanguagePolicy.test.ts keeps
 * them equal). They redirect permanently, so sitemaps never list them.
 */
export const CONSOLIDATED_ARTICLE_SLUGS: readonly string[] = [
  "zone-hot-investitii-timisoara-2026",
  "cele-mai-bune-cartiere-investitii-timisoara-2026",
  "timisoara-investitii-imobiliare",
  "ghid-anaf-regim-hotelier-2026-efactura-etva-casa-marcat",
  "regim-hotelier-2026-sistem-forfetar-taxe",
  "taxe-2026-ce-trebuie-sa-stii",
  "smart-locks-ghid-complet",
  "self-checkin-politica-elibereaza-timpul",
  "reviews-playbook-ghid-recenzii",
  "pricing-weekends-strategii-profitabile",
  "min-stay-strategie-adr-ocupare",
  "ghid-maximizare-venituri-inchirieri",
  "mix-canale-reduce-dependenta-booking",
  "perceptie-premium-fara-costuri-inutile",
  "housekeeping-qc-checklist-hotel",
  "top-20-atractii-turistice-timisoara-ghid-complet-2026",
  "chirii-termen-lung-apartamente-nzeb-timisoara",
  "5-greseli-comune-administrare",
];

export const CONSOLIDATED_ARTICLE_SLUG_LIST = `(${CONSOLIDATED_ARTICLE_SLUGS.join(",")})`;
