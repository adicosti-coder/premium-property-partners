/**
 * Single source for company facts shown across the site, prerendered HTML
 * and Schema.org data. Change values here only — never hardcode years of
 * experience or contact hours in pages.
 *
 * No path aliases: the prerender plugin imports this file directly.
 */

/** Year RealTrust started real-estate activity in Timișoara. */
export const REAL_ESTATE_SINCE = 2000;
/** Year RealTrust started short-term (hotel-regime) property management. */
export const HOTEL_MANAGEMENT_SINCE = 2016;
/** Official launch year of the ApArt Hotel accommodation brand. */
export const APART_HOTEL_BRAND_SINCE = 2017;
/** Founding year of the legal entity SC Imo Business Centrum SRL (Schema.org foundingDate). */
export const LEGAL_ENTITY_FOUNDED = 2001;

type Lang = "ro" | "en";
const pick = (lang: string | undefined, ro: string, en: string) => (lang === "en" ? en : ro);

/** „În imobiliare din 2000” / “In real estate since 2000”. */
export const realEstateSinceLabel = (lang?: string) =>
  pick(lang, `În imobiliare din ${REAL_ESTATE_SINCE}`, `In real estate since ${REAL_ESTATE_SINCE}`);
/** „Regim hotelier din 2016” / “Short-term rentals since 2016”. */
export const hotelSinceLabel = (lang?: string) =>
  pick(lang, `Regim hotelier din ${HOTEL_MANAGEMENT_SINCE}`, `Short-term rentals since ${HOTEL_MANAGEMENT_SINCE}`);

/**
 * Contact hours (phone, WhatsApp, e-mail). Separate from property viewing
 * slots and from the voice agent's calling hours.
 */
export const CONTACT_HOURS = {
  open24h: true,
  short: { ro: "Non-stop", en: "24/7" } as Record<Lang, string>,
  long: { ro: "Program non-stop (24/7)", en: "Open 24/7" } as Record<Lang, string>,
  /** Schema.org `openingHours` text form. */
  schemaText: "Mo-Su 00:00-23:59",
} as const;

export const contactHoursLabel = (lang?: string, variant: "short" | "long" = "long") =>
  pick(lang, CONTACT_HOURS[variant].ro, CONTACT_HOURS[variant].en);

/** Schema.org OpeningHoursSpecification for the contact hours. */
export const CONTACT_OPENING_HOURS_SPEC = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "00:00",
  closes: "23:59",
} as const;

/** True when the contact line is staffed at the given moment. */
export const isContactOpen = (_at: Date = new Date()) => CONTACT_HOURS.open24h;

/**
 * Guest reputation shown on the homepage („9,7/10 Booking.com · 500+ recenzii
 * verificate”). Schema.org AggregateRating for the ApArt Hotel brand uses
 * exactly these values on the same 1–10 scale as the apartment pages, so the
 * markup always matches the visible badge.
 */
export const GUEST_REPUTATION = {
  ratingValue: 9.7,
  bestRating: 10,
  reviewCount: 500,
} as const;

/** „9,7” (ro) / “9.7” (en) — the guest score in the page language. */
export const guestRatingLabel = (lang?: string) =>
  pick(lang, String(GUEST_REPUTATION.ratingValue).replace(".", ","), String(GUEST_REPUTATION.ratingValue));
/** „500+” — the review count as shown next to the score. */
export const guestReviewCountLabel = () => `${GUEST_REPUTATION.reviewCount}+`;
/** Guest score as written in page copy: „9,7” (Romanian) and “9.7” (English/dot form). */
export const GUEST_SCORE_RO = guestRatingLabel("ro");
export const GUEST_SCORE_EN = guestRatingLabel("en");
