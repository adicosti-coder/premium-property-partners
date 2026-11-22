// Approved company facts injected into every Andrei / ApArt Hotel assistant prompt.
// Single source for the chat assistants so rating, occupancy and fees never drift
// from the official grid (guest score comes from guestReputation.ts).
import { GUEST_REPUTATION, guestReputationSentenceRo } from "./guestReputation.ts";

export const ASSISTANT_LEGAL_ENTITY = "SC Imo Business Centrum SRL";
export const ASSISTANT_HANDOFF_PHONE = "0799 069 256";
export const ASSISTANT_OCCUPANCY = { min: 65, max: 75, default: 70 } as const;
export const ASSISTANT_MANAGEMENT_FEE = { min: 15, max: 20 } as const;
export const ASSISTANT_NET_YIELD = { min: "6,5", max: "9,4" } as const;
export const ASSISTANT_REAL_ESTATE_SINCE = 2000;
export const ASSISTANT_HOTEL_MANAGEMENT_SINCE = 2016;

const scoreEn = () => `${GUEST_REPUTATION.ratingValue}/${GUEST_REPUTATION.bestRating} on Booking.com from ${GUEST_REPUTATION.reviewCount}+ verified reviews`;

/** Fact lines (no leading bullet) for the assistant's company section. */
export function assistantCompanyFactLines(language: string): string[] {
  const o = ASSISTANT_OCCUPANCY;
  const f = ASSISTANT_MANAGEMENT_FEE;
  if (language === "en") {
    return [
      `Legal entity: ${ASSISTANT_LEGAL_ENTITY} — brands RealTrust (real estate) and ApArt Hotel (short-term stays), Timișoara, Timiș county`,
      `Guest score: ${scoreEn()}`,
      `Assumed annual occupancy: ${o.min}–${o.max}% (calculators use ${o.default}%); never promise higher occupancy`,
      `Management fee (hotel regime): ${f.min}–${f.max}% of net income (gross minus channel fees and utilities); cleaning is billed separately`,
      `Estimated net yield: ${ASSISTANT_NET_YIELD.min.replace(",", ".")}–${ASSISTANT_NET_YIELD.max.replace(",", ".")}% per year`,
      `Experience: real estate since ${ASSISTANT_REAL_ESTATE_SINCE}, hotel-regime management since ${ASSISTANT_HOTEL_MANAGEMENT_SINCE}`,
      `Human handoff: phone/WhatsApp ${ASSISTANT_HANDOFF_PHONE} (non-stop) — offer it for negotiations, contracts, complaints or anything you cannot answer`,
    ];
  }
  return [
    `Entitate juridică: ${ASSISTANT_LEGAL_ENTITY} — brandurile RealTrust (imobiliare) și ApArt Hotel (cazare regim hotelier), Timișoara, jud. Timiș`,
    `Scor oaspeți: ${guestReputationSentenceRo()}`,
    `Ocupare anuală asumată: ${o.min}–${o.max}% (calculatoarele folosesc ${o.default}%); nu promite niciodată o ocupare mai mare`,
    `Comision administrare regim hotelier: ${f.min}–${f.max}% din venitul net (brut minus comisioanele canalelor și utilitățile); menajul se facturează separat`,
    `Randament net estimat: ${ASSISTANT_NET_YIELD.min}–${ASSISTANT_NET_YIELD.max}% pe an`,
    `Experiență: în imobiliare din ${ASSISTANT_REAL_ESTATE_SINCE}, în regim hotelier din ${ASSISTANT_HOTEL_MANAGEMENT_SINCE}`,
    `Predare către echipă: telefon/WhatsApp ${ASSISTANT_HANDOFF_PHONE} (non-stop) — oferă-l la negocieri, contracte, reclamații sau orice nu poți răspunde`,
  ];
}

export function assistantCompanyFactsBlock(language: string, bullet = "•"): string {
  return assistantCompanyFactLines(language).map((l) => `${bullet} ${l}`).join("\n");
}
