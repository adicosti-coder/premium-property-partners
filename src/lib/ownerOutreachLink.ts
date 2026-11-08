/** Zona și tipul din linkul trimis proprietarilor pe WhatsApp (/analiza-anunt?zona=…&tip=…). */
export function parseOwnerOutreachParams(search: string): { zone: string | null; type: "vanzare" | "inchiriere" | null } {
  const q = new URLSearchParams(search);
  const rawZone = (q.get("zona") ?? "").replace(/[^\p{L}\p{N} .,'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  const tip = q.get("tip");
  return {
    zone: rawZone.length >= 2 ? rawZone : null,
    type: tip === "vanzare" || tip === "inchiriere" ? tip : null,
  };
}
