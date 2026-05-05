// Drill runner: executes one or more training scenarios against Andrei's prompt
// using Lovable AI Gateway, then judges the response with Gemini.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "google/gemini-2.5-flash";

async function callLovableAI(messages: any[], apiKey: string, model = MODEL) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

function checkKeywords(reply: string, expected: string[], forbidden: string[]) {
  const norm = reply
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
  const expectedHits = expected.filter((k) => norm.includes(k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
  const forbiddenHits = forbidden.filter((k) => norm.includes(k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
  return { expectedHits, forbiddenHits };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const { scenario_ids, category, all, triggered_by } = body || {};

    let q = supabase.from("voice_agent_drill_scenarios").select("*").eq("is_active", true);
    if (Array.isArray(scenario_ids) && scenario_ids.length) q = q.in("id", scenario_ids);
    else if (category) q = q.eq("category", category);
    else if (!all) q = q.limit(5);
    const { data: scenarios, error } = await q;
    if (error) return json({ error: error.message }, 500);
    if (!scenarios?.length) return json({ ran: 0, results: [] });

    // Load Andrei's active system prompt + active lessons
    const { data: script } = await supabase
      .from("voice_agent_scripts")
      .select("system_prompt")
      .eq("is_active", true).maybeSingle();
    const { data: lessons } = await supabase
      .from("voice_agent_playbook_addendum")
      .select("lesson")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(20);
    const systemPrompt = (script?.system_prompt || "Ești Andrei, concierge imobiliar RealTrust Timișoara.") +
      (lessons?.length ? "\n\nLecții active:\n" + lessons.map((l: any) => `- ${l.lesson}`).join("\n") : "");

    const results: any[] = [];
    for (const s of scenarios) {
      const t0 = Date.now();
      let reply = "", judgeNotes = "", score = 0, passed = false;
      try {
        reply = await callLovableAI([
          { role: "system", content: systemPrompt },
          { role: "user", content: s.user_message },
        ], LOVABLE_API_KEY);
        const { expectedHits, forbiddenHits } = checkKeywords(reply, s.expected_keywords || [], s.forbidden_keywords || []);

        // Judge
        const judgePrompt = `Evaluează răspunsul agentului vocal Andrei (concierge imobiliar Timișoara, ton analitic & politicos).
Scenariu: "${s.title}" — categorie: ${s.category}
Întrebare client: "${s.user_message}"
Cuvinte cheie așteptate: ${(s.expected_keywords||[]).join(", ") || "—"}
Cuvinte interzise: ${(s.forbidden_keywords||[]).join(", ") || "—"}

Răspuns Andrei:
"""${reply}"""

Răspunde STRICT în JSON: {"score": 0-100, "passed": true|false, "notes": "max 200 caractere, ce a fost bine/rău"}`;
        const judgeRaw = await callLovableAI([
          { role: "system", content: "Ești judecător sever. Răspunzi doar JSON valid." },
          { role: "user", content: judgePrompt },
        ], LOVABLE_API_KEY, "google/gemini-2.5-flash-lite");
        const m = judgeRaw.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
          passed = !!parsed.passed && forbiddenHits.length === 0;
          judgeNotes = String(parsed.notes || "").slice(0, 400);
        }
        const { data: run } = await supabase.from("voice_agent_drill_runs").insert({
          scenario_id: s.id, ai_reply: reply, passed, score, judge_notes: judgeNotes,
          model: MODEL, duration_ms: Date.now() - t0,
          expected_hits: expectedHits, forbidden_hits: forbiddenHits,
          triggered_by: triggered_by || "manual",
        }).select("id").single();
        results.push({ scenario_id: s.id, title: s.title, passed, score, run_id: run?.id, judge_notes: judgeNotes });
      } catch (e: any) {
        results.push({ scenario_id: s.id, title: s.title, error: e.message });
      }
    }

    // Refresh daily aggregate for today
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayRuns } = await supabase
      .from("voice_agent_drill_runs")
      .select("passed, scenario_id")
      .gte("created_at", `${today}T00:00:00Z`);
    if (todayRuns) {
      const total = todayRuns.length;
      const passed = todayRuns.filter((r: any) => r.passed).length;
      // by category
      const byCat: Record<string, { total: number; passed: number }> = {};
      const ids = Array.from(new Set(todayRuns.map((r: any) => r.scenario_id)));
      const { data: scens } = await supabase.from("voice_agent_drill_scenarios").select("id, category").in("id", ids);
      const catMap = new Map((scens || []).map((s: any) => [s.id, s.category]));
      todayRuns.forEach((r: any) => {
        const c = catMap.get(r.scenario_id) || "other";
        byCat[c] = byCat[c] || { total: 0, passed: 0 };
        byCat[c].total++; if (r.passed) byCat[c].passed++;
      });
      await supabase.from("voice_agent_drill_daily").upsert({
        day: today, total, passed,
        pass_rate: total ? Math.round((passed / total) * 10000) / 100 : 0,
        by_category: byCat, updated_at: new Date().toISOString(),
      });
    }

    return json({ ran: results.length, results });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
