// outreach-status — endpoint apelat de Make.com după trimiterea mesajului.
// Header obligatoriu: x-outreach-secret = MAKE_OUTREACH_CALLBACK_SECRET.
// Body: { "id": "<uuid>", "status": "whatsapp_sent" | "call_completed" | "failed" | ..., "error"?: "..." }
import { createClient } from "npm:@supabase/supabase-js@2";
import { queueVoiceFallback } from "../_shared/voiceFallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-outreach-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED = ["outreach_pending", "whatsapp_sent", "whatsapp_delivered", "whatsapp_read", "replied", "call_completed", "failed"];

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("MAKE_OUTREACH_CALLBACK_SECRET") || "";
  const got = req.headers.get("x-outreach-secret") || "";
  if (!secret || !safeEqual(got, secret)) return json({ error: "Unauthorized" }, 401);

  let b: { id?: string; status?: string; error?: string } = {};
  try { b = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const id = String(b.id || "");
  const status = String(b.status || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "id invalid" }, 400);
  if (!ALLOWED.includes(status)) return json({ error: `status invalid; permise: ${ALLOWED.join(", ")}` }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.from("prospect_listings")
    .update({ outreach_status: status, outreach_status_at: new Date().toISOString(), outreach_error: status === "failed" ? String(b.error || "").slice(0, 300) || null : null })
    .eq("id", id).select("id").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "not_found" }, 404);
  // WhatsApp nelivrat (număr fără cont, eroare Meta) → Andrei sună o dată, ca fallback.
  const voice_fallback = status === "failed" ? await queueVoiceFallback(sb, id) : false;
  return json({ ok: true, id, status, voice_fallback });
});
