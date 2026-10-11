// Training Lab: Andrei vs un proprietar simulat de Gemini (doar text, fără apeluri reale),
// analiză post-apel și aplicarea opțională a lecțiilor în contextul lui Andrei.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { andreiConversationPolicy } from "../_shared/andreiConversationPolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PERSONAS: Record<string, string> = {
  sceptic: "Proprietar sceptic, crede că e o agenție care vrea comision. Pune întrebări bănuitoare, cere dovezi, nu se lasă ușor convins.",
  grabit: "Proprietar foarte grăbit, la volan sau la muncă. Răspunde monosilabic, spune des „n-am timp”, vrea doar esențialul.",
  negociator: "Proprietar care vinde un apartament de 2 camere în Iosefin la 95.000 €. Nu vrea să scadă prețul, negociază dur, întreabă ce câștigă.",
  garsoniera: "Proprietar al unei garsoniere de 28 m² în zona Aradului, la prima vânzare, nesigur, cere explicații simple despre pași și costuri.",
};
const OPENING = "Bună ziua, sunt Andrei, asistent AI RealTrust Timișoara. Vă sun despre anunțul dumneavoastră de vânzare. Aveți un minut?";

async function ai(messages: any[], key: string, opts: Record<string, unknown> = {}) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, ...opts }),
  });
  if (!r.ok) {
    const t = await r.text();
    const err: any = new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return json({ error: "LOVABLE_API_KEY lipsește" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    if (body.action === "apply") {
      const lessons = (Array.isArray(body.lessons) ? body.lessons : [])
        .map((l: unknown) => String(l ?? "").trim()).filter((l: string) => l.length >= 10 && l.length <= 400).slice(0, 5);
      if (!lessons.length) return json({ error: "Nicio sugestie validă de aplicat" }, 400);
      const { error } = await supabase.from("voice_agent_playbook_addendum").insert(lessons.map((lesson: string) => ({
        lesson, severity: "warning", is_active: true, auto_applied: true, applied_at: new Date().toISOString(),
        profile_summary: `Training Lab · ${String(body.persona || "").slice(0, 40)}`,
      })));
      if (error) return json({ error: error.message }, 500);
      return json({ applied: lessons.length });
    }

    const persona = String(body.persona || "");
    if (!PERSONAS[persona]) return json({ error: "Profil necunoscut" }, 400);
    const turns = Math.min(8, Math.max(3, Number(body.turns) || 6));

    const { data: script } = await supabase.from("voice_agent_scripts").select("system_prompt").eq("is_active", true).maybeSingle();
    const { data: lessons } = await supabase.from("voice_agent_playbook_addendum").select("lesson").eq("is_active", true)
      .order("created_at", { ascending: false }).limit(5);
    const andreiPrompt = (script?.system_prompt || "Ești Andrei, asistent AI imobiliar RealTrust Timișoara.") +
      (lessons?.length ? "\n\nLecții active:\n" + lessons.map((l: any) => `- ${l.lesson}`).join("\n") : "") +
      "\n\n" + andreiConversationPolicy("vanzare") +
      "\n\nEști la telefon. Răspunzi cu O singură replică scurtă, fără etichete sau ghilimele.";
    const ownerPrompt = `Joci rolul unui proprietar din Timișoara sunat de un asistent AI imobiliar. ${PERSONAS[persona]}
Vorbești natural, în română, ca la telefon: o replică scurtă (max 25 de cuvinte), fără etichete. Ridică obiecții realiste. Dacă ești convins, poți accepta analiza gratuită; dacă te enervează, poți spune STOP.`;

    const transcript: { role: "andrei" | "proprietar"; text: string }[] = [{ role: "andrei", text: OPENING }];
    for (let i = 0; i < turns; i++) {
      const owner = await ai([{ role: "system", content: ownerPrompt },
        ...transcript.map((t) => ({ role: t.role === "andrei" ? "user" : "assistant", content: t.text }))], KEY, { temperature: 0.9 });
      transcript.push({ role: "proprietar", text: owner || "..." });
      if (/\bstop\b|nu mă mai sunați|la revedere/i.test(owner)) {
        transcript.push({ role: "andrei", text: "Am înțeles. Nu vă mai rețin. O zi bună!" });
        break;
      }
      const andrei = await ai([{ role: "system", content: andreiPrompt },
        ...transcript.map((t) => ({ role: t.role === "andrei" ? "assistant" : "user", content: t.text }))], KEY, { temperature: 0.4 });
      transcript.push({ role: "andrei", text: andrei || "..." });
      if (/o zi bună|la revedere/i.test(andrei)) break;
    }

    const convo = transcript.map((t) => `${t.role === "andrei" ? "Andrei" : "Proprietar"}: ${t.text}`).join("\n");
    const raw = await ai([
      { role: "system", content: "Ești coach sever de vânzări imobiliare telefonice. Răspunzi doar JSON valid." },
      { role: "user", content: `Analizează performanța lui Andrei (asistent AI RealTrust Timișoara) în conversația de mai jos. Criterii: replici scurte, nu se repetă, avansează (obiectiv → termen → preț → acord pentru analiză), tratează obiecțiile, transparență, fără informații inventate.
Profil proprietar: ${persona}.

${convo}

Răspunde STRICT JSON: {"score": 1-10, "strengths": ["..."], "weaknesses": ["..."], "objections": [{"objection": "...", "handled": true|false, "comment": "..."}], "prompt_fixes": ["regulă concretă, imperativă, max 200 caractere, pentru promptul lui Andrei"]}` },
    ], KEY, { temperature: 0.2 });
    const m = raw.match(/\{[\s\S]*\}/);
    let analysis: any = null;
    try { analysis = m ? JSON.parse(m[0]) : null; } catch { analysis = null; }
    if (!analysis) return json({ transcript, analysis: null, error: "Analiza nu a putut fi citită" });
    analysis.score = Math.max(1, Math.min(10, Math.round(Number(analysis.score) || 1)));
    for (const k of ["strengths", "weaknesses", "prompt_fixes"]) analysis[k] = (Array.isArray(analysis[k]) ? analysis[k] : []).map(String).slice(0, 6);
    analysis.objections = (Array.isArray(analysis.objections) ? analysis.objections : []).slice(0, 8);
    return json({ transcript, analysis });
  } catch (e: any) {
    const status = e?.status === 429 || e?.status === 402 ? e.status : 500;
    const msg = status === 429 ? "Prea multe cereri AI, încearcă peste un minut." : status === 402 ? "Credite AI insuficiente." : e.message;
    return json({ error: msg }, status);
  }
});
