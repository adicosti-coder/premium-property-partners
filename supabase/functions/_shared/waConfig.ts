// Configurația WhatsApp Cloud API (valori publice, nu secrete).
// Numărul Meta al ApArt Hotel by RealTrust: +40 733 783 540.
// Phone Number ID-ul înregistrat pentru Cloud API (register cu PIN reușit):
export const WA_PHONE_NUMBER_ID = "1357718887419757";
export const WA_BUSINESS_ACCOUNT_ID = "1734901587779217";
export const WA_API_VERSION = "v25.0";

/** Tokenul permanent Meta (secret). */
export function waToken(): string {
  return Deno.env.get("META_PERMANENT_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
}
