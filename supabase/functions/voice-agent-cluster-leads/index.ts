// Smart Clusters: groups scraper leads via Gemini, generates per-cluster brief.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit ?? 80), 200);
    const minScore = Number(body?.min_score ?? 40);

    const { data: leads, error } = await supabase
      .from("prospect_listings")
      .select("id, title, zone, lead_score, category, description, prospect_type, lifecycle_status, contact_phone")
      .gte("lead_score", minScore)
      .eq("is_active", true)
      .in("lifecycle_status", ["new", "scoring", "calling", "interested", "callback"])
      .not("contact_phone", "is", null)
      .order("lead_score", { ascending: false })
      .limit(limit);
    if (error) return json({ error: error.message }, 500);
    if (!leads?.length) return json({ clusters: [], message: "no_leads" });

    const compact = leads.map((l: any) => ({
      id: l.id, t: (l.title || "").slice(0, 80),
      z: l.zone || "", s: l.lead_score, c: l.category, p: l.prospect_type,
      d: (l.description || "").slice(0, 160),
    }));

    const prompt = `Ești strateg vânzări imobiliare Timișoara. Analizează aceste ${compact.length} lead-uri și grupează-le în 3-6 clustere de abordare distinctă (ex: "Proprietari sceptici Aradului", "Investitori lichiditate mare", "Urgențe vânzare", "Long-term doar").

Lead-uri (JSON):
${JSON.stringify(compact)}

Răspunde STRICT cu JSON: {"clusters":[{"label":"...","brief":"2-3 fraze pentru Andrei despre cum să abordeze","approach_tone":"empatic|direct|consultativ","lead_ids":["uuid1","uuid2"]}]}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Răspunzi doar JSON valid, fără markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return json({ error: "rate_limit" }, 429);
      if (r.status === 402) return json({ error: "credit_exhausted" }, 402);
      return json({ error: `ai_${r.status}` }, 500);
    }
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "parse_failed", raw: raw.slice(0, 200) }, 500);
    const parsed = JSON.parse(m[0]);
    const clusters = Array.isArray(parsed.clusters) ? parsed.clusters : [];

    // Replace previous active clusters
    await supabase.from("voice_lead_clusters").update({ is_active: false }).eq("is_active", true);

    const inserted: any[] = [];
    for (const c of clusters) {
      const { data: row } = await supabase.from("voice_lead_clusters").insert({
        label: String(c.label || "Cluster").slice(0, 120),
        brief: String(c.brief || "").slice(0, 800),
        approach_tone: String(c.approach_tone || "consultativ").slice(0, 40),
        criteria: { source: "ai_auto", min_score: minScore },
        lead_count: Array.isArray(c.lead_ids) ? c.lead_ids.length : 0,
      }).select("*").single();
      if (row) {
        const ids = Array.isArray(c.lead_ids) ? c.lead_ids.filter((x: any) => typeof x === "string") : [];
        if (ids.length) {
          await supabase.from("voice_lead_cluster_assignments").insert(
            ids.map((pid: string) => ({ cluster_id: row.id, prospect_id: pid })),
          );
        }
        inserted.push(row);
      }
    }
    return json({ clusters: inserted, total_leads: leads.length });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
