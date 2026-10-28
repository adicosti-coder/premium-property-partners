// Reguli comune pentru coada manuală „Trimite către Andrei”.
// Andrei sună doar L–S 09:00–20:00 (Europe/Bucharest), doar mobile 07….

export type QueueSchedule = "now" | "10:00";

function bucharestParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { day: get("weekday"), y: +get("year"), m: +get("month"), d: +get("day"), hour: +get("hour"), minute: +get("minute") };
}

/** Diferența (ms) dintre ora București și UTC la momentul dat. */
function bucharestOffsetMs(d: Date) {
  const p = bucharestParts(d);
  return Date.UTC(p.y, p.m - 1, p.d, p.hour % 24, p.minute) - Math.floor(d.getTime() / 60000) * 60000;
}

/** Momentul de la care Andrei poate suna: acum sau următoarea zi L–S la 10:00 București. */
export function computeCallAfter(schedule: QueueSchedule, now = new Date()): Date {
  if (schedule === "now") return now;
  for (let add = 0; add < 8; add++) {
    const probe = new Date(now.getTime() + add * 86400000);
    const p = bucharestParts(probe);
    if (p.day === "Sun") continue;
    const local = Date.UTC(p.y, p.m - 1, p.d, 10, 0);
    const at = new Date(local - bucharestOffsetMs(probe));
    if (at.getTime() > now.getTime()) return at;
  }
  return now;
}

export function isRoMobileE164(e164: string): boolean {
  return /^\+407\d{8}$/.test(e164);
}

export const toE164 = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "").replace(/^0040/, "40");
  const n = d.startsWith("40") ? d : d.startsWith("0") ? `40${d.slice(1)}` : d;
  return n ? `+${n}` : "";
};
