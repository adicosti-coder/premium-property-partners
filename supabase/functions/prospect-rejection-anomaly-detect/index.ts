// Detector de anomalii pe pipeline-ul de respingeri prospect_listings.
// Rulat manual din UI sau periodic (cron). Inserează în prospect_rejection_alerts.
// Reguli deterministice (fără cost LLM):
//  - SPIKE per platformă: a doua jumătate a perioadei >= 1.5x prima jumătate, min 5 absolut
//  - DOMINANCE: o platformă produce >= 70% din respingerile unui motiv (min 10 absolut)
//  - SURGE_TOTAL: total perioadă >= 2x media bazei (min 20 absolut)

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PlatformRow { rejection_reason: string; source_platform: string; count_period: number; }
interface TrendRow { day_label: string; rejection_reason: string; count: number; }

type Alert = {
  severity: "info" | "warning" | "critical";
  category: string;
  source_platform: string | null;
  rejection_reason: string | null;
  title: string;
  message: string;
  metric: Record<string, unknown>;
  signature: string;
};

interface AlertSettings {
  recipient_emails: string[];
  recipient_phones: string[];
  dominance_warning_ratio: number;
  dominance_critical_ratio: number;
  dominance_min_total: number;
  spike_warning_ratio: number;
  spike_critical_ratio: number;
  spike_min_count: number;
  surge_threshold: number;
  sms_min_severity: "warning" | "critical";
  email_min_severity: "info" | "warning" | "critical";
  notifications_enabled: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  recipient_emails: [],
  recipient_phones: [],
  dominance_warning_ratio: 0.7,
  dominance_critical_ratio: 0.85,
  dominance_min_total: 10,
  spike_warning_ratio: 1.5,
  spike_critical_ratio: 3.0,
  spike_min_count: 5,
  surge_threshold: 50,
  sms_min_severity: "critical",
  email_min_severity: "warning",
  notifications_enabled: true,
};

const SEV_RANK: Record<string, number> = { info: 0, warning: 1, critical: 2 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const days = Number(body?.days ?? 7);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load settings (fallback to defaults; env emails/phones still supported as fallback)
    const { data: settingsRow } = await supabase
      .from("prospect_alert_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const settings: AlertSettings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) };

    const [platformRes, trendRes] = await Promise.all([
      supabase.rpc("get_prospect_injection_rejection_by_platform", { p_days: days }),
      supabase.rpc("get_prospect_injection_rejection_trend", { p_days: days }),
    ]);

    if (platformRes.error) throw new Error("platform: " + platformRes.error.message);
    if (trendRes.error) throw new Error("trend: " + trendRes.error.message);

    const byPlatform = (platformRes.data ?? []) as PlatformRow[];
    const trend = (trendRes.data ?? []) as TrendRow[];

    const alerts: Alert[] = [];

    // ====== 1) DOMINANCE per (motiv × platformă) ======
    const totalByReason: Record<string, number> = {};
    const byReasonPlatform: Record<string, Record<string, number>> = {};
    for (const r of byPlatform) {
      totalByReason[r.rejection_reason] = (totalByReason[r.rejection_reason] || 0) + Number(r.count_period || 0);
      (byReasonPlatform[r.rejection_reason] ||= {})[r.source_platform] =
        (byReasonPlatform[r.rejection_reason]?.[r.source_platform] || 0) + Number(r.count_period || 0);
    }
    for (const reason of Object.keys(byReasonPlatform)) {
      const total = totalByReason[reason] || 0;
      if (total < 10) continue;
      for (const [platform, cnt] of Object.entries(byReasonPlatform[reason])) {
        const ratio = cnt / total;
        if (ratio >= 0.7) {
          const pct = Math.round(ratio * 100);
          alerts.push({
            severity: ratio >= 0.85 ? "critical" : "warning",
            category: "dominance",
            source_platform: platform,
            rejection_reason: reason,
            title: `Sursa „${platform}" produce ${pct}% din respingeri „${reason}"`,
            message: `În ultimele ${days} zile, ${cnt} din ${total} respingeri „${reason}" provin de la ${platform}. Recomandare: revizuiește scraper-ul pentru ${platform} (regex telefon, exclude pagini agenții, filtre listing).`,
            metric: { ratio, count: cnt, total, days },
            signature: `dominance:${reason}:${platform}:d${days}`,
          });
        }
      }
    }

    // ====== 2) SPIKE per platformă (prima vs a doua jumătate) ======
    // Trend e per (zi × motiv); facem split în două ferestre după dayLabels sortate.
    const sortedDays = Array.from(new Set(trend.map((t) => t.day_label))).sort();
    if (sortedDays.length >= 4) {
      const mid = Math.floor(sortedDays.length / 2);
      const firstHalf = new Set(sortedDays.slice(0, mid));
      // Re-agregăm trend pe (motiv) pentru ferestre — nu avem platform în trend, deci facem doar SPIKE per motiv.
      const halfStats: Record<string, { a: number; b: number }> = {};
      for (const t of trend) {
        const slot = (halfStats[t.rejection_reason] ||= { a: 0, b: 0 });
        if (firstHalf.has(t.day_label)) slot.a += Number(t.count || 0);
        else slot.b += Number(t.count || 0);
      }
      for (const [reason, s] of Object.entries(halfStats)) {
        if (s.b < 5) continue;
        const baseline = Math.max(1, s.a);
        const ratio = s.b / baseline;
        if (ratio >= 1.5) {
          const growth = Math.round((ratio - 1) * 100);
          const sev: Alert["severity"] = ratio >= 3 ? "critical" : ratio >= 2 ? "warning" : "info";
          alerts.push({
            severity: sev,
            category: "spike_reason",
            source_platform: null,
            rejection_reason: reason,
            title: `Creștere +${growth}% a respingerilor „${reason}"`,
            message: `În a doua jumătate a perioadei (${days} zile) am văzut ${s.b} respingeri „${reason}", față de ${s.a} în prima jumătate. Verifică sursele scraper și calitatea numerelor extrase.`,
            metric: { first_half: s.a, second_half: s.b, ratio, days },
            signature: `spike_reason:${reason}:d${days}`,
          });
        }
      }
    }

    // ====== 3) SURGE total (volum total mare) ======
    const grandTotal = Object.values(totalByReason).reduce((a, b) => a + b, 0);
    if (grandTotal >= 50) {
      // pseudo-baseline: ~7-day rolling — folosim direct un threshold absolut configurabil
      const threshold = 50;
      if (grandTotal >= threshold * 2) {
        alerts.push({
          severity: "warning",
          category: "surge_total",
          source_platform: null,
          rejection_reason: null,
          title: `Volum mare de respingeri: ${grandTotal} în ${days} zile`,
          message: `Pipeline-ul a respins ${grandTotal} anunțuri în ultimele ${days} zile (peste pragul de ${threshold * 2}). Posibilă regresie la un scraper sau o sursă nouă cu calitate slabă.`,
          metric: { total: grandTotal, threshold, days },
          signature: `surge_total:d${days}`,
        });
      }
    }

    // ====== Inserare cu deduplicare (UNIQUE WHERE status='open') ======
    const shouldNotify = body?.notify !== false; // default true
    const newlyInserted: Array<Alert & { id: string }> = [];
    let inserted = 0;
    let skipped = 0;
    for (const a of alerts) {
      const { data, error } = await supabase
        .from("prospect_rejection_alerts")
        .insert({
          severity: a.severity,
          category: a.category,
          source_platform: a.source_platform,
          rejection_reason: a.rejection_reason,
          title: a.title,
          message: a.message,
          metric: a.metric,
          signature: a.signature,
        })
        .select("id")
        .single();
      if (error) {
        if ((error as any).code === "23505") skipped++;
        else console.error("insert alert err:", error.message);
      } else {
        inserted++;
        if (data?.id) newlyInserted.push({ ...a, id: data.id });
      }
    }

    // ====== Notificări email/SMS pentru alerte warning/critical ======
    let notifiedCount = 0;
    const notifyResults: Array<{ id: string; channels: string[]; error?: string }> = [];
    if (shouldNotify) {
      const toNotify = newlyInserted.filter((a) => a.severity === "warning" || a.severity === "critical");
      for (const a of toNotify) {
        const result = await sendAlertNotification(a);
        notifyResults.push({ id: a.id, ...result });
        await supabase
          .from("prospect_rejection_alerts")
          .update({
            notified_at: new Date().toISOString(),
            notification_channels: result.channels,
            notification_error: result.error ?? null,
          })
          .eq("id", a.id);
        if (result.channels.length > 0) notifiedCount++;
      }
    }

    return new Response(JSON.stringify({
      detected: alerts.length,
      inserted,
      skipped_duplicates: skipped,
      notified: notifiedCount,
      notify_results: notifyResults,
      alerts,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("anomaly-detect error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// Notification helpers (email via Resend, SMS via Twilio gateway)
// ============================================================================

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟠",
  info: "🔵",
};

async function sendAlertNotification(a: Alert & { id: string }): Promise<{ channels: string[]; error?: string }> {
  const channels: string[] = [];
  const errors: string[] = [];

  const adminEmail = Deno.env.get("ADMIN_ALERT_EMAIL");
  const adminPhone = Deno.env.get("ADMIN_ALERT_PHONE");

  // ---- Email via Resend ----
  if (adminEmail) {
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
      const emoji = SEVERITY_EMOJI[a.severity] ?? "⚠️";
      const subject = `${emoji} [${a.severity.toUpperCase()}] Anomalie scraper: ${a.title}`;
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 8px">${emoji} Anomalie detectată — severitate ${a.severity.toUpperCase()}</h2>
          <p style="margin:0 0 16px;color:#555">Pipeline-ul de respingere a generat o alertă nouă.</p>
          <div style="background:#f7f7f8;border-left:4px solid ${a.severity === "critical" ? "#dc2626" : "#f59e0b"};padding:16px;border-radius:6px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-weight:600;font-size:16px">${a.title}</p>
            <p style="margin:0;color:#374151;line-height:1.5">${a.message}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
            <tr><td style="padding:6px 0;color:#6b7280">Categorie</td><td style="padding:6px 0;font-family:monospace">${a.category}</td></tr>
            ${a.source_platform ? `<tr><td style="padding:6px 0;color:#6b7280">Sursă</td><td style="padding:6px 0;font-family:monospace">${a.source_platform}</td></tr>` : ""}
            ${a.rejection_reason ? `<tr><td style="padding:6px 0;color:#6b7280">Motiv</td><td style="padding:6px 0;font-family:monospace">${a.rejection_reason}</td></tr>` : ""}
            <tr><td style="padding:6px 0;color:#6b7280">Metrici</td><td style="padding:6px 0;font-family:monospace;font-size:12px">${escapeHtml(JSON.stringify(a.metric))}</td></tr>
          </table>
          <a href="https://realtrust.ro/admin?tab=prospect-manager" style="display:inline-block;background:#0f1b3d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Deschide dashboard</a>
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "RealTrust Alerts <alerts@notify.realtrust.ro>",
          to: [adminEmail],
          subject,
          html,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Resend ${r.status}: ${t.slice(0, 200)}`);
      }
      channels.push("email");
    } catch (e) {
      errors.push("email:" + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ---- SMS via Twilio (only for critical, to avoid noise/cost) ----
  if (adminPhone && a.severity === "critical") {
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
      const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
      if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY missing");
      if (!TWILIO_FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER missing");
      const smsBody = `🔴 RealTrust CRITICAL: ${a.title}. ${a.message.slice(0, 200)}`.slice(0, 400);
      const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: adminPhone,
          From: TWILIO_FROM_NUMBER,
          Body: smsBody,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Twilio ${r.status}: ${t.slice(0, 200)}`);
      }
      channels.push("sms");
    } catch (e) {
      errors.push("sms:" + (e instanceof Error ? e.message : String(e)));
    }
  }

  return { channels, error: errors.length ? errors.join(" | ") : undefined };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
