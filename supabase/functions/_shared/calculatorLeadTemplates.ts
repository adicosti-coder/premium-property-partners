// Șabloanele Meta pentru cererile din calculatorul de venit (UTILITY, ro).
// Folosite de `handle-lead-whatsapp` (trimitere) și `wa-create-calculator-templates` (creare).

export const CALC_LANG = "ro";

/** Alertă internă către numărul de administrare (Andrei). */
export const CALC_ALERT_TEMPLATE = {
  name: "alerta_cerere_calculator",
  body: [
    "Cerere nouă trimisă din calculatorul de venit RealTrust.",
    "",
    "Client: {{1}}",
    "Telefon: {{2}}",
    "Localitate și serviciu: {{3}}",
    "Proprietate: {{4}}",
    "Venit net estimat: {{5}}",
    "",
    "Vezi exact datele introduse în calculator: {{6}}",
    "",
    "Vă rugăm să contactați clientul cât mai curând pe WhatsApp.",
  ].join("\n"),
  example: ["Ion Popescu", "40722123456", "Sinaia [Consultanță / Regional]", "Apartament · 60 mp",
    "650 – 860 €/lună", "https://realtrust.ro/admin/cereri-randament?lead=00000000-0000-0000-0000-000000000000"],
};

/** Confirmarea către vizitator (înlocuiește mesajul liber blocat de Meta). */
export const CALC_VISITOR_TEMPLATE = {
  name: "confirmare_cerere_calculator",
  body: [
    "Bună ziua, {{1}}! Am primit cererea dumneavoastră din calculatorul de venit RealTrust pentru proprietatea din {{2}} ({{3}}).",
    "",
    "Venitul net estimat este {{4}}. Andrei, consultantul nostru, analizează datele și vă scrie aici cu simularea detaliată.",
    "",
    "Dacă doriți să adăugați detalii despre proprietate, răspundeți la acest mesaj.",
  ].join("\n"),
  example: ["Ion", "Sinaia", "Apartament · 60 mp", "650 – 860 €/lună"],
};

export const calcLeadAdminUrl = (leadId: string) =>
  `https://realtrust.ro/admin/cereri-randament?lead=${encodeURIComponent(leadId)}`;

/** Textul alertei, folosit și ca mesaj liber când șablonul nu e încă aprobat. */
export function renderTemplate(body: string, params: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

/** Meta respinge parametri cu linii noi, tab-uri sau peste 4 spații consecutive. */
export const cleanParam = (s: unknown, max = 200) =>
  String(s ?? "—").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max) || "—";

// ── Format unic v2 pentru calculatorul unificat ─────────────────────────────
// Șabloanele aprobate nu pot fi editate în Meta, așa că v2 are nume noi.
// Până la aprobare, trimiterea revine automat la șabloanele v1 de mai sus.

/** Alertă internă v2: cifrele estimării + marcajul „ajustat de mine”. */
export const CALC_ALERT_TEMPLATE_V2 = {
  name: "alerta_calculator_unificat",
  body: [
    "Cerere nouă trimisă din calculatorul unificat RealTrust.",
    "",
    "Client: {{1}}",
    "Telefon: {{2}}",
    "Localitate și serviciu: {{3}}",
    "Proprietate: {{4}}",
    "",
    "Venit net estimat: {{5}}",
    "Tarif pe noapte: {{6}}",
    "Grad de ocupare: {{7}}",
    "Diferență față de chiria clasică: {{8}}",
    "Cifre ajustate de vizitator: {{9}}",
    "",
    "Vezi exact datele introduse în calculator: {{10}}",
    "",
    "Vă rugăm să contactați clientul cât mai curând pe WhatsApp.",
  ].join("\n"),
  example: ["Ion Popescu", "40722123456", "Sinaia [Consultanță / Regional]", "Apartament · 60 mp",
    "650 – 860 €/lună", "73 €/noapte", "70%", "+250 €/lună", "Da (ajustat de mine)",
    "https://realtrust.ro/admin/cereri-randament?lead=00000000-0000-0000-0000-000000000000"],
};

/** Confirmare v2 către vizitator, cu rezumatul estimării de pe site. */
export const CALC_VISITOR_TEMPLATE_V2 = {
  name: "confirmare_calculator_unificat",
  body: [
    "Bună ziua, {{1}}! Am primit cererea dumneavoastră din calculatorul RealTrust pentru proprietatea din {{2}} ({{3}}).",
    "",
    "Rezumatul estimării calculate pe site:",
    "Venit net estimat: {{4}}",
    "Tarif pe noapte: {{5}}",
    "Grad de ocupare: {{6}}",
    "Față de chiria clasică: {{7}}",
    "",
    "Andrei, consultantul nostru, verifică cifrele și vă scrie aici cu simularea detaliată. Estimarea este orientativă și nu reprezintă o garanție de venit.",
  ].join("\n"),
  example: ["Ion", "Sinaia", "Apartament · 60 mp", "650 – 860 €/lună", "73 €/noapte", "70%", "+250 €/lună"],
};

export type CalcLeadSummary = {
  leadId: string; name: string; phone: string; location: string; serviceTag: string | null;
  property: string; incomeRange: string;
  nightlyRate?: number | null; occupancy?: number | null;
  classicRent?: number | null; netMid?: number | null; adjusted?: boolean | null;
};

const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;
export const fmtNightly = (n?: number | null) => (n && n > 0 ? `${eur(n)}/noapte` : "—");
/** Acceptă 0–1 sau 0–100. */
export const fmtOccupancy = (o?: number | null) =>
  o == null || !(o > 0) ? "—" : `${Math.round(o <= 1 ? o * 100 : o)}%`;
export function fmtDiff(net?: number | null, classic?: number | null) {
  if (net == null || classic == null || !(classic > 0)) return "—";
  const d = Math.round(net - classic);
  return `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toLocaleString("ro-RO")} €/lună`;
}
export const fmtAdjusted = (a?: boolean | null) => (a ? "Da (ajustat de mine)" : "Nu, valori implicite");

export function calcAlertParamsV2(s: CalcLeadSummary): string[] {
  return [
    cleanParam(s.name, 80), cleanParam(s.phone, 20),
    cleanParam(`${s.location}${s.serviceTag ? ` ${s.serviceTag}` : ""}`, 160),
    cleanParam(s.property, 120), cleanParam(s.incomeRange, 60),
    cleanParam(fmtNightly(s.nightlyRate), 30), cleanParam(fmtOccupancy(s.occupancy), 10),
    cleanParam(fmtDiff(s.netMid, s.classicRent), 30), cleanParam(fmtAdjusted(s.adjusted), 30),
    calcLeadAdminUrl(s.leadId),
  ];
}

export function calcVisitorParamsV2(s: CalcLeadSummary): string[] {
  return [
    cleanParam(s.name.split(/\s+/)[0], 40), cleanParam(s.location, 100), cleanParam(s.property, 100),
    cleanParam(s.incomeRange, 60), cleanParam(fmtNightly(s.nightlyRate), 30),
    cleanParam(fmtOccupancy(s.occupancy), 10), cleanParam(fmtDiff(s.netMid, s.classicRent), 30),
  ];
}
