// Primul mesaj WhatsApp pentru anunțurile de ÎNCHIRIERE (aprobat de Adrian Costi).
// Dacă lipsește zona sau numărul de camere, folosește „apartamentul dumneavoastră din Timișoara".
// Păstrați sincronizat cu src/lib/ownerOutreachTemplates.ts (rentalFirstMessage).
export function rentalFirstMessage(rooms?: number | string | null, zone?: string | null): string {
  const r = rooms != null && String(rooms).trim() !== "" && Number(rooms) > 0 ? String(Number(rooms)) : "";
  const z = (zone ?? "").trim();
  const ref = r && z ? `apartamentul cu ${r} camere din ${z}` : "apartamentul dumneavoastră din Timișoara";
  return [
    `Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am văzut anunțul dumneavoastră pentru ${ref}, propus spre închiriere.`,
    "",
    "Preluăm apartamente în administrare completă în Timișoara (regim hotelier sau hibrid). Scopul este un venit net estimat mai bun decât chiria clasică, fără grija chiriașilor rău-platnici.",
    "",
    "Ne ocupăm de:",
    "• promovare pe Booking, Airbnb și realtrust.ro",
    "• curățenie profesională, lenjerii și verificarea oaspeților",
    "• mentenanță curentă",
    "",
    "Vă pot trimite gratuit o simulare de randament net pentru zona dumneavoastră. Pot trece și 15 minute pe la apartament să vă prezint opțiunile.",
    "",
    "Când v-ar fi mai comod să discutăm: azi spre seară sau mâine? Dacă nu vă interesează, răspundeți NU și nu vă mai deranjăm.",
  ].join("\n");
}
