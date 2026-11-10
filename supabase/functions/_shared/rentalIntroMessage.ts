// Primul mesaj WhatsApp pentru anunțurile de ÎNCHIRIERE (formulare exactă aprobată de Adrian Costi, 10.11.2026).
// {numar_camere} și {zona} vin din anunț; fără camere → „apartamentul dumneavoastră din zona X”, fără zonă → „din Timișoara”.
// Păstrați sincronizat cu src/lib/ownerOutreachTemplates.ts (rentalFirstMessage / apartmentRef).
function apartmentRef(rooms?: number | string | null, zone?: string | null): string {
  const n = Number(String(rooms ?? "").trim());
  const r = Number.isFinite(n) && n > 0 && Number.isInteger(n) ? (n === 1 ? "o cameră" : `${n} camere`) : "";
  const z = String(zone ?? "").trim();
  const where = z ? `din zona ${z}` : "din Timișoara";
  return r ? `apartamentul de ${r} ${where}` : `apartamentul dumneavoastră ${where}`;
}

export function rentalFirstMessage(rooms?: number | string | null, zone?: string | null): string {
  return `Bună ziua! Sunt Andrei, RealTrust & ApArt Hotel Timișoara. Vă contactez în legătură cu ${apartmentRef(rooms, zone)}. Oferim servicii complete de administrare în regim hotelier (promovare Booking/Airbnb, curățenie, mentenanță), cu un venit net estimat cu 30-40% mai mare decât chiria clasică. Vă pot trimite gratuit o simulare de randament net pentru zona dumneavoastră?`;
}
