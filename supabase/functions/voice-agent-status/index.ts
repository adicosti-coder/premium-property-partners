import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function pushDebugLog(supabase: any, sessionId: string, entry: Record<string, unknown>) {
  try {
    const { data } = await supabase
      .from("voice_call_sessions")
      .select("debug_log")
      .eq("id", sessionId)
      .maybeSingle();
    const existing = Array.isArray(data?.debug_log) ? data!.debug_log : [];
    const next = [...existing, { at: new Date().toISOString(), ...entry }].slice(-100);
    await supabase.from("voice_call_sessions").update({ debug_log: next }).eq("id", sessionId);
  } catch (e) {
    console.error("status pushDebugLog failed:", e);
  }
}

/* ──────────────────────────────────────────────────────────────
   Twilio status callback — final summary + notifications
─────────────────────────────────────────────────────────────── */

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) return new Response("ok");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const form = await req.formData();
    const callStatus = String(form.get("CallStatus") || "");
    const duration = parseInt(String(form.get("CallDuration") || "0"), 10);
    const recordingUrl = String(form.get("RecordingUrl") || "");
    const hasRecording = !!recordingUrl;
    const recordingStatus = String(form.get("RecordingStatus") || "");
    const callbackType = hasRecording || recordingStatus ? "recording" : "call";

    const { data: session } = await supabase
      .from("voice_call_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return new Response("ok");

    const updates: Record<string, unknown> = {};
    const finalStatuses = ["completed", "failed", "busy", "no-answer", "canceled", "unknown"];
    const recordingReady = hasRecording && (!recordingStatus || ["completed", "absent"].includes(recordingStatus));

    if (callbackType === "call") {
      if (callStatus) updates.status = callStatus;
    } else if (recordingReady) {
      updates.status = finalStatuses.includes(session.status || "")
        ? session.status
        : "completed";
    }

    if (duration > 0) updates.call_duration_seconds = duration;
    if (recordingReady) updates.recording_url = `${recordingUrl}.mp3`;

    const derivedStatus = callbackType === "call"
      ? (callStatus || session.status || "unknown")
      : (recordingReady
          ? (finalStatuses.includes(session.status || "") ? session.status : "completed")
          : (session.status || "unknown"));

    if (finalStatuses.includes(derivedStatus)) {
      updates.status = derivedStatus;
      updates.ended_at = new Date().toISOString();
      if (duration > 0) {
        updates.cost_estimate_usd = +((duration / 60) * 0.015).toFixed(4);
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("voice_call_sessions").update(updates).eq("id", sessionId);
    }

    const transcript = Array.isArray(session.transcript) ? session.transcript : [];
    const assistantText = transcript
      .filter((t: any) => t.role === "assistant")
      .map((t: any) => String(t.text || ""))
      .join(" ")
      .toLowerCase();

    let detectedLanguage: "ro" | "en" | "unknown" = "unknown";
    const roDiacritics = /[ăâîșşțţ]/.test(assistantText);
    const roWords = (assistantText.match(/\b(și|sau|este|sunt|pentru|dumneavoastră|bună|mulțumesc|revedere|proprietate|vă|vânzare|închiriere|imobiliare|salut|ziua|programare)\b/g) || []).length;
    const enWords = (assistantText.match(/\b(the|and|you|are|hello|sorry|thank|please|property|good|day|morning|today)\b/g) || []).length;
    if (assistantText.length >= 10) {
      if (roDiacritics || roWords >= 2) detectedLanguage = "ro";
      else if (enWords >= 2 && roWords === 0) detectedLanguage = "en";
    }

    const fallbackReport = {
      summary: derivedStatus === "completed"
        ? "Apel foarte scurt. S-a redat mesajul inițial, dar conversația nu a continuat suficient pentru calificare completă."
        : `Apel încheiat cu status ${derivedStatus}.`,
      outcome: derivedStatus === "busy" ? "callback" : derivedStatus === "completed" ? "callback" : "nicio_legatura",
      sentiment: "neutru",
      next_action: "Rulează din nou testul complet și verifică limba, durata și înregistrarea.",
      appointment_iso: null,
    };

    const latestRecordingUrl = recordingReady ? `${recordingUrl}.mp3` : session.recording_url || null;
    const reportStatusReached = finalStatuses.includes(derivedStatus);
    const shouldCreateReport = !session.ai_summary && (reportStatusReached || recordingReady);

    await pushDebugLog(supabase, sessionId, {
      stage: "status_callback",
      callbackType,
      callStatus,
      recordingStatus,
      hasRecording,
      recordingReady,
      duration,
      derivedStatus,
      reportStatusReached,
      detectedLanguage,
      transcriptLen: transcript.length,
      hasExistingSummary: !!session.ai_summary,
      shouldCreateReport,
      reportSkipReason: !shouldCreateReport
        ? (session.ai_summary ? "report_already_exists" : `not_final_yet (status=${derivedStatus}, recordingReady=${recordingReady})`)
        : null,
      recordingUrl: latestRecordingUrl,
    });

    if (shouldCreateReport) {
      if (detectedLanguage === "en" && (session.language_retry_count || 0) < 1) {
        const retryPrompt = `Bună ziua! Acesta este un nou apel RealTrust, exclusiv în limba română. Vă rog să mă scuzați pentru apelul anterior. Testul vocal în limba română începe acum și se încheie după acest mesaj. La revedere!`;
        fetch(`${SUPABASE_URL}/functions/v1/voice-agent-initiate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            "x-language-retry": sessionId,
          },
          body: JSON.stringify({
            toNumber: session.to_number,
            scraperLeadId: session.scraper_lead_id || undefined,
            leadId: session.lead_id || undefined,
            objective: session.call_objective || "qualify",
            customPrompt: retryPrompt,
            languageRetryOf: sessionId,
            forceElevenLabs: true,
          }),
        }).catch((e) => console.error("[voice-status] language retry failed", e));

        await supabase
          .from("voice_call_sessions")
          .update({ language_retry_count: (session.language_retry_count || 0) + 1 })
          .eq("id", sessionId);
      }

      let parsed: any = fallbackReport;
      const transcriptText = transcript
        .map((t: any) => `${t.role === "user" ? "Client" : "Ana"}: ${t.text}`)
        .join("\n")
        .slice(0, 6000);

      if (LOVABLE_API_KEY && transcriptText.trim()) {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Analizează apelul și returnează STRICT JSON cu cheile: summary, outcome, sentiment, next_action, appointment_iso. Valorile outcome permise: interesat, neinteresat, callback, programare, robot, nicio_legatura.`,
              },
              { role: "user", content: transcriptText },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content?.trim() || "{}";
          try {
            parsed = { ...fallbackReport, ...JSON.parse(raw.replace(/```json\n?|```/g, "").trim()) };
          } catch {
            parsed = fallbackReport;
          }
        }
      }

      await supabase.from("voice_call_sessions").update({
        status: derivedStatus,
        detected_language: detectedLanguage,
        ai_summary: parsed.summary || fallbackReport.summary,
        ai_outcome: parsed.outcome || fallbackReport.outcome,
        ai_sentiment: parsed.sentiment || fallbackReport.sentiment,
        next_action: parsed.next_action || fallbackReport.next_action,
        appointment_scheduled_at: parsed.appointment_iso || null,
      }).eq("id", sessionId);

      // Finalize script test log (if any was created at turn 0)
      try {
        const finalLogStatus = reportStatusReached
          ? (derivedStatus === "completed" ? "success" : "failed")
          : "pending";
        await supabase
          .from("voice_agent_script_test_logs")
          .update({
            status: finalLogStatus,
            outcome: parsed.outcome || fallbackReport.outcome,
            call_duration_seconds: duration || session.call_duration_seconds || 0,
            transcript_turns: transcript.length,
          })
          .eq("session_id", sessionId);
      } catch (logErr) {
        console.error("[voice-status] failed to finalize test log:", logErr);
      }


      if (session.prospect_listing_id) {
        const outcomeToLifecycle: Record<string, string> = {
          interesat: "interested",
          programare: "interested",
          callback: "callback",
          neinteresat: "rejected",
          robot: "rejected",
          nicio_legatura: "rejected",
        };

        const nextLifecycle = outcomeToLifecycle[parsed.outcome] || (derivedStatus === "completed" ? "callback" : "rejected");
        const summaryText = String(parsed.summary || fallbackReport.summary || "").slice(0, 500);

        await supabase
          .from("prospect_listings")
          .update({
            lifecycle_status: nextLifecycle as any,
            call_summary: summaryText,
            auto_call_triggered_at: null,
          })
          .eq("id", session.prospect_listing_id);
      }

      try {
        const { data: notifySettings } = await supabase
          .from("voice_agent_settings")
          .select("notify_email, notify_email_enabled, notify_whatsapp_enabled")
          .eq("id", 1)
          .maybeSingle();

        const transcriptShort = transcript
          .slice(-12)
          .map((t: any) => `${t.role === "user" ? "👤 Client" : "🤖 Ana"}: ${t.text}`)
          .join("\n");

        const recordingLink = latestRecordingUrl;
        const outcomeEmoji: Record<string, string> = {
          interesat: "✅",
          programare: "📅",
          callback: "🔁",
          neinteresat: "❌",
          robot: "🤖",
          nicio_legatura: "🚫",
        };
        const subject = `${outcomeEmoji[parsed.outcome] || "📞"} Apel AI ${parsed.outcome || "finalizat"} — ${session.to_number}`;

        if (notifySettings?.notify_email_enabled !== false && notifySettings?.notify_email) {
          const html = `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;padding:24px;background:#fafafa;">
              <h2 style="color:#1a1a1a;">${outcomeEmoji[parsed.outcome] || "📞"} Apel AI finalizat</h2>
              <p><strong>Către:</strong> ${session.to_number}</p>
              <p><strong>Durata:</strong> ${duration || session.call_duration_seconds || 0}s</p>
              <p><strong>Limba detectată:</strong> ${detectedLanguage}</p>
              <p><strong>Rezultat:</strong> ${parsed.outcome || "—"} (${parsed.sentiment || "—"})</p>
              <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e5e5e5;margin:16px 0;">
                <strong>Sinteză AI:</strong><br/>${parsed.summary || "—"}
              </div>
              ${parsed.next_action ? `<p><strong>Următoarea acțiune:</strong> ${parsed.next_action}</p>` : ""}
              ${recordingLink ? `<p><a href="${recordingLink}" style="background:#2563eb;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;">🎧 Ascultă înregistrarea</a></p>` : ""}
              <h3 style="margin-top:24px;">Transcript</h3>
              <pre style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:13px;line-height:1.5;">${transcriptShort || "Fără transcript disponibil"}</pre>
            </div>`;

          fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to: notifySettings.notify_email,
              subject,
              html,
              purpose: "transactional",
              idempotency_key: `voice-call-${sessionId}`,
            }),
          }).catch((e) => console.error("Email notify failed:", e));
        }

        if (notifySettings?.notify_whatsapp_enabled !== false && MAKE_WEBHOOK_URL) {
          fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "voice_call_admin_summary",
              to_number: session.to_number,
              duration_seconds: duration || session.call_duration_seconds || 0,
              outcome: parsed.outcome,
              sentiment: parsed.sentiment,
              summary: parsed.summary,
              next_action: parsed.next_action,
              recording_url: recordingLink,
              session_id: sessionId,
            }),
          }).catch((e) => console.error("WhatsApp admin notify failed:", e));
        }
      } catch (notifyErr) {
        console.error("Post-call notification error:", notifyErr);
      }
    } else if (session.prospect_listing_id && finalStatuses.includes(derivedStatus)) {
      const MAX_RETRIES = 2;
      const transientStatuses = ["failed", "busy", "no-answer", "canceled"];
      const isTransient = transientStatuses.includes(derivedStatus);

      const { data: prospectRow } = await supabase
        .from("prospect_listings")
        .select("retry_count")
        .eq("id", session.prospect_listing_id)
        .maybeSingle();
      const currentRetries = Number((prospectRow as any)?.retry_count || 0);

      if (isTransient) {
        const nextRetry = currentRetries + 1;
        const exhausted = nextRetry > MAX_RETRIES;
        const failureReason = `call_${derivedStatus} (attempt ${nextRetry}/${MAX_RETRIES + 1})`;

        await supabase
          .from("prospect_listings")
          .update({
            lifecycle_status: exhausted ? ("failed" as any) : ("new" as any),
            auto_call_triggered_at: null,
            retry_count: nextRetry,
            last_retry_at: new Date().toISOString(),
            last_failure_reason: failureReason,
            voice_call_session_id: exhausted ? session.id : null,
          })
          .eq("id", session.prospect_listing_id);

        // Schedule async re-dial (don't block status callback)
        if (!exhausted) {
          const retryDelayMs = 30_000; // 30s breathing room
          setTimeout(() => {
            fetch(`${SUPABASE_URL}/functions/v1/voice-agent-auto-dial`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                prospect_id: session.prospect_listing_id,
                manual: true,
                retry: true,
              }),
            }).catch((e) => console.error("[voice-status] retry dial failed", e));
          }, retryDelayMs);
        }
      } else {
        // Completed without report (edge case) — leave as callback for human review
        await supabase
          .from("prospect_listings")
          .update({
            lifecycle_status: "callback" as any,
            auto_call_triggered_at: null,
          })
          .eq("id", session.prospect_listing_id);
      }
    }

    return new Response("ok");
  } catch (e: any) {
    console.error("voice-agent-status error:", e);
    return new Response("ok");
  }
});
