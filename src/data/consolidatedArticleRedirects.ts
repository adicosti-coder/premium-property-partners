/**
 * Articole consolidate în etapa editorială: slug vechi -> destinația canonică.
 * Sunt redirecturi permanente la nivel de aplicație (replace), pentru a păstra
 * autoritatea linkurilor externe și a evita paginile 404.
 */
export const CONSOLIDATED_ARTICLE_REDIRECTS: Record<string, string> = {
  "zone-hot-investitii-timisoara-2026": "/zone-investitii-timisoara",
  "cele-mai-bune-cartiere-investitii-timisoara-2026": "/zone-investitii-timisoara",
  "timisoara-investitii-imobiliare": "/blog/ghid-investitii-imobiliare-timisoara-2026",
  "ghid-anaf-regim-hotelier-2026-efactura-etva-casa-marcat":
    "/blog/ghid-complet-fiscalitate-regim-hotelier-2026",
  "regim-hotelier-2026-sistem-forfetar-taxe":
    "/blog/ghid-complet-fiscalitate-regim-hotelier-2026",
  "taxe-2026-ce-trebuie-sa-stii": "/blog/ghid-complet-fiscalitate-regim-hotelier-2026",
  "smart-locks-ghid-complet":
    "/blog/smart-lock-pms-check-in-automat-regim-hotelier-2026",
  "self-checkin-politica-elibereaza-timpul":
    "/blog/smart-lock-pms-check-in-automat-regim-hotelier-2026",
  "reviews-playbook-ghid-recenzii":
    "/blog/rating-9-5-plus-booking-airbnb-playbook-aparthotel",
  "pricing-weekends-strategii-profitabile": "/blog/preturi-dinamice-2026-ghid",
  "min-stay-strategie-adr-ocupare": "/blog/preturi-dinamice-2026-ghid",
  "ghid-maximizare-venituri-inchirieri": "/blog/preturi-dinamice-2026-ghid",
  "mix-canale-reduce-dependenta-booking": "/blog/rezervari-directe-ghid-complet",
  "perceptie-premium-fara-costuri-inutile": "/blog/brand-premium-regim-hotelier",
  "housekeeping-qc-checklist-hotel": "/blog/staging-cleaning-standarde-hoteliere",
  "top-20-atractii-turistice-timisoara-ghid-complet-2026":
    "/blog/ghid-turistic-timisoara-atractii-activitati",
  "chirii-termen-lung-apartamente-nzeb-timisoara":
    "/blog/apartamente-nzeb-timisoara-lista-completa-2026-impact-roi",
  "5-greseli-comune-administrare": "/blog/faq-obiectii-proprietari-raspunsuri",
};

export const resolveConsolidatedArticle = (slug?: string): string | null =>
  (slug && CONSOLIDATED_ARTICLE_REDIRECTS[slug]) || null;
