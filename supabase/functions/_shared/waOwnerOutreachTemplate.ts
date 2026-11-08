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
  "Pentru că avem investitori activi care caută în această zonă, am pregătit deja o pagină de prezentare optimizată pentru proprietatea dumneavoastră:\n" +
  "🔗 {{2}}\n\n" +
  "Promovarea către comunitatea noastră este 100% gratuită (0 lei costuri, 0% comision proprietar, fără exclusivitate).";

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
  params.set("tip", /vanzare|sale/i.test(String(p?.category ?? "")) ? "vanzare" : "inchiriere");
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
