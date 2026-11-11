/** SMS de rezervă pentru proprietarii fără WhatsApp (eroare Meta 131026). */

export const OWNER_SMS_CONTACT_PHONE = "0723154520";

const cleanZone = (z?: string | null) =>
  String(z ?? "").replace(/[^\p{L}\p{N} .,'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40) || "Timisoara";

/** Fără diacritice: SMS-ul rămâne în setul GSM (160 de caractere pe segment). */
const noDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Link scurt spre analiza de prezentare: realtrust.ro/aa/{v|i}/{zona}. */
export function ownerSmsShortLink(zone?: string | null, category?: string | null): string {
  const tip = /vanzare|sale/i.test(String(category ?? "")) ? "v" : "i";
  return `realtrust.ro/aa/${tip}/${encodeURIComponent(noDiacritics(cleanZone(zone)))}`;
}

export function ownerSmsText(zone?: string | null, category?: string | null): string {
  const z = noDiacritics(cleanZone(zone));
  return `Buna ziua! Am vazut anuntul dumneavoastra din ${z}. Vedeti gratuit analiza de prezentare RealTrust aici: ${ownerSmsShortLink(zone, category)} . Detalii la ${OWNER_SMS_CONTACT_PHONE}.`;
}

/** Link `sms:` care deschide aplicația de mesaje cu textul completat (iOS și Android). */
export function ownerSmsHref(phoneE164: string, text: string): string {
  return `sms:${phoneE164}?&body=${encodeURIComponent(text)}`;
}

/** /aa/:tip/:zona → /analiza-anunt cu zona, tipul și eticheta de închiriere. */
export function shortAnalysisTarget(tip?: string, zona?: string): string {
  const t = tip === "v" ? "vanzare" : "inchiriere";
  const q = new URLSearchParams({ zona: cleanZone(zona), tip: t, listing_type: t });
  return `/analiza-anunt?${q.toString()}`;
}
