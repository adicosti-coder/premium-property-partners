/**
 * ENTITY SEO / GEO — single source of truth for the answer to
 * "Ce este RealTrust?" / "What is RealTrust?".
 *
 * Google and AI answer engines must be able to resolve the RealTrust entity
 * without ambiguity. The SAME factual definition therefore has to appear,
 * word for word, on every authority surface:
 *   - homepage, /despre-noi, /contact, /pentru-proprietari (visible text)
 *   - Organization / RealEstateAgent JSON-LD `description`
 *   - /llms.txt and /llms-full.txt (AI plain-text files)
 *   - the prerendered static HTML (crawlers without JS)
 *
 * Rules when editing:
 *   - Facts only; no invented statistics, awards or certifications.
 *   - Keep the first sentence a complete, standalone definition
 *     (company type + city + services) — that is the sentence an AI quotes.
 *   - RealTrust = the company (real estate services, investment advisory,
 *     property management). ApArt Hotel = the operational accommodation
 *     brand. Never merge the two entities.
 */

/** One-sentence definition — used for schema `description` and meta copy. */
export const ENTITY_SHORT = {
  ro: "RealTrust este o companie imobiliară din Timișoara specializată în investiții imobiliare, vânzare, închiriere și administrare de apartamente și case în regim hotelier.",
  en: "RealTrust is a real estate company in Timișoara, Romania, specialised in property investment, sales, rentals and short-stay (hotel-regime) management of apartments and houses.",
} as const;

/** Full 3–5 sentence answer: cine, ce, unde, pentru cine, cum. */
export const ENTITY_ANSWER = {
  ro: "RealTrust este o companie imobiliară din Timișoara specializată în investiții imobiliare, vânzare, închiriere și administrare de apartamente și case în regim hotelier. Este operată de entitatea juridică SC Imo Business Centrum SRL (CUI RO14380627) și activează în Timișoara și județul Timiș, inclusiv în ansambluri precum ISHO, RING, Paltim, Fructus Plaza și City of Mara. Se adresează proprietarilor, investitorilor și oaspeților. Serviciile de cazare pe termen scurt sunt gestionate sub brandul ApArt Hotel by RealTrust și includ promovare, curățenie, mentenanță și optimizare tarifară. Colaborarea se face pe bază de contracte clare, cu transparență și raportare financiară detaliată. Contact: +40 799 069 256, info@realtrust.ro.",
  en: "RealTrust is a real estate company in Timișoara, Romania, specialised in property investment, sales, rentals and short-stay (hotel-regime) management of apartments and houses. It is operated by the legal entity SC Imo Business Centrum SRL (VAT RO14380627) and works in Timișoara and Timiș county, including developments such as ISHO, RING, Paltim, Fructus Plaza and City of Mara. It serves owners, investors and guests. Short-stay accommodation is operated under the ApArt Hotel by RealTrust brand and includes marketing, cleaning, maintenance and rate optimisation. Work is done under clear written contracts, with transparency and detailed financial reporting. Contact: +40 799 069 256, info@realtrust.ro.",
} as const;

/** Headings for the entity block. */
export const ENTITY_HEADING = {
  ro: "Ce este RealTrust?",
  en: "What is RealTrust?",
} as const;

/**
 * Schema.org Question/Answer node for the entity definition. Emitted once per
 * authority page so answer engines can extract the definition directly.
 */
export const buildEntityQuestionSchema = (pageUrl: string, lang: "ro" | "en" = "ro") => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${pageUrl}#what-is-realtrust`,
  mainEntity: [
    {
      "@type": "Question",
      name: ENTITY_HEADING[lang],
      acceptedAnswer: {
        "@type": "Answer",
        text: ENTITY_ANSWER[lang],
      },
    },
  ],
});
