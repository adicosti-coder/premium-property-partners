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
