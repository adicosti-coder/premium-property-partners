// Admin: send a message for a lead via chat (visitor's chat window), e-mail, or internal note.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = await requireAdmin(req, cors);
  if (!auth.ok) return auth.response!;

  const body = await req.json().catch(() => ({}));
  const leadId = String(body.leadId ?? "");
  const conversationId = String(body.conversationId ?? "");
  const channel = String(body.channel ?? "");
  const content = String(body.content ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 2000);
  const uuid = /^[0-9a-f-]{36}$/i;
  if (!["chat", "email", "note"].includes(channel) || !content) return json({ error: "invalid_input" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Reply straight into a chat conversation (Inbox), even without a lead attached
  if (channel === "chat" && uuid.test(conversationId)) {
    const { data: conv } = await sb.from("chat_conversations").select("id, lead_id").eq("id", conversationId).maybeSingle();
    if (!conv) return json({ error: "conversation_not_found" }, 404);
    const { error } = await sb.from("chat_messages").insert({ conversation_id: conv.id, role: "agent", content });
    if (error) return json({ error: error.message }, 500);
    await sb.from("chat_conversations").update({ last_activity_at: new Date().toISOString(), summary_sent_at: null }).eq("id", conv.id);
    if (conv.lead_id) {
      await sb.from("lead_notes").insert({ lead_id: conv.lead_id, content: `💬 Chat (Andrei): ${content}`, created_by: auth.userId && auth.userId !== "00000000-0000-0000-0000-000000000000" ? auth.userId : null });
      await advanceStage(sb, conv.lead_id, content);
    }
    return json({ ok: true });
  }
  if (!uuid.test(leadId)) return json({ error: "invalid_input" }, 400);
  const { data: lead } = await sb.from("leads").select("id, name, email, crm_status").eq("id", leadId).maybeSingle();
  if (!lead) return json({ error: "lead_not_found" }, 404);
  const createdBy = auth.userId && auth.userId !== "00000000-0000-0000-0000-000000000000" ? auth.userId : null;

  if (channel === "chat") {
    const { data: conv } = await sb.from("chat_conversations").select("id").eq("lead_id", leadId)
      .order("last_activity_at", { ascending: false }).limit(1).maybeSingle();
    if (!conv) return json({ error: "no_chat", message: "Lead-ul nu are o conversație în chat." }, 409);
    const { error } = await sb.from("chat_messages").insert({ conversation_id: conv.id, role: "agent", content });
    if (error) return json({ error: error.message }, 500);
    await sb.from("chat_conversations").update({ last_activity_at: new Date().toISOString(), summary_sent_at: null }).eq("id", conv.id);
  } else if (channel === "email") {
    if (!lead.email) return json({ error: "no_email", message: "Lead-ul nu are adresă de e-mail." }, 409);
    const { error } = await sb.functions.invoke("send-transactional-email", {
      headers: { "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
      body: {
        templateName: "andrei-message",
        recipientEmail: lead.email,
        idempotencyKey: `andrei-msg-${leadId}-${crypto.randomUUID()}`,
        templateData: { name: lead.name && !/^Lead din/i.test(lead.name) ? lead.name : undefined, message: content },
      },
    });
    if (error) return json({ error: "email_failed" }, 502);
  }

  const label = channel === "chat" ? "💬 Chat (Andrei)" : channel === "email" ? "✉️ E-mail trimis" : "📝 Notă";
  await sb.from("lead_notes").insert({ lead_id: leadId, content: `${label}: ${content}`, created_by: createdBy });
  if (channel !== "note") await advanceStage(sb, leadId, content);
  return json({ ok: true });
});

const OFFER_RE = /\d[\d.\s]*\s?(€|eur\b|euro)|randament|9[,.]4\s*%|15\s*[-–]\s*20\s*%|evaluare(a)? gratuit|\/proprietate\/|\/imobiliare|\bofert/i;

// Nou → Contactat la orice mesaj trimis; → Ofertat când mesajul conține o ofertă concretă.
async function advanceStage(sb: any, leadId: string, content: string) {
  await sb.from("leads").update({ crm_status: "contactat" }).eq("id", leadId).eq("crm_status", "nou_necontactat");
  if (OFFER_RE.test(content)) {
    await sb.from("leads").update({ crm_status: "ofertat" }).eq("id", leadId).in("crm_status", ["nou_necontactat", "contactat"]);
  }
}
