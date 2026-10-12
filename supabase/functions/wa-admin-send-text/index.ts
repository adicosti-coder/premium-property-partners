// Trimitere manuală (admin/intern) a unui mesaj text într-o conversație WhatsApp existentă.
// Folosește wa-andrei-send cu manual:true (mesaj de agent, în fereastra de 24h).
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const denied = await requireInternalOrAdmin(req, cors);
  if (denied) return denied;
  let b: { conversation_id?: string; text?: string } = {};
  try { b = await req.json(); } catch { /* */ }
  const text = String(b.text ?? "").trim();
  if (!b.conversation_id || !/^[0-9a-f-]{36}$/i.test(b.conversation_id) || !text || text.length > 1500) {
    return new Response(JSON.stringify({ error: "conversation_id și text sunt obligatorii" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/wa-andrei-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": Deno.env.get("WA_ANDREI_INTERNAL_SECRET") || "" },
    body: JSON.stringify({ conversation_id: b.conversation_id, text, manual: true }),
  });
  const out = await r.text();
  return new Response(out, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
});
