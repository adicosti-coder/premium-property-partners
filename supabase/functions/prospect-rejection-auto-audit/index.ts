// Auto-Audit pentru respingeri prospect_listings
// Agregă datele de drill-down și cere LLM (Lovable AI / Gemini) un rezumat
// + recomandări acționabile (tipare per platformă, trend, soluții).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const days: number = Number(body?.days ?? 7);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [summaryRes, platformRes, trendRes] = await Promise.all([
      supabase.rpc("get_prospect_injection_rejection_summary", { p_days: days }),
      supabase.rpc("get_prospect_injection_rejection_by_platform", { p_days: days }),
      supabase.rpc("get_prospect_injection_rejection_trend", { p_days: days }),
    ]);

    if (summaryRes.error) throw new Error("summary: " + summaryRes.error.message);

    const summary = summaryRes.data ?? [];
    const byPlatform = platformRes.data ?? [];
    const trend = trendRes.data ?? [];

    // Calcul rapid de pattern-uri pentru context (ajută LLM-ul)
    const platformTotals: Record<string, number> = {};
    const byReasonPlatform: Record<string, Record<string, number>> = {};
    for (const r of byPlatform as any[]) {
      platformTotals[r.source_platform] = (platformTotals[r.source_platform] || 0) + Number(r.count_period || 0);
      (byReasonPlatform[r.rejection_reason] ||= {})[r.source_platform] =
        (byReasonPlatform[r.rejection_reason]?.[r.source_platform] || 0) + Number(r.count_period || 0);
    }

    // Trend: comparăm prima jumătate vs a doua jumătate
    const trendByReasonHalf: Record<string, { firstHalf: number; secondHalf: number }> = {};
    if (trend.length > 0) {
      const sorted = [...(trend as any[])].sort((a, b) =>
        String(a.day_label).localeCompare(String(b.day_label))
      );
      const dayLabels = Array.from(new Set(sorted.map((r) => r.day_label)));
      const mid = Math.floor(dayLabels.length / 2);
      const firstSet = new Set(dayLabels.slice(0, mid));
      for (const r of sorted) {
        const t = (trendByReasonHalf[r.rejection_reason] ||= { firstHalf: 0, secondHalf: 0 });
        if (firstSet.has(r.day_label)) t.firstHalf += Number(r.count || 0);
        else t.secondHalf += Number(r.count || 0);
      }
    }

    const context = {
      period_days: days,
      summary,
      platform_totals: platformTotals,
      by_reason_platform: byReasonPlatform,
      trend_first_vs_second_half: trendByReasonHalf,
    };

    const systemPrompt =
`Ești un analist de date pentru un pipeline de scraping imobiliar din Timișoara.
Primești statistici despre numere/anunțuri respinse automat la injecție în prospect_listings.
Categoriile de respingere: duplicate (cross-platform), landline (fix Twilio), voip, unreachable.

Sarcină:
1) Identifică TIPARE clare (ex: "OLX produce 78% din landline").
2) Detectează TRENDURI (creștere/scădere între prima și a doua jumătate de perioadă).
3) Dă MAX 3 RECOMANDĂRI acționabile (ex: "ajustează regex telefon pe OLX-mobile", "exclude pagini agenții pe Publi24").
4) Tonul: scurt, direct, fără umplutură. Maxim ~180 cuvinte.

Format răspuns Markdown:
### 🔍 Pattern-uri detectate
- ...
### 📈 Trend
- ...
### 🛠️ Recomandări
1. ...`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Date drill-down (JSON):\n```json\n" + JSON.stringify(context, null, 2) + "\n```" },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit AI. Reîncearcă în câteva secunde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credite Lovable AI epuizate. Adaugă credit în Settings → Workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error " + aiRes.status, details: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const audit = aiJson?.choices?.[0]?.message?.content ?? "Fără răspuns de la model.";

    return new Response(JSON.stringify({
      audit,
      context_preview: {
        period_days: days,
        total_rejected: (summary as any[]).reduce((s, r) => s + Number(r.count_period || 0), 0),
        platforms: Object.keys(platformTotals).length,
        generated_at: new Date().toISOString(),
      },
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("auto-audit error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
