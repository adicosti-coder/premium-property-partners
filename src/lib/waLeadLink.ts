import { toOutreachPhone } from "../../supabase/functions/_shared/waPhone";

/**
 * Link WhatsApp pentru un telefon salvat într-o cerere (tabelul `leads`).
 *
 * - Mobil românesc (07… / +407… / 7…) → cifre internaționale fără „+”,
 *   prin helper-ul canonic `toOutreachPhone` (aceeași formă trimisă către Make).
 * - Alte numere internaționale reale → cifrele rămase, fără „+” / „00”.
 * - Sentinele („-”, „PRECALC_NO_PHONE”, „0”, „n/a”, „pending”) sau numere
 *   invalide (fix, scurte) → null, deci se afișează „Fără telefon”.
 */

const SENTINELS = new Set(["-", "PRECALC_NO_PHONE", "0", "n/a", "N/A", "pending", ""]);

export function waLeadLink(raw: string | null | undefined): string | null {
  const ro = toOutreachPhone(raw);
  if (ro) return `https://wa.me/${ro}`;

  const text = String(raw ?? "").trim();
  if (!text || SENTINELS.has(text)) return null;

  let digits = text.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Un număr național fără prefix de țară (021…, 03…) nu e valid pe wa.me.
  if (digits.startsWith("0")) return null;
  if (digits.length < 8 || digits.length > 15) return null;

  return `https://wa.me/${digits}`;
}
