import { isClearRefusal } from "./waAutoReply.ts";
import { detectZone } from "./detectZone.ts";

export type AuditMessage = { id?: string; direction: string; role?: string | null; content?: string | null; error?: string | null; created_at?: string };
export const WA_AUDIT_RULES = {
  after_refusal: { title: "Réponses après refus", label: "Răspuns comercial după refuz", lesson: "După un refuz explicit sau STOP, încheie fără ofertă sau întrebare comercială; nu relua contactarea automată." },
  fee_conflict: { title: "Comision neclar", label: "Comision 0% sau costuri neclare", lesson: "Separă publicarea gratuită de intermediere: vânzare 2–4%; închiriere 50–100% din prima chirie; administrare 15–20%. Menționează doar serviciul discutat." },
  invented_claim: { title: "Promisiuni neconfirmate", label: "Cumpărători, termene sau identitate neconfirmate", lesson: "Nu pretinde că ai cumpărători sau investitori pregătiți, că un om a preluat discuția ori că publicarea e garantată în minute; folosește doar fapte verificate." },
  repeated_zone: { title: "Context pierdut", label: "Zona cerută din nou", lesson: "Folosește zona, camerele, tranzacția și prețul explicit din istoric și anunț; nu întreba din nou și nu confunda proprietarul cu un cumpărător." },
  ai_error: { title: "Erori de răspuns AI", label: "Eroare tehnică în conversație", lesson: "Răspunde ultimului mesaj primit, nu unui mesaj vechi. Dacă nu poți continua sigur, predă discuția unui coleg fără să pretinzi că a fost deja preluată." },
} as const;
export type AuditCode = keyof typeof WA_AUDIT_RULES;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Semnale pentru inspecție, nu verdict AI și nici motiv de trimitere automată. */
export function auditWaConversation(messages: AuditMessage[]) {
  const findings: { code: AuditCode; message_id: string | null; label: string }[] = [];
  let refused = false;
  let zone: string | null = null;
  let askedZone = false;
  for (const m of messages) {
    const raw = m.content ?? "";
    const t = norm(raw);
    if (m.direction === "inbound") {
      if (isClearRefusal(raw) || /^\s*stop\b/i.test(raw)) refused = true;
      zone = detectZone(raw) ?? zone;
      continue;
    }
    if (m.direction !== "outbound") continue;
    const add = (code: AuditCode) => findings.push({ code, message_id: m.id ?? null, label: WA_AUDIT_RULES[code].label });
    if (m.error) { add("ai_error"); continue; }
    if (m.role === "system" || !raw || /^\[template:/.test(raw)) continue;
    if (refused && !/nu (va |ne )?mai (deranjam|trimitem|contactam)|nu insist|am inteles|eliminat|retragere|nu va publicam/.test(t) && /\?|oferta|evaluare|colabor|cumparator|promov/.test(t)) add("after_refusal");
    if (/comision\s*0\s*%|fara (niciun fel de )?comisioane/.test(t)) add("fee_conflict");
    if (/avem (deja )?(cumparatori|investitori) (activi|calificati)|am preluat eu|activam in \d+ minute/.test(t)) add("invented_claim");
    const asking = /(?:in ce|ce|care) zona[^?]*\?/.test(t);
    if (asking && (zone || askedZone)) add("repeated_zone");
    if (asking) askedZone = true;
  }
  return findings;
}

/** Latest valid turns, ordered chronologically; never submit an old model-ending slice. */
export function latestGeminiTurns(messages: AuditMessage[]) {
  const valid = messages.filter((m) => !m.error && m.role !== "system" && m.content?.trim())
    .map((m) => ({ role: m.direction === "inbound" ? "user" : "model", parts: [{ text: String(m.content) }] }));
  if (valid.at(-1)?.role !== "user") return [];
  while (valid[0]?.role === "model") valid.shift();
  return valid;
}