// Sumar zilnic 20:00 (WhatsApp admin + e-mail info@realtrust.ro): coadă, răspunsuri proprietari, publicări, alerte Meta.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const isYes = (t: string) => /^(da( public)?|de acord|ok|okay|publicati|👍)[\s.!]*$/.test(norm(t)) || t.includes("👍");
const isNo = (t: string) => /\b(nu|stop|nu multumesc|vandut|inchiriat|dezabonare)\b/.test(norm(t));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 864e5).toISOString();

  const [sent, pending, failed, inbound, published] = await Promise.all([
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).gte("sent_at", since),
    sb.from("wa_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("wa_outbound_queue").select("last_error").eq("status", "failed").gte("updated_at", since).limit(200),
    sb.from("wa_messages").select("content").eq("direction", "inbound").gte("created_at", since).limit(2000),
    sb.from("prospect_listings").select("id", { count: "exact", head: true }).gte("published_at", since),
  ]);

  let yes = 0, no = 0, other = 0;
  for (const m of inbound.data ?? []) {
    const t = String(m.content ?? "");
    if (isYes(t)) yes++; else if (isNo(t)) no++; else other++;
  }
  const errs: Record<string, number> = {};
  for (const f of failed.data ?? []) {
    const code = String(f.last_error ?? "necunoscut").match(/\b(13\d{4}|4\d{2}|5\d{2})\b/)?.[1] ?? String(f.last_error ?? "necunoscut").slice(0, 40);
    errs[code] = (errs[code] ?? 0) + 1;
  }
  const errLines = Object.entries(errs).map(([k, v]) => `   ↳ ${k}: ${v}`);
  const body = [
    `📋 Sumar zilnic proprietari (ultimele 24h)`,
    `📤 Mesaje trimise din coadă: ${sent.count ?? 0}`,
    `💬 Răspunsuri proprietari: ${yes + no + other} (DA: ${yes} · Nu/STOP: ${no} · altele: ${other})`,
    `🏠 Anunțuri publicate pe realtrust.ro: ${published.count ?? 0}`,
    `⏳ Rămase în coadă: ${pending.count ?? 0}`,
    `⚠️ Erori Meta: ${(failed.data ?? []).length}`,
    ...errLines,
  ].join("\n");

  const wa = await sendAdminText(body).catch((e) => ({ ok: false, error: String(e) }));
  const mail = await sendTeamEmail({
    to: "info@realtrust.ro",
    subject: `Sumar zilnic: ${sent.count ?? 0} trimise, ${yes} DA, ${published.count ?? 0} publicate`,
    html: `<pre style="font-family:inherit;font-size:14px">${body.replace(/</g, "&lt;")}</pre>`,
    source: "wa-daily-owner-summary",
  }, sb).catch((e) => ({ sent: false, error: String(e) }));

  return new Response(JSON.stringify({ body, wa, mail }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
