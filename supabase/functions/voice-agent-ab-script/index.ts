// A/B Script Test: aggregates multi-metric comparison between two script variants.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const { test_id, action } = body || {};
    if (!test_id) return json({ error: "test_id_required" }, 400);

    const { data: test } = await supabase.from("voice_script_ab_tests").select("*").eq("id", test_id).maybeSingle();
    if (!test) return json({ error: "test_not_found" }, 404);

    if (action === "stop") {
      await supabase.from("voice_script_ab_tests").update({
        status: "finished", ended_at: new Date().toISOString(),
      }).eq("id", test_id);
    }

    // Aggregate metrics from voice_call_sessions joined to scripts via ab_variant
    const since = test.started_at;
    const aId = test.variant_a_script_id;
    const bId = test.variant_b_script_id;

    async function aggregate(scriptId: string | null) {
      if (!scriptId) return { calls: 0, scheduled: 0, success_rate: 0, sentiment_avg: 0, avg_duration: 0, pass_rate: 0 };
      const { data: calls } = await supabase
        .from("voice_call_sessions")
        .select("id, ai_outcome, appointment_scheduled_at, ai_sentiment, ai_summary, call_duration_seconds, status")
        .eq("script_id", scriptId)
        .gte("created_at", since);
      const total = calls?.length || 0;
      const scheduled = (calls || []).filter((c: any) => !!c.appointment_scheduled_at).length;
      let sentSum = 0, sentN = 0, durSum = 0, durN = 0;
      (calls || []).forEach((c: any) => {
        const blob = `${c.ai_sentiment || ""} ${c.ai_summary || ""}`;
        const m = blob.match(/(\d{1,2})\s*\/\s*10/);
        if (m) { sentSum += parseInt(m[1], 10); sentN++; }
        if (c.call_duration_seconds) { durSum += c.call_duration_seconds; durN++; }
      });
      // pass rate from drill runs that referenced this script (approx: latest 50)
      return {
        calls: total,
        scheduled,
        success_rate: total ? Math.round((scheduled / total) * 10000) / 100 : 0,
        sentiment_avg: sentN ? Math.round((sentSum / sentN) * 10) / 10 : 0,
        avg_duration: durN ? Math.round(durSum / durN) : 0,
        pass_rate: 0,
      };
    }

    const [a, b] = await Promise.all([aggregate(aId), aggregate(bId)]);

    // Weighted score (success 50%, sentiment 30%, duration normalized 20%)
    function score(m: any) {
      const dur = Math.min(m.avg_duration, 300) / 300; // 5 min cap
      return m.success_rate * 0.5 + m.sentiment_avg * 3 + dur * 20;
    }
    const sA = score(a), sB = score(b);
    let winner: string | null = null;
    if (Math.abs(sA - sB) < 1) winner = "tie";
    else winner = sA > sB ? "A" : "B";

    const metrics = { variant_a: a, variant_b: b, score_a: Math.round(sA * 10) / 10, score_b: Math.round(sB * 10) / 10, winner };
    await supabase.from("voice_script_ab_tests").update({
      metrics, winner: test.status === "finished" || action === "stop" ? winner : test.winner,
    }).eq("id", test_id);

    return json({ test_id, metrics, winner });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
