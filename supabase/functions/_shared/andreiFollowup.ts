// Follow-up WhatsApp după un „DA” explicit în apelul cu Andrei (șablon aprobat Meta).
import { WA_BUSINESS_ACCOUNT_ID, WA_API_VERSION, waToken } from "./waConfig.ts";

export const ANDREI_FOLLOWUP_TEMPLATE = "andrei_followup_analiza_v1";

export const FOLLOWUP_BENEFITS: Record<"vanzare" | "inchiriere" | "cazare", string> = {
  vanzare: "evaluare corectă de piață pe Timișoara, calificarea cumpărătorilor înainte de vizionare și asistență juridică până la semnare",
  inchiriere: "selectarea atentă a chiriașilor, administrarea contractului, încasarea chiriei și gestionarea mentenanței",
  cazare: "management complet în regim hotelier, curățenie și spălătorie dedicate și tarife optimizate, cu randament net estimat 6,5%–9,4%/an",
};

export async function followupTemplateApproved(): Promise<boolean> {
  const token = waToken();
  if (!token) return false;
  try {
    const r = await fetch(`https://graph.facebook.com/${WA_API_VERSION}/${WA_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status&name=${ANDREI_FOLLOWUP_TEMPLATE}&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    return (j?.data ?? []).some((t: any) => t.name === ANDREI_FOLLOWUP_TEMPLATE && t.status === "APPROVED");
  } catch { return false; }
}

export function followupLink(prospectId: string) {
  return `https://realtrust.ro/analiza-gratuita?ref=andrei&p=${encodeURIComponent(prospectId.slice(0, 8))}`;
}
