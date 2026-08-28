// Sends the AI analysis summary by email (Resend) right after an analysis is finished.
// Public endpoint: fixed template, validated recipient, rate limited (anti-relay).
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTeamEmail } from "../_shared/teamEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@,;]+\.[a-z]{2,}$/i;
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
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";

  const limit = checkRateLimit(`send-analysis-email:${ip}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return json({ error: "rate_limited", message: "Prea multe e-mailuri trimise. Reîncearcă mai târziu." }, 429);
  }

  let payload: { token?: string; email?: string; name?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().slice(0, 160) : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";

  if (!/^[a-f0-9]{16,64}$/i.test(token)) return json({ error: "invalid_token" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "invalid_email", message: "Adresa de e-mail nu este validă." }, 400);

  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE_KEY) return json({ error: "not_configured" }, 500);

  const admin = createClient(SB_URL, SB_SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await admin
    .from("property_analyses")
    .select("share_token, analysis, zone, source_url, expires_at, email_sent_at")
    .eq("share_token", token)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error) return json({ error: "db_error" }, 500);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return json({ error: "not_found", message: "Analiza nu mai este disponibilă." }, 404);

  const a = (row.analysis || {}) as Record<string, unknown>;
  const shareUrl = `${SITE}/analiza/${token}`;
  const expires = row.expires_at
    ? new Date(row.expires_at as string).toLocaleDateString("ro-RO")
    : null;

  const html = `<!doctype html><html lang="ro"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1b2431">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#0f2340;color:#fff;padding:22px 24px;border-radius:14px 14px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:1px;color:#D4AF37;text-transform:uppercase">RealTrust Timișoara</p>
      <h1 style="margin:6px 0 0;font-size:21px">Analiza potențialului proprietății tale</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e6e8ec;border-top:0;border-radius:0 0 14px 14px">
      <p style="margin:0 0 16px">${name ? `Salut, ${esc(name)}! ` : "Salut! "}Am finalizat analiza${
        a.zona ? ` pentru ${esc(a.zona)}` : ""
      }. Iată rezumatul în regim hotelier:</p>
      <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 8px">
        <tr>
          <td style="background:#f7f8fa;border-radius:10px;padding:12px">
            <div style="font-size:11px;color:#68727f;text-transform:uppercase">Scor potențial</div>
            <div style="font-size:18px;font-weight:bold">${num(a.scor)}/${num(a.max_scor) === "—" ? 100 : num(a.max_scor)}</div>
          </td>
          <td style="background:#f7f8fa;border-radius:10px;padding:12px">
            <div style="font-size:11px;color:#68727f;text-transform:uppercase">Tarif/noapte</div>
            <div style="font-size:18px;font-weight:bold">${num(a.tarif_noapte, " RON")}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#f7f8fa;border-radius:10px;padding:12px">
            <div style="font-size:11px;color:#68727f;text-transform:uppercase">Venit net/lună</div>
            <div style="font-size:18px;font-weight:bold">${num(a.venit_lunar_net, " RON")}</div>
          </td>
          <td style="background:#f7f8fa;border-radius:10px;padding:12px">
            <div style="font-size:11px;color:#68727f;text-transform:uppercase">ROI estimat</div>
            <div style="font-size:18px;font-weight:bold">${esc(a.roi_estimat) || "—"}</div>
          </td>
        </tr>
      </table>
      ${a.verdict ? `<p style="margin:16px 0 0;font-size:14px;color:#3c4654">${esc(a.verdict)}</p>` : ""}
      <p style="margin:22px 0 10px">
        <a href="${shareUrl}" style="display:inline-block;background:#D4AF37;color:#0f2340;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:10px">Vezi raportul complet</a>
      </p>
      <p style="margin:0 0 18px;font-size:12px;color:#68727f">Linkul este privat${
        expires ? ` și este valabil până la ${esc(expires)}` : ""
      }.</p>
      <div style="border-top:1px solid #e6e8ec;padding-top:18px">
        <p style="margin:0 0 10px;font-size:14px"><strong>Vrei cifrele validate de un consultant?</strong><br/>Programează o consultanță gratuită de 20 de minute.</p>
        <a href="${SITE}/pentru-proprietari#contact" style="display:inline-block;border:1px solid #0f2340;color:#0f2340;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:bold">Programează consultanța</a>
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:#939aa5">Estimările folosesc 75% ocupare și 27% deducere management/taxe. RealTrust Timișoara.</p>
    </div>
  </div></body></html>`;

  const result = await sendTeamEmail(
    {
      to: email,
      subject: `Analiza proprietății tale${a.zona ? ` – ${a.zona}` : ""} | RealTrust`,
      html,
      source: "analysis_report",
    },
    admin,
  );

  await admin
    .from("property_analyses")
    .update({ recipient_email: email, email_sent_at: result.sent ? new Date().toISOString() : null })
    .eq("share_token", token);

  if (!result.sent) {
    return json(
      { error: "send_failed", message: "Nu am putut trimite e-mailul. Raportul rămâne disponibil pe link.", stored: result.storedFallback ?? false },
      502,
    );
  }

  return json({ ok: true, share_url: shareUrl });
});
