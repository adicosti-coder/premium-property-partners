/**
 * Weekly conversion & lead-attribution report.
 *
 * Auth: internal cron (x-cron-secret / x-webhook-secret) OR an admin JWT.
 * Sources data from the `get_conversion_attribution_report` RPC and emails
 * a digest to the marketing inbox. Admin callers may skip the email and just
 * read the JSON (used by the Admin panel).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const REPORT_TO = ["contact@realtrust.ro"];
const FROM = "RealTrust <info@notify.realtrust.ro>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ChannelRow {
  channel: string;
  leads: number;
  hot_leads: number;
  avg_score: number | null;
  campaigns: string[] | null;
}

interface Report {
  period_days: number;
  from: string;
  to: string;
  total_leads: number;
  hot_leads: number;
  avg_score: number | null;
  previous_period_leads: number;
  cta_sessions: number;
  conversion_rate: number | null;
  by_channel: ChannelRow[];
  by_cta_variant: Array<{ variant: string; leads: number }>;
  by_landing_path: Array<{ landing_path: string; leads: number }>;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string
  );

const buildHtml = (r: Report): string => {
  const delta = r.total_leads - r.previous_period_leads;
  const trend = delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`;
  const rows = r.by_channel
    .map(
      (c) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(c.channel)}${
        c.campaigns?.length ? `<br><span style="color:#888;font-size:11px">${esc(c.campaigns.join(", "))}</span>` : ""
      }</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${c.leads}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${c.hot_leads}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${c.avg_score ?? "—"}</td>
      </tr>`,
    )
    .join("");

  const variants = r.by_cta_variant
    .map((v) => `${esc(v.variant)}: <strong>${v.leads}</strong>`)
    .join(" · ");

  return `<!doctype html><html lang="ro"><body style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#f7f7f8;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 4px">Raport conversii — ultimele ${r.period_days} zile</h1>
      <p style="color:#666;font-size:12px;margin:0 0 20px">${esc(r.from.slice(0, 10))} → ${esc(r.to.slice(0, 10))}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:12px;background:#f4f6fb;border-radius:8px">
            <div style="font-size:22px;font-weight:700">${r.total_leads}</div>
            <div style="font-size:11px;color:#666">lead-uri (${trend} vs perioada anterioară)</div>
          </td>
          <td style="width:8px"></td>
          <td style="padding:12px;background:#f4f6fb;border-radius:8px">
            <div style="font-size:22px;font-weight:700">${r.hot_leads}</div>
            <div style="font-size:11px;color:#666">lead-uri fierbinți (scor ≥ 60)</div>
          </td>
          <td style="width:8px"></td>
          <td style="padding:12px;background:#f4f6fb;border-radius:8px">
            <div style="font-size:22px;font-weight:700">${r.conversion_rate ?? "—"}%</div>
            <div style="font-size:11px;color:#666">rata de conversie formulare</div>
          </td>
        </tr>
      </table>

      <h2 style="font-size:14px;margin:0 0 8px">Lead-uri după sursă</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;color:#666;font-size:11px;text-transform:uppercase">
          <th style="padding:8px">Canal</th><th style="padding:8px;text-align:right">Lead-uri</th>
          <th style="padding:8px;text-align:right">Fierbinți</th><th style="padding:8px;text-align:right">Scor mediu</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" style="padding:12px;color:#888">Fără lead-uri în perioadă.</td></tr>`}</tbody>
      </table>

      ${variants ? `<p style="font-size:12px;color:#444;margin-top:16px">Variante CTA — ${variants}</p>` : ""}
      <p style="font-size:12px;color:#666;margin-top:20px">
        Sesiuni cu interacțiune CTA: ${r.cta_sessions}.
        <a href="https://realtrust.ro/admin?tab=conversion-report" style="color:#1a56db">Deschide raportul în Admin</a>
      </p>
    </div>
  </body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const internal = await isInternalCall(req);
    let isAdmin = false;
    if (!internal) {
      const auth = await requireAdmin(req);
      if (!auth.ok) return json({ error: "Unauthorized" }, 401);
      isAdmin = true;
    }

    const url = new URL(req.url);
    let days = Number(url.searchParams.get("days") ?? 7);
    let sendEmail = internal; // cron always emails; admin only on request
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Number.isFinite(Number(body?.days))) days = Number(body.days);
        if (typeof body?.send_email === "boolean") sendEmail = body.send_email;
      } catch { /* empty body is fine */ }
    }
    if (!Number.isFinite(days) || days < 1 || days > 90) days = 7;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase.rpc("get_conversion_attribution_report", { p_days: days });
    if (error) {
      console.error("[weekly-conversion-report] rpc failed:", error.message);
      return json({ error: "Report query failed", details: error.message }, 500);
    }
    const report = data as Report;

    let emailed: string | null = null;
    if (sendEmail) {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) {
        emailed = "skipped_no_resend_key";
      } else {
        try {
          const resend = new Resend(key);
          const res = await resend.emails.send({
            from: FROM,
            to: REPORT_TO,
            subject: `Raport conversii RealTrust — ${report.total_leads} lead-uri în ${report.period_days} zile`,
            html: buildHtml(report),
          });
          emailed = res.error ? `failed: ${res.error.message}` : "sent";
        } catch (err) {
          emailed = `failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }

    return json({ ok: true, caller: internal ? "cron" : isAdmin ? "admin" : "unknown", emailed, report });
  } catch (err) {
    console.error("[weekly-conversion-report] error:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
