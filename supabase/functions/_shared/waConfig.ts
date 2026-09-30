// Configurația WhatsApp Cloud API (valori publice, nu secrete).
// Expeditorul OFICIAL de companie: numărul Meta al ApArt Hotel by RealTrust
// +40 733 783 540 (Phone Number ID 1357718887419757).
// Numărul personal +40 723 154 520 este strict număr de test/administrare și
// NU trebuie folosit niciodată ca expeditor în apelurile Meta Cloud API.
const OFFICIAL_WA_PHONE_NUMBER_ID = "1357718887419757";

/** Phone Number ID al expeditorului oficial (secret cu prioritate, fallback la ID-ul oficial). */
export const WA_PHONE_NUMBER_ID =
  (Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID") || "").trim() || OFFICIAL_WA_PHONE_NUMBER_ID;

export const WA_BUSINESS_ACCOUNT_ID =
  (Deno.env.get("META_WHATSAPP_BUSINESS_ACCOUNT_ID") || "").trim() || "1734901587779217";
export const WA_API_VERSION = "v25.0";

/** Tokenul permanent Meta (secret). */
export function waToken(): string {
  return Deno.env.get("META_PERMANENT_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
}
