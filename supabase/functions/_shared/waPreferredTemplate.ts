// Alege șablonul de primul mesaj: varianta premium (cu antet, ofertă clară și
// butoane de răspuns rapid) imediat ce Meta o aprobă, altfel varianta veche.
// Astfel trecerea se face singură, fără intervenție manuală.
import { WA_API_VERSION, WA_BUSINESS_ACCOUNT_ID, waToken } from "./waConfig.ts";

export const WA_PREMIUM_TEMPLATE = "prospect_intro_premium_v3";
export const WA_LEGACY_TEMPLATE = "intake_prospect_apartments";

let cached: { name: string; at: number } | null = null;
const TTL_MS = 10 * 60_000;

/** Numele șablonului aprobat care trebuie folosit la primul mesaj. */
export async function preferredIntroTemplate(): Promise<string> {
  const envOverride = Deno.env.get("WA_OUTBOUND_TEMPLATE") || Deno.env.get("WA_DEFAULT_TEMPLATE");
  if (envOverride) return envOverride.trim();

  if (cached && Date.now() - cached.at < TTL_MS) return cached.name;

  const token = waToken();
  if (!token) return WA_LEGACY_TEMPLATE;

  try {
    const resp = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) return WA_LEGACY_TEMPLATE;
    const body = await resp.json();
    const rows: { name?: string; status?: string }[] = body?.data ?? [];
    const premiumOk = rows.some(
      (t) => t.name === WA_PREMIUM_TEMPLATE && String(t.status).toUpperCase() === "APPROVED",
    );
    const name = premiumOk ? WA_PREMIUM_TEMPLATE : WA_LEGACY_TEMPLATE;
    cached = { name, at: Date.now() };
    return name;
  } catch {
    return WA_LEGACY_TEMPLATE;
  }
}

/**
 * Verifică dacă un șablon există APROBAT în limba cerută. Dacă nu, întoarce
 * șablonul aprobat de primul mesaj, ca mesajele automate să nu mai fie
 * respinse de Meta cu eroarea 132001 („template name does not exist").
 */
export async function resolveApprovedTemplate(
  name: string,
  language = "ro",
): Promise<{ name: string; fallback: boolean }> {
  const token = waToken();
  if (!token) return { name, fallback: false };
  try {
    const resp = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,language&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) return { name, fallback: false };
    const rows: { name?: string; status?: string; language?: string }[] =
      (await resp.json())?.data ?? [];
    const ok = rows.some(
      (t) =>
        t.name === name &&
        String(t.status).toUpperCase() === "APPROVED" &&
        String(t.language || "").toLowerCase().startsWith(language.toLowerCase().slice(0, 2)),
    );
    if (ok) return { name, fallback: false };
    const alt = await preferredIntroTemplate();
    return { name: alt, fallback: alt !== name };
  } catch {
    return { name, fallback: false };
  }
}
