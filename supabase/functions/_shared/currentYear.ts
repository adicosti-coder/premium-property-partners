// Anul curent din sistem (ora României) și înlocuirea anilor vechi în titluri/descrieri generate.
export const currentYear = (): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric" }).format(new Date()));

// Fapte istorice care NU se actualizează (ex: Capitala Culturală Europeană 2023).
const HISTORICAL = /(capital[aă]\s+cultural[aă]\s+european[aă]|fondat[aă]?\s+(în|in)|construit[aă]?\s+(în|in)|din\s+anul)\s*[—–-]?\s*$/i;

/** Înlocuiește anii 2015..(anul curent − 1) cu anul curent, păstrând referințele istorice. */
export function refreshYears(text: string, year = currentYear()): string {
  if (!text) return text;
  return text.replace(/\b(20[1-9]\d)\b/g, (m, y: string, offset: number, full: string) => {
    const n = Number(y);
    if (n < 2015 || n >= year) return m;
    if (HISTORICAL.test(full.slice(Math.max(0, offset - 40), offset))) return m;
    return String(year);
  });
}
