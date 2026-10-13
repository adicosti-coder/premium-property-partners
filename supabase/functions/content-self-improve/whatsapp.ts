import { auditWaConversation, WA_AUDIT_RULES, type AuditCode } from "../_shared/waConversationAudit.ts";

export async function gatherWhatsappAudit(db: any, since: string) {
  const { data: conversations, error } = await db.from("wa_conversations").select("id")
    .gte("last_inbound_at", since).order("last_inbound_at", { ascending: false }).limit(30);
  if (error) throw error;
  const findings: { conversation_id: string; code: AuditCode; message_id: string | null }[] = [];
  for (const c of conversations ?? []) {
    const { data: messages, error: msgErr } = await db.from("wa_messages")
      .select("id,direction,role,content,error,created_at").eq("conversation_id", c.id)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(120);
    if (msgErr) throw msgErr;
    for (const f of auditWaConversation([...(messages ?? [])].reverse())) findings.push({ ...f, conversation_id: c.id });
  }
  return { conversations: conversations?.length ?? 0, findings };
}

export async function analyzeWhatsapp(db: any) {
  const now = new Date();
  const audit = await gatherWhatsappAudit(db, new Date(now.getTime() - 14 * 86400000).toISOString());
  const { data: previous, error } = await db.from("content_improvements")
    .select("status,proposed_value").eq("kind", "insight").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  const seen = new Set((previous ?? []).filter((r: any) => r.proposed_value?.scope === "whatsapp" && ["pending", "applied", "rejected"].includes(r.status)).map((r: any) => r.proposed_value.code));
  const rows = [];
  for (const [code, rule] of Object.entries(WA_AUDIT_RULES)) {
    const hits = audit.findings.filter(f => f.code === code);
    if (!hits.length || seen.has(code)) continue;
    const ids = [...new Set(hits.map(f => f.conversation_id))];
    rows.push({ kind: "insight", title: `WhatsApp · ${rule.label}`, confidence: null,
      rationale: "Semnal determinist din conversații reale; verifică discuțiile înainte de aprobarea regulii. Nu reprezintă un scor AI.",
      evidence: { text: `${hits.length} semnale în ${ids.length} conversații din ${audit.conversations} inspectate (ultimele 14 zile, maximum 30 discuții × 120 mesaje).`, conversation_ids: ids, message_ids: hits.map(h => h.message_id).filter(Boolean) },
      current_value: { conversations_14d: audit.conversations, signals_before: hits.length },
      proposed_value: { scope: "whatsapp", code, lesson: rule.lesson },
    });
  }
  if (rows.length) {
    const { error: insertErr } = await db.from("content_improvements").insert(rows);
    if (insertErr) throw insertErr;
  }
  return { created: rows.length, inspected: audit.conversations, signals: audit.findings.length };
}