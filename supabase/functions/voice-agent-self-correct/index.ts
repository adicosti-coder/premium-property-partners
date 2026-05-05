import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUCCESS = ["scheduled", "viewing_scheduled", "booked", "appointment_set", "success", "programare", "interesat"];
const REJECT = ["rejected", "neinteresat"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const sessionId: string | null = body.session_id || null;

    let lessonInserted: any = null;

    // 1. SELF-CORRECTION: if session was rejected, ask Gemini for a 1-sentence lesson.
    if (sessionId && LOVABLE_API_KEY) {
      const { data: sess } = await supabase
        .from("voice_call_sessions")
        .select("id, ai_outcome, ai_summary, transcript, to_number")
        .eq("id", sessionId)
        .maybeSingle();

      const outcome = (sess?.ai_outcome || "").toLowerCase();
      if (sess && REJECT.includes(outcome)) {
        const turns = Array.isArray(sess.transcript) ? sess.transcript : [];
        const transcriptText = turns.slice(-12).map((t: any) =>
          `${t.role || t.speaker || "?"}: ${t.content || t.text || ""}`
        ).join("\n").slice(0, 4000);

        const prompt = `Apel respins. Analizează transcriptul și scrie EXACT O SINGURĂ FRAZĂ în română (max 200 caractere) cu o "Lecție Învățată" acționabilă pentru AGENTUL VOCAL Andrei la următoarele apeluri — ce să FACĂ DIFERIT (nu ce a greșit). Începe cu un verb la imperativ ("Evită...", "Folosește...", "Începe cu...").

TRANSCRIPT:
${transcriptText}

REZUMAT: ${sess.ai_summary || "(fără rezumat)"}`;

        try {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Ești coach pentru un agent vocal de vânzări imobiliare. Răspunzi cu O SINGURĂ FRAZĂ în română, max 200 caractere, fără ghilimele, fără preambul." },
                { role: "user", content: prompt },
              ],
            }),
          });
          if (r.ok) {
            const d = await r.json();
            let lesson = (d?.choices?.[0]?.message?.content || "").trim().replace(/^["'`]|["'`]$/g, "").slice(0, 240);
            if (lesson.length > 10) {
              const { data: ins } = await supabase
                .from("voice_agent_playbook_addendum")
                .insert({
                  lesson,
                  source_session_id: sessionId,
                  profile_summary: (sess.ai_summary || "").slice(0, 500),
                  severity: "warning",
                })
                .select("id, lesson")
                .single();
              lessonInserted = ins;
            }
          }
        } catch (e) {
          console.error("[self-correct] gemini failed", e);
        }
      }
    }

    // 2. STOP-LOSS: check success rate of last batch (last 24h, real calls only)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("voice_agent_script_test_logs")
      .select("outcome, is_test_call, created_at")
      .gte("created_at", since)
      .eq("is_test_call", false)
      .limit(200);

    const all = recent || [];
    const total = all.length;
    const succ = all.filter((r: any) => SUCCESS.includes((r.outcome || "").toLowerCase())).length;
    const ratePct = total > 0 ? Math.round((succ / total) * 100) : null;

    let safetyTriggered = false;
    if (total >= 5 && ratePct !== null && ratePct < 20) {
      safetyTriggered = true;
      await supabase
        .from("voice_agent_safety_state")
        .update({
          calls_paused: true,
          paused_reason: `Rata de succes ${ratePct}% < 20% (eșantion ${total}). Review necesar.`,
          success_rate_pct: ratePct,
          sample_size: total,
          last_check_at: new Date().toISOString(),
        })
        .eq("id", true);

      // Notify all admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      for (const a of admins || []) {
        await supabase.from("user_notifications").insert({
          user_id: a.user_id,
          title: "⚠️ Review Required — Voice Agent oprit",
          message: `Rata de succes a scăzut la ${ratePct}% (${succ}/${total} apeluri reale în 24h). Apelurile automate sunt oprite. Verifică playbook-ul.`,
          type: "warning",
          action_url: "/admin",
          action_label: "Vezi Voice Agent",
        });
      }
    } else {
      await supabase
        .from("voice_agent_safety_state")
        .update({
          success_rate_pct: ratePct,
          sample_size: total,
          last_check_at: new Date().toISOString(),
        })
        .eq("id", true);
    }

    return json({ ok: true, lesson: lessonInserted, safety: { triggered: safetyTriggered, rate_pct: ratePct, sample: total } });
  } catch (e) {
    console.error("[self-correct] error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
