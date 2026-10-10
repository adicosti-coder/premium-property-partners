// Deduce cartierul din Timișoara din titlu/descriere când scraperul sau AI-ul nu îl dau.
// Returnează null dacă nu e sigur — mesajul de inspecție cere atunci confirmarea.
const ZONES: { name: string; keys: string[] }[] = [
  { name: "Cetate", keys: ["cetate", "centru", "piata unirii", "piata victoriei", "ultracentral"] },
  { name: "Iosefin", keys: ["iosefin", "piata badea cartan", "bulevardul 16 decembrie"] },
  { name: "Fabric", keys: ["fabric", "piata traian", "strada 3 august"] },
  { name: "Elisabetin", keys: ["elisabetin", "piata 700"] },
  { name: "Josefin", keys: ["josefin"] },
  { name: "Circumvalațiunii", keys: ["circumvalatiunii", "circumvalatiei"] },
  { name: "Complex Studențesc", keys: ["complex studentesc", "complexul studentesc", "studentesc"] },
  { name: "Martirilor", keys: ["martirilor", "girocului", "giroc"] },
  { name: "Soarelui", keys: ["soarelui"] },
  { name: "Lipovei", keys: ["lipovei", "calea lipovei"] },
  { name: "Aradului", keys: ["calea aradului", "aradului", "iulius town", "iulius mall"] },
  { name: "Torontalului", keys: ["torontalului", "calea torontalului"] },
  { name: "Dâmbovița", keys: ["dambovita", "steaua"] },
  { name: "Bucovina", keys: ["bucovina"] },
  { name: "Tipografilor", keys: ["tipografilor"] },
  { name: "Ronaț", keys: ["ronat"] },
  { name: "Freidorf", keys: ["freidorf"] },
  { name: "Mehala", keys: ["mehala"] },
  { name: "Fratelia", keys: ["fratelia"] },
  { name: "Plopi", keys: ["plopi"] },
  { name: "Ghiroda", keys: ["ghiroda"] },
  { name: "Dumbrăvița", keys: ["dumbravita"] },
  { name: "Mosnița", keys: ["mosnita"] },
  { name: "Giroc", keys: ["chisoda"] },
  { name: "Braytim", keys: ["braytim"] },
  { name: "Calea Șagului", keys: ["calea sagului", "sagului"] },
  { name: "Odobescu", keys: ["odobescu"] },
  { name: "Kuncz", keys: ["kuncz"] },
  { name: "Blașcovici", keys: ["blascovici"] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ");

export function detectZone(...texts: (string | null | undefined)[]): string | null {
  const hay = ` ${norm(texts.filter(Boolean).join(" "))} `;
  if (!hay.trim()) return null;
  let best: { name: string; pos: number } | null = null;
  for (const z of ZONES) {
    for (const k of z.keys) {
      const pos = hay.indexOf(` ${k} `);
      if (pos >= 0 && (!best || pos < best.pos)) best = { name: z.name, pos };
    }
  }
  return best?.name ?? null; // prima mențiune (de obicei în titlu) câștigă
}
