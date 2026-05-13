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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const days = Number(body?.days ?? 7);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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
