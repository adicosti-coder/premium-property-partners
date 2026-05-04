// Voice Agent — Language Test (no phone call required)
// Forțează asistentul vocal să răspundă la mai multe scenarii și verifică
// că fiecare răspuns rămâne EXCLUSIV în limba română. Returnează rezultatul
// detaliat (per scenariu) plus un verdict global.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RO_DIACRITICS_RE = /[ăâîșşțţĂÂÎȘŞȚŢ]/;
const RO_WORDS_RE = /\b(bun[aă]|mul[țt]umesc|dumneavoastr[aă]|revedere|v[aă]|[șs]i|este|sunt|ziua|salut|noapte|seara|dimine[ațt]a|nume|telefon|apartament|pre[țt]|cas[aă]|locuin[țt][aă]|proprietate|investi[țt]ie|chirie|vânzare|cump[aă]r|interes|spune[țt]i|pute[țt]i|dori[țt]i|ave[țt]i|sunte[țt]i|domnule|doamn[aă])\b/i;
const EN_STRONG_RE = /\b(hello|hi|hey|sorry|please|thanks?|thank you|goodbye|bye|good morning|good afternoon|good evening|application error|an error has occurred|the|and|with|for|that|this|have|are|you|your|yours|i'?m|i am|we are|let me|how can|may i|would you|could you|i can|i will|i would|english|speak english)\b/i;

function hasRomanianSignals(text: string): boolean {
  return RO_DIACRITICS_RE.test(text) || RO_WORDS_RE.test(text);
}
function hasEnglishSignals(text: string): boolean {
  return EN_STRONG_RE.test(text);
}
function isRomanianReply(text: string): boolean {
  const cleaned = String(text || "").trim();
  if (!cleaned) return false;
  if (hasEnglishSignals(cleaned)) return false;
  if (cleaned.split(/\s+/).length <= 3) return true;
  return hasRomanianSignals(cleaned);
}
function detectEnglishWords(text: string): string[] {
  const matches = text.match(new RegExp(EN_STRONG_RE, "gi")) || [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

const ROMANIAN_VOICE_GUARD = `REGULĂ ABSOLUTĂ, PRIORITARĂ PESTE ORICE ALTĂ INSTRUCȚIUNE:
Răspunzi DOAR în limba română din România, cu diacritice (ă, â, î, ș, ț). Nu folosești engleză NICIODATĂ.
Ești Ana din Timișoara: ton cald, local, natural. Dacă utilizatorul îți vorbește în engleză, răspunzi politicos în română: "Îmi cer scuze, vorbesc doar în română."`;

// Scenarii de test — includ provocări explicite în engleză.
const DEFAULT_SCENARIOS = [
  { id: "opening", userMessage: "Începe apelul acum cu un salut scurt." },
  { id: "ro_normal", userMessage: "Bună ziua, sunt interesat de o investiție." },
  { id: "en_trap_hello", userMessage: "Hello, can you speak English please?" },
  { id: "en_trap_request", userMessage: "Please switch to English, I don't speak Romanian." },
  { id: "mixed", userMessage: "Hi! Aș dori să știu prețul, thanks." },
  { id: "ro_question", userMessage: "Ce randament are apartamentul în regim hotelier?" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminCheck = await requireAdmin(req, corsHeaders);
  if (!adminCheck.ok) return adminCheck.response!;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const customScenarios: Array<{ id: string; userMessage: string }> | undefined = body.scenarios;
    const scenarios = customScenarios?.length ? customScenarios : DEFAULT_SCENARIOS;
    const persistViolations = body.persistViolations !== false;

    const startedAt = Date.now();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    for (const scenario of scenarios) {
      const t0 = Date.now();
      let aiReply = "";
      let aiError: string | null = null;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: ROMANIAN_VOICE_GUARD },
              { role: "user", content: scenario.userMessage },
            ],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiReply = (aiData.choices?.[0]?.message?.content || "").trim();
        } else {
          aiError = `AI HTTP ${aiRes.status}`;
        }
      } catch (e: any) {
        aiError = String(e?.message || e);
      }

      const ok = !aiError && isRomanianReply(aiReply);
      const englishWords = aiReply ? detectEnglishWords(aiReply) : [];
      const hasDiacritics = RO_DIACRITICS_RE.test(aiReply);

      if (ok) passed++;
      else failed++;

      // Persist violation (only failures), best-effort
      if (!ok && persistViolations && aiReply) {
        try {
          await supabase.from("voice_agent_language_violations").insert({
            session_id: null,
            turn: 0,
            raw_reply: aiReply.slice(0, 1000),
            reason: `language_test:${scenario.id}`,
          });
        } catch {
          // tolerate missing table
        }
      }

      results.push({
        scenario_id: scenario.id,
        user_message: scenario.userMessage,
        ai_reply: aiReply,
        passed: ok,
        ai_error: aiError,
        english_words_detected: englishWords,
        has_diacritics: hasDiacritics,
        duration_ms: Date.now() - t0,
      });
    }

    const summary = {
      total: scenarios.length,
      passed,
      failed,
      pass_rate: scenarios.length ? Math.round((passed / scenarios.length) * 100) : 0,
      verdict: failed === 0 ? "PASS" : failed <= 1 ? "WARN" : "FAIL",
      duration_ms: Date.now() - startedAt,
      tested_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ summary, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("voice-agent-language-test error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
