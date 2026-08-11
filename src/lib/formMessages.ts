/**
 * Centralised form feedback copy (RO/EN).
 *
 * Rules applied to every message:
 *  - say exactly what happened,
 *  - say what happens next (or what the visitor should do),
 *  - never blame the user, never use technical wording.
 */

export type FormLang = "ro" | "en" | string;

const isEn = (language: FormLang) => language === "en";

export const formMessages = {
  /** Successful lead submission. */
  successTitle: (language: FormLang) =>
    isEn(language) ? "Request received" : "Am primit cererea ta",
  successBody: (language: FormLang) =>
    isEn(language)
      ? "A RealTrust consultant calls you within 24 business hours with an income estimate for your apartment."
      : "Un consultant RealTrust te sună în maximum 24 de ore lucrătoare cu estimarea de venit pentru apartamentul tău.",

  /** Duplicate submission (already in our pipeline). */
  duplicateBody: (language: FormLang) =>
    isEn(language)
      ? "We already have your request — no need to send it again. We'll get back to you shortly."
      : "Cererea ta este deja înregistrată — nu e nevoie să o trimiți din nou. Revenim în scurt timp.",

  /** Network / server failure: give an alternative channel instead of a dead end. */
  errorTitle: (language: FormLang) =>
    isEn(language) ? "We couldn't send the request" : "Nu am putut trimite cererea",
  errorBody: (language: FormLang) =>
    isEn(language)
      ? "Please tap send once more. If it still fails, write to us on WhatsApp at +40 771 371 371 — we reply just as fast."
      : "Apasă din nou pe trimite. Dacă tot nu merge, scrie-ne pe WhatsApp la 0771 371 371 — răspundem la fel de repede.",

  /** Client-side validation summary. */
  validationTitle: (language: FormLang) =>
    isEn(language) ? "One more detail needed" : "Mai lipsește un detaliu",
  validationBody: (language: FormLang) =>
    isEn(language)
      ? "Check the highlighted fields and send again — it takes a few seconds."
      : "Verifică câmpurile marcate și trimite din nou — durează câteva secunde.",

  /** Field-level messages. */
  requiredName: (language: FormLang) =>
    isEn(language) ? "Tell us your name so we know who to call" : "Spune-ne numele tău, ca să știm pe cine sunăm",
  requiredPhone: (language: FormLang) =>
    isEn(language) ? "We need a phone number to send you the estimate" : "Avem nevoie de un număr de telefon ca să îți trimitem estimarea",
  invalidPhone: (language: FormLang) =>
    isEn(language)
      ? "This number looks incomplete. Use the format +40 7XX XXX XXX."
      : "Numărul pare incomplet. Folosește formatul 07XX XXX XXX sau +40 7XX XXX XXX.",
  requiredType: (language: FormLang) =>
    isEn(language) ? "Pick the property type so the estimate is accurate" : "Alege tipul proprietății, ca estimarea să fie corectă",
  invalidUrl: (language: FormLang) =>
    isEn(language)
      ? "This link doesn't look valid. Paste the full listing URL (it starts with https://)."
      : "Linkul nu pare valid. Lipește adresa completă a anunțului (începe cu https://).",
} as const;
