/**
 * GA4 tracking-drop alert.
 *
 * Compares the two most recent days that have GA4 session data. If sessions
 * dropped by more than the configured threshold (default 50%), an email alert
 * goes out — this catches broken tags, consent regressions or blocked scripts.
 *
 * Auth: internal cron (x-cron-secret / x-webhook-secret) OR an admin JWT.
 * Every run is recorded in `tracking_alert_log` (one row per day).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const FROM = "RealTrust <info@notify.realtrust.ro>";
const ADMIN_URL = "https://realtrust.ro/admin?tab=tracking-alerts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface DayRow { day: string; sessions: number; conversions: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const internal = await isInternalCall(req);
  let isAdmin = false;
  if (!internal) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
    isAdmin = true;
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("tracking_alert_settings")
      .select("enabled, threshold_pct, min_sessions, notify_emails")
      .eq("id", true)
      .maybeSingle();

    const enabled = settings?.enabled ?? true;
    const threshold = settings?.threshold_pct ?? 50;
    const minSessions = settings?.min_sessions ?? 20;
    const recipients: string[] = settings?.notify_emails?.length
      ? settings.notify_emails
      : ["contact@realtrust.ro"];

    const { data: seriesRaw, error: seriesError } = await supabase.rpc("get_ga4_daily_sessions", {
      p_days: 14,
    });
    if (seriesError) throw seriesError;

    const series = (seriesRaw ?? []) as DayRow[];
    if (series.length < 2) {
      return json({ ok: true, status: "insufficient_data", days: series.length });
    }

    const current = series[series.length - 1];
    const previous = series[series.length - 2];
    const dropPct = previous.sessions > 0
      ? Math.round(((previous.sessions - current.sessions) / previous.sessions) * 1000) / 10
      : 0;

    let alerted = false;
    let note = "";
    if (!enabled) {
      note = "alerte dezactivate";
    } else if (previous.sessions < minSessions) {
      note = `volum sub prag (${previous.sessions} < ${minSessions} sesiuni)`;
    } else if (dropPct <= threshold) {
      note = `variație în limite (${dropPct}%)`;
    } else {
      alerted = true;
      note = `scădere ${dropPct}% peste pragul de ${threshold}%`;
    }

    let emailStatus = "not_needed";
    if (alerted) {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) {
        emailStatus = "skipped_no_resend_key";
      } else {
        try {
          const resend = new Resend(key);
          await resend.emails.send({
            from: FROM,
            to: recipients,
            subject: `⚠️ Tracking GA4: scădere de ${dropPct}% a sesiunilor`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px">
                <h2 style="color:#b91c1c;margin:0 0 12px">Alertă tracking GA4</h2>
                <p style="color:#333;line-height:1.5">
                  Sesiunile înregistrate au scăzut cu <strong>${dropPct}%</strong> de la o zi la alta,
                  peste pragul configurat de ${threshold}%.
                </p>
                <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
                  <tr><td style="padding:6px 12px;color:#666">${previous.day}</td><td style="padding:6px 12px"><strong>${previous.sessions}</strong> sesiuni</td></tr>
                  <tr><td style="padding:6px 12px;color:#666">${current.day}</td><td style="padding:6px 12px"><strong>${current.sessions}</strong> sesiuni</td></tr>
                </table>
                <p style="color:#555;font-size:13px">
                  Verifică tag-ul GA4, consimțământul pentru cookie-uri și livrarea Meta CAPI.
                </p>
                <p><a href="${ADMIN_URL}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Deschide panoul de alerte</a></p>
              </div>`,
          });
          emailStatus = "sent";
        } catch (e) {
          console.error("tracking alert email failed", e);
          emailStatus = "failed";
        }
      }
    }

    await supabase.from("tracking_alert_log").upsert({
      checked_on: new Date().toISOString().slice(0, 10),
      current_day: current.day,
      previous_day: previous.day,
      current_sessions: current.sessions,
      previous_sessions: previous.sessions,
      drop_pct: dropPct,
      alerted,
      notified_emails: alerted ? recipients : null,
      note: alerted ? `${note} · email: ${emailStatus}` : note,
    }, { onConflict: "checked_on" });

    return json({
      ok: true,
      caller: internal ? "cron" : isAdmin ? "admin" : "unknown",
      alerted,
      drop_pct: dropPct,
      threshold,
      note,
      email: emailStatus,
      current,
      previous,
    });
  } catch (e) {
    console.error("ga4-tracking-alert failed", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
