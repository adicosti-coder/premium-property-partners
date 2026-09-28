// Public: returns messages written by the human agent (Andrei, from Admin) for a chat session.
// The session id is a random UUID held only by the visitor's browser.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/securityHeaders.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const { sessionId, since } = await req.json().catch(() => ({}));
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "invalid_session" }, 400);
    const sinceIso = typeof since === "string" && !isNaN(Date.parse(since)) ? new Date(since).toISOString() : new Date(0).toISOString();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conv } = await sb.from("chat_conversations").select("id").eq("session_id", sessionId).maybeSingle();
    if (!conv) return json({ messages: [] });
    const { data } = await sb.from("chat_messages").select("id, content, created_at")
      .eq("conversation_id", conv.id).eq("role", "agent").gt("created_at", sinceIso)
      .order("created_at").limit(20);
    return json({ messages: data ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
