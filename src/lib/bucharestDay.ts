/**
 * Limitele unei zile în ora României. Folosit ca să aducem exact anunțurile din
 * ziua afișată într-un raport, indiferent de sezon (iarnă/vară) sau de fusul
 * calculatorului.
 */
const offsetMinutes = (date: Date) => {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
  return (local.getTime() - utc.getTime()) / 60000;
};

const startOfBucharestDay = (day: string) => {
  const d = String(day).slice(0, 10);
  const off = offsetMinutes(new Date(`${d}T12:00:00Z`)) * 60000;
  return Date.parse(`${d}T00:00:00Z`) - off;
};

/** Intervalul [00:00, 00:00) al zilei date (YYYY-MM-DD) după ora României. */
export const bucharestDayRange = (day: string) => {
  const from = startOfBucharestDay(day);
  const next = new Date(from + 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });
  const to = startOfBucharestDay(next);
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
};
