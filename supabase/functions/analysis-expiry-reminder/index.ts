// Sends a reminder email 3 days before a shared analysis link expires.
// Invoked by pg_cron (daily). Idempotent via property_analyses.expiry_notified_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SITE = "https://realtrust.ro";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (v: unknown, suffix = "") =>
  typeof v === "number" && Number.isFinite(v)
    ? `${Math.round(v).toLocaleString("ro-RO")}${suffix}`
    : "—";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_KEY) return json({ error: "not_configured" }, 500);

  const admin = createClient(SB_URL, SB_SERVICE_KEY, { auth: { persistSession: false } });

  const now = Date.now();
  const windowEnd = new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("property_analyses")
    .select("id, share_token, analysis, recipient_email, expires_at")
    .not("recipient_email", "is", null)
    .is("expiry_notified_at", null)
    .gt("expires_at", new Date(now).toISOString())
    .lte("expires_at", windowEnd)
    .limit(50);

  if (error) return json({ error: "db_error", message: error.message }, 500);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const a = (row.analysis || {}) as Record<string, unknown>;
    const shareUrl = `${SITE}/analiza/${row.share_token}`;
    const expires = row.expires_at
      ? new Date(row.expires_at as string).toLocaleDateString("ro-RO")
      : "";

    const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1b2431">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#0f2340;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:1px;color:#D4AF37;text-transform:uppercase">RealTrust Timișoara</p>
      <h1 style="margin:6px 0 0;font-size:21px">Linkul analizei tale expiră în 3 zile</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e6e8ec;border-top:0;border-radius:0 0 14px 14px">
      <p style="margin:0 0 14px">Analiza${a.zona ? ` pentru ${esc(a.zona)}` : ""} rămâne disponibilă până la <strong>${esc(expires)}</strong>. După această dată linkul privat se dezactivează.</p>
      <p style="margin:0 0 16px;font-size:14px;color:#3c4654">Venit net estimat: <strong>${num(a.venit_lunar_net, " RON")}/lună</strong>${a.roi_estimat ? ` · ROI: <strong>${esc(a.roi_estimat)}</strong>` : ""}</p>
      <p style="margin:0 0 12px">
        <a href="${shareUrl}" style="display:inline-block;background:#D4AF37;color:#0f2340;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:10px">Vezi raportul înainte de expirare</a>
      </p>
      <div style="border-top:1px solid #e6e8ec;margin-top:18px;padding-top:18px">
        <p style="margin:0 0 10px;font-size:14px"><strong>Vrei o re-evaluare actualizată?</strong><br/>Tarifele și ocuparea din Timișoara se schimbă lunar — refacem analiza gratuit, pe date curente.</p>
        <a href="${SITE}/hostscan-ai" style="display:inline-block;border:1px solid #0f2340;color:#0f2340;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:bold">Cere re-evaluarea</a>
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:#939aa5">Estimările folosesc 75% ocupare și 27% deducere management/taxe. RealTrust Timișoara.</p>
    </div>
  </div></body></html>`;

    const res = await sendTeamEmail(
      {
        to: row.recipient_email as string,
        subject: "Analiza ta RealTrust expiră în 3 zile – vrei o re-evaluare?",
        html,
        source: "analysis_expiry_reminder",
      },
      admin,
    );

    if (res.sent) sent++;
    else failed++;

    await admin
      .from("property_analyses")
      .update({ expiry_notified_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  return json({ ok: true, candidates: rows?.length ?? 0, sent, failed });
});
