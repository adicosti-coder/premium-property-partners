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
  const channel = String(body.channel ?? "");
  const content = String(body.content ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(leadId) || !["chat", "email", "note"].includes(channel) || !content) {
    return json({ error: "invalid_input" }, 400);
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
  if (channel !== "note" && lead.crm_status === "nou_necontactat") {
    await sb.from("leads").update({ crm_status: "contactat" }).eq("id", leadId);
  }
  return json({ ok: true });
});
