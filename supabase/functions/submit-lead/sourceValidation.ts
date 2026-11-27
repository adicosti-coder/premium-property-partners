const VALID_SOURCES = [
  "calculator", "quick_form", "lead_capture_form",
  "rental-calculator", "advanced-rental-calculator", "city_of_mara_landing",
  "pagina_contact", "apel_2_minute", "evaluare_gratuita", "analiza_anunt",
  "whatsapp_viewing", "calculator_unificat_investitii", "calculator_unificat_oaspeti",
  "calculator_unificat_rapid_investitii", "calculator_unificat_manual",
  "calculator_unificat_link", "calculator_unificat_foto",
  "calculator_roi_widget", "pre_calc_owner", "pentru_proprietari_precalc",
  "homepage_owners_teaser",
];

/** Keep known attribution intact; never persist an arbitrary caller-provided source. */
export function normalizeLeadSource(value: unknown): string {
  return typeof value === "string" && VALID_SOURCES.includes(value) ? value : "calculator";
}
