// Primul mesaj de outreach către proprietari (trimis de Make cu acest șablon Meta).
// Conține 3 butoane de răspuns rapid; răspunsurile sunt procesate în wa-andrei-webhook.

export const WA_OWNER_OUTREACH_TEMPLATE = "outreach_proprietar_butoane_v1";
export const WA_OWNER_OUTREACH_LANGUAGE = "ro";

/** Textele butoanelor (Meta permite maximum 25 de caractere pe buton). */
export const OWNER_OUTREACH_BUTTONS = {
  consent: "DA, activează gratuit",
  hotelCalc: "Calcul Regim Hotelier",
  decline: "Nu doresc",
} as const;

export const WA_OWNER_OUTREACH_BODY =
  "Bună ziua! Sunt Andrei de la RealTrust Timișoara. Am văzut apartamentul dumneavoastră din {{1}}.\n\n" +
  "Pentru că avem clienți calificați și investitori care caută exact în această zonă, am dori acordul dumneavoastră să preluăm anunțul exact așa cum este publicat, pentru a-l prezenta direct cumpărătorilor și chiriașilor noștri interesați.\n\n" +
  "Puteți vedea analiza de prezentare aici: {{2}}\n\n" +
  "Promovarea este 100% gratuită (0 lei costuri, 0% comision proprietar, fără exclusivitate). Dacă doriți să corectăm sau să adăugăm ceva la detalii sau preț, ne puteți scrie direct aici.";

/** Subsol: cererea de acord rămâne explicită și retragerea e anunțată de la început. */
export const WA_OWNER_OUTREACH_FOOTER = "Răspundeți DA pentru publicare sau NU. Retragere: RETRAG";

export function ownerOutreachZone(p?: { zone?: string | null; location?: string | null } | null): string {
  const z = String(p?.zone || p?.location || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return (z || "Timișoara").slice(0, 60);
}

/** Linkul spre analiza gratuită existentă, personalizat pe zonă și tip, fără a publica nimic. */
export function ownerOutreachPreviewUrl(p?: {
  zone?: string | null; location?: string | null; category?: string | null; source_url?: string | null;
} | null): string {
  const params = new URLSearchParams();
  params.set("zona", ownerOutreachZone(p));
  const tip = /vanzare|sale/i.test(String(p?.category ?? "")) ? "vanzare" : "inchiriere";
  params.set("tip", tip);
  // `listing_type=inchiriere` afișează pe /analiza-anunt eticheta pentru închiriere clasică & regim hotelier.
  params.set("listing_type", tip);
  const src = String(p?.source_url ?? "").trim();
  if (/^https:\/\//i.test(src)) params.set("url", src.slice(0, 500));
  return `https://realtrust.ro/analiza-anunt?${params.toString()}`;
}

export const WA_OWNER_OUTREACH_COMPONENTS = [
  {
    type: "BODY",
    text: WA_OWNER_OUTREACH_BODY,
    example: { body_text: [["Iosefin", "https://realtrust.ro/analiza-anunt?zona=Iosefin&tip=vanzare"]] },
  },
  { type: "FOOTER", text: WA_OWNER_OUTREACH_FOOTER },
  {
    type: "BUTTONS",
    buttons: [
      { type: "QUICK_REPLY", text: OWNER_OUTREACH_BUTTONS.consent },
      { type: "QUICK_REPLY", text: OWNER_OUTREACH_BUTTONS.hotelCalc },
      { type: "QUICK_REPLY", text: OWNER_OUTREACH_BUTTONS.decline },
    ],
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** true pentru butonul „Calcul Regim Hotelier” (și varianta scrisă „Vreau calcul regim hotelier”). */
export function isHotelCalcRequest(raw: string): boolean {
  return /^(?:vreau\s+)?(?:un\s+)?calcul(?:ul)?\s+(?:pentru\s+)?(?:in\s+)?regim(?:ul)?\s+hotelier[\s!.]*$/.test(norm(raw));
}

/** Întrebare sau cerere în limbaj natural de la proprietar care merită preluată de un om. */
export function looksLikeOwnerQuestion(raw: string): boolean {
  const t = norm(raw);
  if (t.length < 6) return false;
  if (t.includes("?")) return true;
  return /^(?:cat|cate|cand|cum|unde|care|ce|de ce|cine|se poate|puteti|aveti|exista|ma intereseaza|as vrea sa stiu|vreau sa stiu)\b/.test(t);
}

/** Răspunsurile afirmative acceptate pentru primul mesaj cu butoane. */
const OUTREACH_AFFIRMATIVE_RE =
  /^(?:da+|da,?\s+(?:puteti|se\s+poate)(?:\s+(?:sa\s+)?(?:il\s+)?publica(?:ti)?)?|pute?ti(?:\s+sa)?\s+(?:il\s+)?publica(?:ti)?|(?:e|este)\s+in\s+regula|in\s+regula)(?:[\s!.,]+(?:multumesc|mersi|va\s+multumesc))?[\s!.,]*$/;

/** „button” = butonul „DA, activează gratuit”; „text” = DA / Puteți publica / E în regulă scris. */
export function ownerOutreachConsentReply(raw: string): "button" | "text" | null {
  const t = norm(raw);
  if (!t) return null;
  if (t === norm(OWNER_OUTREACH_BUTTONS.consent)) return "button";
  return OUTREACH_AFFIRMATIVE_RE.test(t) ? "text" : null;
}

export type OwnerOutreachConsentCheck =
  | { status: "valid"; trigger: "outreach_button" | "outreach_text" }
  | { status: "missing_template" }
  | { status: "not_applicable" };

/**
 * Acordul din fluxul cu butoane este valid DOAR dacă Make a confirmat trimiterea
 * șablonului `outreach_proprietar_butoane_v1` (salvat în `request_template`) și
 * proprietarul a apăsat „DA, activează gratuit” sau a scris DA / Puteți publica / E în regulă.
 * Butonul fără confirmarea șablonului nu este acord; textul fără șablon rămâne pe regulile vechi.
 */
export function ownerOutreachConsentCheck(raw: string, requestTemplate?: string | null): OwnerOutreachConsentCheck {
  const reply = ownerOutreachConsentReply(raw);
  if (!reply) return { status: "not_applicable" };
  if (requestTemplate === WA_OWNER_OUTREACH_TEMPLATE) {
    return { status: "valid", trigger: reply === "button" ? "outreach_button" : "outreach_text" };
  }
  return reply === "button" ? { status: "missing_template" } : { status: "not_applicable" };
}

/** Răspuns către proprietar când butonul DA vine fără confirmarea șablonului: preia un om. */
export const OWNER_CONSENT_UNVERIFIED_ACK =
  "Mulțumim! Un coleg RealTrust vă confirmă activarea în scurt timp, aici pe WhatsApp.";

// ─────────────────────────────────────────────────────────────────────────────
// Răspunsurile proprietarului după mesajul cu butoane (outreach_proprietar_butoane_v1).
// ─────────────────────────────────────────────────────────────────────────────

/** Răspuns fix la întrebările despre cost / comision (doar pentru promovarea gratuită). */
export const OWNER_OUTREACH_FEE_REPLY =
  "Comisionul pentru dumneavoastră este fix 0 lei. Promovarea și prezentarea către clienții noștri este complet gratuită pentru proprietar.";

/** Răspuns la obiecțiile despre chiriași / siguranță: propunem ApArt Hotel. */
export const OWNER_OUTREACH_SAFETY_REPLY =
  "Înțelegem perfect. Prin ApArt Hotel oferim administrare completă, menaj profesionist și protecția proprietății. Vă putem trimite o simulare de Regim Hotelier?";

/** Confirmare când proprietarul trimite corecturi și nu există alt răspuns pregătit. */
export const OWNER_CUSTOM_NOTES_ACK =
  "Mulțumim! Am notat ce ne-ați transmis, iar un coleg RealTrust verifică detaliile și vă confirmă aici.";

/** Confirmare când anunțul nu mai este valabil (vândut / închiriat). */
export const OWNER_LISTING_CLOSED_ACK =
  "Mulțumim că ne-ați anunțat! Am notat că anunțul nu mai este valabil și nu vă mai deranjăm. Mult succes!";

/** Prefixul alertelor către administrator (bold pe WhatsApp cu *…*). */
export const OWNER_REQUEST_ALERT_PREFIX = "[MODIFICARE/SOLICITARE PROPRIETAR DETECTATĂ]: ";

export function ownerRequestAlertLine(message: string): string {
  return `*${OWNER_REQUEST_ALERT_PREFIX.trim()}* ${message}`;
}

export type OwnerOutreachOptOut = "retrag" | "nu" | "sold" | "unavailable";
export type OwnerOutreachReplySignals = {
  optOut: OwnerOutreachOptOut | null;
  fee: boolean;
  safety: boolean;
  customNotes: boolean;
};

const FEE_RE = /\b(?:cost\w*|comision\w*|pret(?:ul)?\s+servici\w*|pretul\s+serviciilor)\b/;
// Întrebările despre administrare (15–20% din net) nu primesc răspunsul „0 lei”.
const MANAGEMENT_RE = /administr|regim\w*\s+hotelier|\bhotelier|apart\s*hotel/;
const SAFETY_RE = /\b(?:student\w*|stricaci\w*|garanti\w*|sigurant\w*)\b/;
const CUSTOM_RE = /\b(?:pret\w*|parcar\w*|negociabil\w*|liber\w*|poz[ae]\w*)\b/;
const SOLD_RE = /\bs-?a\s+(?:vandut|inchiriat)\b|\b(?:e|este|a\s+fost)\s+(?:deja\s+)?(?:vandut|inchiriat)\w*\b|\bam\s+(?:vandut|inchiriat)\b/;
const UNAVAILABLE_RE = /\bnu\s+mai\s+(?:e|este)\s+(?:valabil|disponibil)\w*/;

/**
 * Semnalele din răspunsul proprietarului: retragere / refuz / vândut, întrebare de cost,
 * obiecție de siguranță și corecturi (cifre, preț, parcare, negociabil, liber, poze, calcul hotelier).
 */
export function ownerOutreachReplySignals(raw: string): OwnerOutreachReplySignals {
  const t = norm(raw);
  const none: OwnerOutreachReplySignals = { optOut: null, fee: false, safety: false, customNotes: false };
  if (!t) return none;
  let optOut: OwnerOutreachOptOut | null = null;
  if (/^retrag\b/.test(t)) optOut = "retrag";
  else if (/^nu+(?:\s+doresc)?[\s!.,]*$/.test(t)) optOut = "nu";
  else if (SOLD_RE.test(t)) optOut = "sold";
  else if (UNAVAILABLE_RE.test(t)) optOut = "unavailable";
  if (optOut) return { ...none, optOut };
  const fee = FEE_RE.test(t) && !MANAGEMENT_RE.test(t);
  const safety = SAFETY_RE.test(t);
  const hasDigits = /\d/.test(t);
  // „Cât e prețul serviciilor?” este o întrebare de cost, nu o corectură de preț.
  const customWords = CUSTOM_RE.test(fee ? t.replace(FEE_RE, " ") : t);
  const customNotes = hasDigits || customWords || isHotelCalcRequest(raw);
  return { optOut: null, fee, safety, customNotes };
}

/** Textul răspunsului automat pentru cost și/sau obiecții (null dacă nu e cazul). */
export function ownerOutreachObjectionReply(s: OwnerOutreachReplySignals): string | null {
  const parts = [s.fee ? OWNER_OUTREACH_FEE_REPLY : null, s.safety ? OWNER_OUTREACH_SAFETY_REPLY : null].filter(Boolean);
  return parts.length ? parts.join("\n\n") : null;
}
