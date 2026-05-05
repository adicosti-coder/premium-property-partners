// Computes daily KPI snapshot for Andrei's real calls.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const KNOWN_OBJECTIONS = [
  "comision","pret prea mare","preț prea mare","deja contractat","nu vrea regim hotelier",
  "nu are timp","nu este proprietar","vrea doar long-term","neincredere","neîncredere",
];

function sentimentToNum(s: string | null): number | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (/foarte\s+pozitiv|entuziast/.test(t)) return 9;
  if (/pozitiv|interesat/.test(t)) return 7;
  if (/neutr/.test(t)) return 5;
  if (/foarte\s+negativ|ostil/.test(t)) return 1;
  if (/negativ|refuz|sceptic/.test(t)) return 3;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const day = body.day || new Date().toISOString().slice(0, 10);
    const start = `${day}T00:00:00Z`;
    const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString();

    const { data: rows } = await supabase.from("voice_call_sessions")
      .select("id, status, ai_outcome, ai_sentiment, ai_summary, transcript, appointment_scheduled_at")
      .gte("created_at", start).lt("created_at", end);

    const total = rows?.length || 0;
    const scheduled = (rows || []).filter((r: any) => r.ai_outcome === "scheduled" || !!r.appointment_scheduled_at).length;
    const successRate = total ? Math.round((scheduled / total) * 10000) / 100 : 0;
    const senNums = (rows || []).map((r: any) => sentimentToNum(r.ai_sentiment)).filter((n: any) => n !== null) as number[];
    const sentimentAvg = senNums.length ? Math.round((senNums.reduce((a, b) => a + b, 0) / senNums.length) * 100) / 100 : null;

    const counter = new Map<string, number>();
    (rows || []).forEach((r: any) => {
      const blob = `${r.ai_summary || ""} ${r.ai_sentiment || ""} ${typeof r.transcript === "string" ? r.transcript : JSON.stringify(r.transcript || "")}`.toLowerCase();
      KNOWN_OBJECTIONS.forEach((k) => { if (blob.includes(k)) counter.set(k, (counter.get(k) || 0) + 1); });
    });
    const topObjections = Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ key: k, count: v }));

    // drift vs prev day
    const prevDay = new Date(new Date(day).getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: prev } = await supabase.from("voice_agent_kpi_snapshots").select("success_rate").eq("day", prevDay).maybeSingle();
    const drift = prev?.success_rate != null ? Math.round((successRate - Number(prev.success_rate)) * 100) / 100 : null;

    await supabase.from("voice_agent_kpi_snapshots").upsert({
      day, total_calls: total, scheduled, success_rate: successRate,
      sentiment_avg: sentimentAvg, top_objections: topObjections, drift_vs_prev: drift,
      computed_at: new Date().toISOString(),
    });

    return json({ day, total_calls: total, scheduled, success_rate: successRate, sentiment_avg: sentimentAvg, top_objections: topObjections, drift_vs_prev: drift });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
