// Watchdog: e-mail către echipă când un follow-up WhatsApp eșuează pe Meta
// sau când un e-mail (inclusiv confirmările de rezervare) nu a putut fi livrat.
//
// Rulează pe cron. Trimite un singur e-mail cumulativ per rulare și marchează
// înregistrările deja raportate, ca să nu se repete aceeași alertă.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const ALERT_TO = "info@realtrust.ro";
/** Fereastra analizată (minute) — puțin mai mare decât intervalul cronului. */
const LOOKBACK_MIN = 30;

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const since = new Date(Date.now() - LOOKBACK_MIN * 60_000).toISOString();

  const [waRes, mailRes] = await Promise.all([
    supabase
      .from("wa_outbound_queue")
      .select("id, phone_normalized, template_name, last_error, attempts, updated_at")
      .eq("status", "failed")
      .is("alerted_at", null)
      .gte("updated_at", since)
      .limit(50),
    supabase
      .from("admin_email_failures")
      .select("id, recipient, subject, error_message, http_status, source, created_at")
      .is("alerted_at", null)
      .gte("created_at", since)
      .limit(50),
  ]);

  const waFails = waRes.data ?? [];
  const mailFails = mailRes.data ?? [];

  if (waFails.length === 0 && mailFails.length === 0) {
    return new Response(JSON.stringify({ ok: true, alerts: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (items: string[]) => items.join("");

  const html = `
    <h2>Alertă livrare RealTrust</h2>
    <p>În ultimele ${LOOKBACK_MIN} de minute au apărut erori de trimitere.</p>
    ${waFails.length
      ? `<h3>Follow-up WhatsApp eșuat (${waFails.length})</h3>
         <table cellpadding="6" border="1" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
           <tr><th>Destinatar</th><th>Șablon</th><th>Încercări</th><th>Eroare Meta</th></tr>
           ${rows(waFails.map((f) => `<tr><td>${esc(f.phone_normalized)}</td><td>${esc(f.template_name)}</td><td>${esc(f.attempts)}</td><td>${esc(f.last_error)}</td></tr>`))}
         </table>`
      : ""}
    ${mailFails.length
      ? `<h3>E-mailuri nelivrate (${mailFails.length})</h3>
         <table cellpadding="6" border="1" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
           <tr><th>Destinatar</th><th>Subiect</th><th>Sursă</th><th>Status</th><th>Eroare</th></tr>
           ${rows(mailFails.map((f) => `<tr><td>${esc(f.recipient)}</td><td>${esc(f.subject)}</td><td>${esc(f.source)}</td><td>${esc(f.http_status)}</td><td>${esc(f.error_message)}</td></tr>`))}
         </table>`
      : ""}
    <p style="color:#666;font-size:12px">Detalii complete în Admin → Istoric WhatsApp / Lead Dashboard.</p>
  `;

  const result = await sendTeamEmail(
    {
      to: ALERT_TO,
      subject: `⚠️ ${waFails.length + mailFails.length} erori de livrare (WhatsApp / e-mail)`,
      html,
      source: "failure-alert-monitor",
    },
    supabase,
  );

  const nowIso = new Date().toISOString();
  if (result.sent) {
    if (waFails.length) {
      await supabase
        .from("wa_outbound_queue")
        .update({ alerted_at: nowIso })
        .in("id", waFails.map((f) => f.id));
    }
    if (mailFails.length) {
      await supabase
        .from("admin_email_failures")
        .update({ alerted_at: nowIso })
        .in("id", mailFails.map((f) => f.id));
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      alerts: waFails.length + mailFails.length,
      whatsapp_failures: waFails.length,
      email_failures: mailFails.length,
      email_sent: result.sent,
      email_error: result.error ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
