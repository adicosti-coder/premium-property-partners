import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Twilio status callback — final summary + sentiment via AI
─────────────────────────────────────────────────────────────── */

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return new Response("ok");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const form = await req.formData();
    const callStatus = (form.get("CallStatus") as string) || "";
    const duration = parseInt((form.get("CallDuration") as string) || "0", 10);
    const recordingUrl = (form.get("RecordingUrl") as string) || "";

    const updates: any = { status: callStatus || "unknown" };
    if (duration) updates.call_duration_seconds = duration;
    if (recordingUrl) updates.recording_url = `${recordingUrl}.mp3`;
    if (["completed", "failed", "busy", "no-answer", "canceled"].includes(callStatus)) {
      updates.ended_at = new Date().toISOString();
      // Cost estimate: ~$0.013/min outbound RO + ~$0.002/min recording
      if (duration) updates.cost_estimate_usd = +((duration / 60) * 0.015).toFixed(4);
    }

    await supabase.from("voice_call_sessions").update(updates).eq("id", sessionId);

    // Generate AI summary on completion
    if (callStatus === "completed" && LOVABLE_API_KEY) {
      const { data: session } = await supabase
        .from("voice_call_sessions")
        .select("transcript, call_objective")
        .eq("id", sessionId)
        .maybeSingle();

      if (session?.transcript && Array.isArray(session.transcript) && session.transcript.length > 1) {
        const transcriptText = (session.transcript as any[])
          .map((t) => `${t.role === "user" ? "Client" : "Ana"}: ${t.text}`)
          .join("\n")
          .slice(0, 6000);

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Analizează acest apel telefonic AI și returnează STRICT JSON:
{
  "summary": "1-2 propoziții despre ce a vrut clientul",
  "outcome": "interesat|neinteresat|callback|programare|robot|nicio_legatura",
  "sentiment": "pozitiv|neutru|negativ",
  "next_action": "acțiune recomandată următoare (max 1 propoziție)",
  "appointment_iso": "ISO date dacă s-a stabilit întâlnire, altfel null"
}`,
              },
              { role: "user", content: transcriptText },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content?.trim() || "{}";
          let parsed: any = {};
          try { parsed = JSON.parse(raw.replace(/```json\n?|```/g, "").trim()); } catch {}

          await supabase.from("voice_call_sessions").update({
            ai_summary: parsed.summary || null,
            ai_outcome: parsed.outcome || null,
            ai_sentiment: parsed.sentiment || null,
            next_action: parsed.next_action || null,
            appointment_scheduled_at: parsed.appointment_iso || null,
          }).eq("id", sessionId);
        }
      }
    }

    return new Response("ok");
  } catch (e: any) {
    console.error("voice-agent-status error:", e);
    return new Response("ok");
  }
});
