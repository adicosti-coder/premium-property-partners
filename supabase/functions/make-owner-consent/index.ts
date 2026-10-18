// make-owner-consent — acțiunea Admin „Trimite acord proprietar”: trimite către
// webhook-ul Make.com de Outreach (MAKE_OUTREACH_WEBHOOK_URL) exact
// { phone (407…, fără „+”), title, zone, price, source_url } pentru anunțul selectat.
// Admin-only; respectă aceleași excluderi ca outreach-dispatch.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { toOutreachPhone } from "../_shared/waPhone.ts";

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response!;

  let body: { prospect_id?: string; message?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const id = String(body.prospect_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "prospect_id invalid" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p, error } = await sb.from("prospect_listings")
    .select("id,title,zone,price,source_url,phone_normalized,contact_phone,seller_type,agency_suspicion_score,do_not_call,auto_blacklisted_at")
    .eq("id", id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!p) return json({ error: "not_found" }, 404);

  const phone = toOutreachPhone(p.phone_normalized || p.contact_phone);
  if (!phone) return json({ ok: false, reason: "invalid_phone" }, 422);
  if (p.do_not_call || p.auto_blacklisted_at) return json({ ok: false, reason: "excluded" }, 422);
  if ((p.agency_suspicion_score ?? 0) >= 70 || ["agency", "agentie"].includes(String(p.seller_type || "")))
    return json({ ok: false, reason: "agency" }, 422);

  const url = Deno.env.get("MAKE_OUTREACH_WEBHOOK_URL");
  if (!url) return json({ ok: false, reason: "webhook_not_configured" }, 500);

  const payload: Record<string, string> = {
    phone,
    title: p.title ?? "",
    zone: p.zone ?? "",
    price: p.price != null ? String(p.price) : "",
    source_url: p.source_url ?? "",
  };
  // Textul din caseta „Mesaj către proprietar" pleacă către Make.com, ca
  // scenariul să trimită exact acest mesaj pe WhatsApp.
  if (body.message?.trim()) payload.message = body.message.trim().slice(0, 1500);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const text = (await r.text()).slice(0, 200);
    if (!r.ok) throw new Error(`http_${r.status}: ${text}`);
    await sb.from("prospect_listings").update({
      outreach_status: "outreach_pending", outreach_status_at: new Date().toISOString(), outreach_error: null,
    }).eq("id", id);
    return json({ ok: true, make_response: text });
  } catch (e) {
    await sb.from("prospect_listings").update({
      outreach_status: "failed", outreach_status_at: new Date().toISOString(), outreach_error: String(e).slice(0, 300),
    }).eq("id", id);
    return json({ ok: false, reason: "make_error", error: String(e) }, 502);
  }
});
