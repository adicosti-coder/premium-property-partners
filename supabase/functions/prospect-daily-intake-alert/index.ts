// Raport zilnic pe WhatsApp (numărul de administrare) + e-mail info@realtrust.ro:
// câte anunțuri noi au intrat în ultimele 24h, câte cu telefon, pe platforme.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cron-secret",
};

const platformOf = (u: string) => {
  const m = String(u || "").toLowerCase().match(/(olx|storia|publi24|anuntul|bursaimobiliara|imobiliare)/);
  return m ? m[1] : "altele";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data, error } = await sb
    .from("prospect_listings")
    .select("source_url, phone_normalized, is_active")
    .gte("created_at", since)
    .limit(1000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const rows = data ?? [];
  const mobile = (p?: string | null) => /^\+407\d{8}$/.test(p ?? "");
  const total = rows.length;
  const withPhone = rows.filter((r) => mobile(r.phone_normalized)).length;
  const inactive = rows.filter((r) => !r.is_active).length;
  const per: Record<string, { t: number; p: number }> = {};
  for (const r of rows) {
    const k = platformOf(r.source_url);
    per[k] ??= { t: 0, p: 0 };
    per[k].t++;
    if (mobile(r.phone_normalized)) per[k].p++;
  }
  const lines = Object.entries(per).sort((a, b) => b[1].t - a[1].t).map(([k, v]) => `• ${k}: ${v.t} (cu telefon ${v.p})`);
  const warn = total === 0 ? "\n⚠️ Nu a intrat niciun anunț — verificați scanarea." : withPhone === 0 && total > 0 ? "\n⚠️ Niciun anunț cu telefon mobil." : "";
  const body = `📊 Anunțuri noi (ultimele 24h): ${total}\n📱 Cu telefon mobil: ${withPhone}\n🗂️ Fără telefon (Prospectare Manuală): ${total - withPhone}\n🚫 Inactive (agenții/duplicate): ${inactive}\n${lines.join("\n")}${warn}`;

  const wa = await sendAdminText(body);
  const mail = await sendTeamEmail({
    to: "info@realtrust.ro",
    subject: `Raport zilnic anunțuri: ${total} noi, ${withPhone} cu telefon`,
    html: `<pre style="font-family:inherit;font-size:14px">${body.replace(/</g, "&lt;")}</pre>`,
    source: "prospect-daily-intake-alert",
  }, sb).catch((e) => ({ sent: false, error: String(e) }));

  return new Response(JSON.stringify({ total, withPhone, inactive, per, wa, mail }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
