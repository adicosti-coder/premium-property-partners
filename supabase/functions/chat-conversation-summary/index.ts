// Internal (hourly cron): one summary e-mail to info@realtrust.ro per chat conversation
// that has been silent for 10+ minutes since its last new message.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const denied = await requireInternalOrAdmin(req, cors);
  if (denied) return denied;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const { data: convs } = await sb.from("chat_conversations")
    .select("id, lead_id, page_title, page_url, last_activity_at")
    .is("summary_sent_at", null)
    .lt("last_activity_at", new Date(now - 10 * 60_000).toISOString())
    .gt("last_activity_at", new Date(now - 48 * 3600_000).toISOString())
    .limit(30);

  let sent = 0;
  for (const c of convs ?? []) {
    const { data: msgs } = await sb.from("chat_messages").select("role, content, created_at")
      .eq("conversation_id", c.id).in("role", ["user", "assistant", "agent"]).order("created_at").limit(60);
    const hasReply = (msgs ?? []).some((m) => m.role !== "user");
    if (!hasReply) { await sb.from("chat_conversations").update({ summary_sent_at: new Date().toISOString() }).eq("id", c.id); continue; }
    let leadName: string | undefined;
    if (c.lead_id) {
      const { data: l } = await sb.from("leads").select("name").eq("id", c.lead_id).maybeSingle();
      leadName = l?.name && !/^Lead din/i.test(l.name) ? l.name : undefined;
    }
    const lines = (msgs ?? []).map((m) => ({
      who: m.role === "user" ? "Vizitator" : m.role === "agent" ? "Andrei (manual)" : "Andrei",
      text: String(m.content).slice(0, 600),
    }));
    const { error } = await sb.functions.invoke("send-transactional-email", {
      headers: { "x-webhook-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" },
      body: {
        templateName: "chat-conversation-summary",
        idempotencyKey: `chat-summary-${c.id}-${c.last_activity_at}`,
        templateData: { lines, pageTitle: c.page_title ?? undefined, pageUrl: c.page_url ?? undefined, leadName },
      },
    });
    if (!error) {
      await sb.from("chat_conversations").update({ summary_sent_at: new Date().toISOString() }).eq("id", c.id);
      sent++;
    } else console.error("[chat-summary]", c.id, error.message);
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...cors, "Content-Type": "application/json" } });
});
