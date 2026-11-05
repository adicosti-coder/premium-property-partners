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
  example: ["Ion", "Sinaia", "Apartament · 60 mp", "între 650 și 860 €/lună"],
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
