// Reguli pentru programarea evaluărilor și predarea conversației către Adrian.
// Evaluările au loc la apartament, luni–sâmbătă, cu începere între 09:00 și 19:00 (ora României),
// în următoarele 30 de zile. Programarea rămâne „pending” până o confirmă Adrian.

export const ADRIAN_WHATSAPP = "+40799069256";
export const EVAL_START_HOUR = 9;
export const EVAL_LAST_START_HOUR = 19;
export const EVAL_MAX_DAYS_AHEAD = 30;

export type EvalSlot = { date: string; time: string };

/** Ora României (UTC+2 iarna / UTC+3 vara) pentru o dată locală. */
function bucharestOffsetMinutes(utc: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest", timeZoneName: "shortOffset",
  }).formatToParts(utc);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+2";
  const m = tz.match(/GMT([+-]\d+)/);
  return (m ? Number(m[1]) : 2) * 60;
}

/** Convertește data/ora locală (România) într-un moment UTC. */
export function bucharestToUtc(date: string, time: string): Date | null {
  const dm = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = time?.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (guess.getUTCDate() !== d) return null;
  return new Date(guess.getTime() - bucharestOffsetMinutes(guess) * 60_000);
}

export function validateEvaluationSlot(
  slot: EvalSlot | null | undefined,
  now: Date = new Date(),
): { ok: true; startsAt: Date } | { ok: false; reason: string } {
  if (!slot) return { ok: false, reason: "missing" };
  const startsAt = bucharestToUtc(slot.date, slot.time);
  if (!startsAt) return { ok: false, reason: "invalid_format" };
  const [h, mi] = slot.time.split(":").map(Number);
  // Ziua săptămânii în ora României (0 = duminică)
  const weekday = new Date(Date.UTC(...(slot.date.split("-").map(Number) as [number, number, number]).map((v, i) => i === 1 ? v - 1 : v) as [number, number, number])).getUTCDay();
  if (weekday === 0) return { ok: false, reason: "sunday" };
  if (h < EVAL_START_HOUR || h > EVAL_LAST_START_HOUR || (h === EVAL_LAST_START_HOUR && mi > 0)) {
    return { ok: false, reason: "outside_hours" };
  }
  if (startsAt.getTime() <= now.getTime() + 60 * 60_000) return { ok: false, reason: "too_soon" };
  if (startsAt.getTime() > now.getTime() + EVAL_MAX_DAYS_AHEAD * 86_400_000) return { ok: false, reason: "too_far" };
  return { ok: true, startsAt };
}

export function buildBookingAlert(p: { phone: string; name?: string | null; slot: EvalSlot; listing?: string }): string {
  return `📅 *Evaluare cerută pe WhatsApp*\n${p.name ? `${p.name} · ` : ""}${p.phone}\n${p.slot.date} ora ${p.slot.time}${p.listing ? `\n${p.listing}` : ""}\n\nConfirmă intervalul cu proprietarul.`;
}

export function buildHandoffAlert(p: { phone: string; name?: string | null; reason: string }): string {
  return `🙋 *Asistentul WhatsApp îți predă conversația*\n${p.name ? `${p.name} · ` : ""}${p.phone}\nMotiv: ${p.reason || "nu a putut răspunde"}\n\nRăspunde direct clientului: https://wa.me/${p.phone.replace(/\D/g, "")}`;
}
