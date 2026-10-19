// outreach-dispatch — trimite un anunț nou de proprietar privat către scenariul
// Make.com de Outreach (MAKE_OUTREACH_WEBHOOK_URL) și îl marchează "outreach_pending".
// Apelat de triggerul trg_fire_make_outreach (x-cron-secret) sau de Admin (test, dry_run).
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { toOutreachPhone } from "../_shared/waPhone.ts";
import { isTestPhone } from "../_shared/testPhoneAllowlist.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let body: { prospect_id?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* */ }
  const id = String(body.prospect_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "prospect_id invalid" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p, error } = await sb.from("prospect_listings")
    .select("id,title,zone,price,source_url,category,phone_normalized,contact_phone,seller_type,agency_suspicion_score,do_not_call,auto_blacklisted_at,lifecycle_status,outreach_status")
    .eq("id", id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!p) return json({ error: "not_found" }, 404);

  const phone = toOutreachPhone(p.phone_normalized || p.contact_phone);
  const reasons: string[] = [];
  if (!phone) reasons.push("not_mobile");

  // Numărul de test al lui Adrian ocolește și excluderea de contact, și verificarea de agenție.
  if (((p.agency_suspicion_score ?? 0) >= 70 || ["agency", "agentie"].includes(String(p.seller_type || ""))) && !isTestPhone(phone)) reasons.push("agency");
  if ((p.do_not_call || p.auto_blacklisted_at) && !isTestPhone(phone)) reasons.push("excluded");
  if (["rejected", "expired", "failed", "posted"].includes(String(p.lifecycle_status))) reasons.push("closed");
  if (p.outreach_status && !body.dry_run) reasons.push("already_sent");
  if (reasons.length) return json({ ok: false, skipped: reasons });

  const payload = {
    id: p.id, phone: phone ?? "", title: p.title ?? "", zone: p.zone ?? "",
    price: p.price != null ? String(p.price) : "", source_url: p.source_url ?? "",
    type: p.category === "vanzare" ? "vanzare" : "inchiriere",
    listing_type: p.category === "vanzare" ? "vanzare" : "inchiriere",
  };

  if (body.dry_run) return json({ ok: true, dry_run: true, payload });

  const url = Deno.env.get("MAKE_OUTREACH_WEBHOOK_URL");
  if (!url) return json({ ok: false, skipped: ["webhook_not_configured"] });

  const now = new Date().toISOString();
  await sb.from("prospect_listings").update({ outreach_status: "outreach_pending", outreach_status_at: now, outreach_error: null }).eq("id", id);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`http_${r.status}: ${(await r.text()).slice(0, 200)}`);
    return json({ ok: true, status: "outreach_pending" });
  } catch (e) {
    await sb.from("prospect_listings").update({ outreach_status: "failed", outreach_status_at: new Date().toISOString(), outreach_error: String(e).slice(0, 300) }).eq("id", id);
    return json({ ok: false, error: String(e) }, 502);
  }
});
