/** Zona și tipul din linkul trimis proprietarilor pe WhatsApp (/analiza-anunt?zona=…&tip=…&listing_type=…). */
export function parseOwnerOutreachParams(search: string): {
  zone: string | null;
  type: "vanzare" | "inchiriere" | null;
  listingType: "vanzare" | "inchiriere" | null;
} {
  const q = new URLSearchParams(search);
  const rawZone = (q.get("zona") ?? "").replace(/[^\p{L}\p{N} .,'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  const tip = q.get("tip");
  const lt = q.get("listing_type");
  return {
    zone: rawZone.length >= 2 ? rawZone : null,
    type: tip === "vanzare" || tip === "inchiriere" ? tip : null,
    listingType: lt === "vanzare" || lt === "inchiriere" ? lt : null,
  };
}

/** Eticheta discretă din antetul /analiza-anunt pentru linkurile cu listing_type=inchiriere. */
export const RENTAL_ANALYSIS_BADGE = "Ideal pentru Închiriere Clasică & Regim Hotelier (ApArt Hotel)";
