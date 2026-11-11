// Reguli de trimitere pentru primul mesaj WhatsApp către proprietari (outreach-dispatch):
// interval orar 09:00–19:30 (ora României) și cel mult un mesaj la 30 de zile pe număr.

export const OUTREACH_COOLDOWN_DAYS = 30;
export const OUTREACH_COOLDOWN_KIND = "owner_outreach_30d";
const TZ = "Europe/Bucharest";
const OPEN_MIN = 9 * 60;          // 09:00
const CLOSE_MIN = 19 * 60 + 30;   // 19:30 (inclusiv)
const QUEUE_H = 9, QUEUE_M = 5;   // mesajele amânate pleacă la 09:05

function localParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

/** Diferența (minute) dintre ora României și UTC la momentul dat (120 iarna, 180 vara). */
function offsetMinutes(d: Date): number {
  const p = localParts(d);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

/** Momentul UTC pentru o oră locală din România (ține cont de ora de vară). */
function bucharestLocalToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/**
 * `open` = se poate trimite acum (09:00–19:30 ora României).
 * `nextSendAt` = următorul 09:05: azi dacă e înainte de 09:00, altfel mâine.
 */
export function outreachWindow(now: Date = new Date()): { open: boolean; nextSendAt: Date } {
  const p = localParts(now);
  const minutes = p.h * 60 + p.min;
  const open = minutes >= OPEN_MIN && minutes <= CLOSE_MIN;
  const base = new Date(Date.UTC(p.y, p.m - 1, p.d) + (minutes < OPEN_MIN ? 0 : 86400000));
  const nextSendAt = bucharestLocalToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), QUEUE_H, QUEUE_M);
  return { open, nextSendAt };
}
