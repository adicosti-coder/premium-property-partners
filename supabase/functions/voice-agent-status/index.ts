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
        .select("transcript, call_objective, scraper_lead_id, prospect_listing_id, lead_id, to_number, voice_agent_prompt, language_retry_count, initiated_by")
        .eq("id", sessionId)
        .maybeSingle();

      if (session?.transcript && Array.isArray(session.transcript) && session.transcript.length > 1) {
        const transcriptText = (session.transcript as any[])
          .map((t) => `${t.role === "user" ? "Client" : "Ana"}: ${t.text}`)
          .join("\n")
          .slice(0, 6000);

        // ─── LANGUAGE DETECTION (heuristic + auto-retry if not Romanian) ───
        const assistantText = (session.transcript as any[])
          .filter((t) => t.role === "assistant")
          .map((t) => String(t.text || ""))
          .join(" ")
          .toLowerCase();

        // Romanian markers: diacritics OR common RO words
        const roDiacritics = /[ăâîșşțţ]/.test(assistantText);
        const roWords = (assistantText.match(/\b(și|sau|este|sunt|pentru|dumneavoastră|bună|mulțumesc|revedere|proprietate|vă|vânzare|închiriere|imobiliare|salut|ziua|programare)\b/g) || []).length;
        // English markers (false-positive guard)
        const enWords = (assistantText.match(/\b(the|and|you|are|hello|sorry|thank|please|property|good|day|morning|today)\b/g) || []).length;

        let detectedLanguage: "ro" | "en" | "unknown" = "unknown";
        if (assistantText.length >= 30) {
          if (roDiacritics || roWords >= 3) detectedLanguage = "ro";
          else if (enWords >= 3 && roWords === 0) detectedLanguage = "en";
        }

        await supabase.from("voice_call_sessions").update({
          detected_language: detectedLanguage,
        }).eq("id", sessionId);

        console.log(`[voice-status] sessionId=${sessionId} detectedLanguage=${detectedLanguage} roWords=${roWords} enWords=${enWords} retryCount=${session.language_retry_count || 0}`);

        // Auto-retry once if not Romanian
        if (detectedLanguage === "en" && (session.language_retry_count || 0) < 1) {
          console.log(`[voice-status] Triggering RO-forced retry for session ${sessionId}`);
          // Force ElevenLabs RO + strict Romanian-only prompt
          const ROForcedPrompt = `ATENȚIE CRITICĂ: Vorbești EXCLUSIV în limba ROMÂNĂ. Este STRICT INTERZIS să folosești engleza sau orice altă limbă. Toate replicile tale trebuie să conțină diacritice românești (ă, â, î, ș, ț). Ești Ana de la RealTrust Timișoara. Începe cu: "Bună ziua, sunt Ana de la RealTrust Timișoara. Vă rog să mă scuzați pentru apelul anterior. Îmi cer iertare și aș vrea să continuăm discuția în limba română." Apoi continuă obiectivul: ${session.call_objective || "calificare interes"}. Maxim 2 propoziții per replică. Dacă nu răspunde, închizi politicos cu "Vă mulțumesc, o zi bună!"`;

          // Fire async retry via voice-agent-initiate (non-blocking)
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
              customPrompt: ROForcedPrompt,
              languageRetryOf: sessionId,
              forceElevenLabs: true,
            }),
          }).catch((e) => console.error("[voice-status] Language retry failed:", e));

          // Mark this session as having triggered a retry (so we don't loop)
          await supabase.from("voice_call_sessions").update({
            language_retry_count: (session.language_retry_count || 0) + 1,
          }).eq("id", sessionId);
        }
        // ─── END LANGUAGE DETECTION ───

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

          // ─── Post-call admin notifications (email + WhatsApp) ───
          try {
            const { data: notifySettings } = await supabase
              .from("voice_agent_settings")
              .select("notify_email, notify_email_enabled, notify_whatsapp_enabled")
              .eq("id", 1)
              .maybeSingle();

            const transcriptShort = (session.transcript as any[])
              .slice(-12)
              .map((t) => `${t.role === "user" ? "👤 Client" : "🤖 Ana"}: ${t.text}`)
              .join("\n");

            const recordingLink = recordingUrl ? `${recordingUrl}.mp3` : null;
            const outcomeEmoji: Record<string, string> = {
              interesat: "✅", programare: "📅", callback: "🔁",
              neinteresat: "❌", robot: "🤖", nicio_legatura: "🚫",
            };
            const subject = `${outcomeEmoji[parsed.outcome] || "📞"} Apel AI ${parsed.outcome || "finalizat"} — ${session.to_number}`;

            // Email via send-transactional-email
            if (notifySettings?.notify_email_enabled !== false && notifySettings?.notify_email) {
              const html = `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; padding: 24px; background: #fafafa;">
                  <h2 style="color: #1a1a1a;">${outcomeEmoji[parsed.outcome] || "📞"} Apel AI finalizat</h2>
                  <p><strong>Către:</strong> ${session.to_number}</p>
                  <p><strong>Durata:</strong> ${duration}s</p>
                  <p><strong>Rezultat:</strong> ${parsed.outcome || "—"} (${parsed.sentiment || "—"})</p>
                  <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e5e5; margin: 16px 0;">
                    <strong>Sinteză AI:</strong><br/>${parsed.summary || "—"}
                  </div>
                  ${parsed.next_action ? `<p><strong>Următoarea acțiune:</strong> ${parsed.next_action}</p>` : ""}
                  ${parsed.appointment_iso ? `<p><strong>📅 Programare:</strong> ${parsed.appointment_iso}</p>` : ""}
                  ${recordingLink ? `<p><a href="${recordingLink}" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">🎧 Ascultă înregistrarea</a></p>` : ""}
                  <h3 style="margin-top: 24px;">Transcript</h3>
                  <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-size: 13px; line-height: 1.5;">${transcriptShort}</pre>
                  <p style="color: #666; font-size: 12px; margin-top: 24px;">RealTrust Voice Agent · Session ${sessionId.slice(0, 8)}</p>
                </div>
              `;
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

            // WhatsApp summary via MAKE_WEBHOOK_URL
            const MAKE_WEBHOOK_URL_ADMIN = Deno.env.get("MAKE_WEBHOOK_URL");
            if (notifySettings?.notify_whatsapp_enabled !== false && MAKE_WEBHOOK_URL_ADMIN) {
              fetch(MAKE_WEBHOOK_URL_ADMIN, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "voice_call_admin_summary",
                  admin_phone: "+40752149999",
                  to_number: session.to_number,
                  duration_seconds: duration,
                  outcome: parsed.outcome,
                  sentiment: parsed.sentiment,
                  summary: parsed.summary,
                  next_action: parsed.next_action,
                  appointment_iso: parsed.appointment_iso,
                  recording_url: recordingLink,
                  session_id: sessionId,
                  message: `${outcomeEmoji[parsed.outcome] || "📞"} Apel AI ${session.to_number} (${duration}s)\n*Rezultat:* ${parsed.outcome}\n*Sinteză:* ${parsed.summary}${parsed.next_action ? `\n*Acțiune:* ${parsed.next_action}` : ""}${recordingLink ? `\n🎧 ${recordingLink}` : ""}`,
                }),
              }).catch((e) => console.error("WhatsApp admin notify failed:", e));
            }
          } catch (notifyErr) {
            console.error("Post-call notification error:", notifyErr);
          }

          // Map outcome → lifecycle status
          const outcomeMap: Record<string, string> = {
            interesat: "interested",
            programare: "interested",
            callback: "callback",
            neinteresat: "rejected",
            robot: "new",
            nicio_legatura: "rejected",
          };
          const newLifecycle = outcomeMap[parsed.outcome] || "calling";
          const MAKE_WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL");
          const realtrustLink = "https://realtrust.ro/pentru-proprietari";

          // ─── Sync prospect_listings (new pipeline) ───
          if (session.prospect_listing_id) {
            await supabase.from("prospect_listings").update({
              call_summary: parsed.summary || null,
              lifecycle_status: newLifecycle,
              admin_notes: parsed.next_action || null,
            }).eq("id", session.prospect_listing_id);

            if (MAKE_WEBHOOK_URL && parsed.outcome === "interesat" || parsed.outcome === "programare") {
              const { data: prospect } = await supabase
                .from("prospect_listings")
                .select("id, contact_name, contact_phone, phone_normalized, location, zone, price, currency, category, prospect_type, title, source_url, lead_score")
                .eq("id", session.prospect_listing_id)
                .maybeSingle();

              const categoryLabel: Record<string, string> = {
                vanzare: "Vânzare",
                inchiriere: "Chirie",
                hotelier: "Regim Hotelier",
              };

              if (MAKE_WEBHOOK_URL) {
                fetch(MAKE_WEBHOOK_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "voice_call_followup_whatsapp",
                    owner_name: prospect?.contact_name || "stimat proprietar",
                    owner_phone: prospect?.phone_normalized || prospect?.contact_phone || session.to_number,
                    offer_type: categoryLabel[prospect?.category || ""] || prospect?.prospect_type || "Imobiliare",
                    offer_type_code: prospect?.category,
                    property: {
                      title: prospect?.title,
                      location: prospect?.location,
                      zone: prospect?.zone,
                      price: prospect?.price,
                      currency: prospect?.currency,
                      source_url: prospect?.source_url,
                      lead_score: prospect?.lead_score,
                    },
                    call: {
                      session_id: sessionId,
                      summary: parsed.summary,
                      outcome: parsed.outcome,
                      sentiment: parsed.sentiment,
                      next_action: parsed.next_action,
                      appointment_iso: parsed.appointment_iso,
                      duration_seconds: duration,
                      recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
                    },
                    realtrust_link: realtrustLink,
                    realtrust_link_text: `Bună ziua${prospect?.contact_name ? " " + prospect.contact_name : ""}, mulțumim pentru discuție! Mai multe detalii despre serviciile noastre RealTrust găsiți aici: ${realtrustLink}`,
                  }),
                }).catch((e) => console.error("Make.com webhook failed:", e));

                await supabase.from("prospect_listings").update({
                  followup_sent_at: new Date().toISOString(),
                }).eq("id", session.prospect_listing_id);
              }
            }
          }

          // ─── Legacy: scraper_leads sync (kept for backward compat) ───
          if (session.scraper_lead_id) {
            await supabase.from("scraper_leads").update({
              call_summary: parsed.summary || null,
              lifecycle_status: newLifecycle,
              admin_notes: parsed.next_action || null,
            }).eq("id", session.scraper_lead_id);

            if (MAKE_WEBHOOK_URL && ["interesat", "programare", "callback"].includes(parsed.outcome)) {
              const { data: lead } = await supabase
                .from("scraper_leads")
                .select("id, phone, location, original_price, category, title, url, lead_score, agency_name")
                .eq("id", session.scraper_lead_id)
                .maybeSingle();

              fetch(MAKE_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "voice_call_followup_whatsapp",
                  owner_name: lead?.agency_name || "stimat proprietar",
                  owner_phone: lead?.phone || session.to_number,
                  offer_type: lead?.category || "Imobiliare",
                  property: lead,
                  call: {
                    session_id: sessionId,
                    summary: parsed.summary,
                    outcome: parsed.outcome,
                    sentiment: parsed.sentiment,
                    next_action: parsed.next_action,
                    appointment_iso: parsed.appointment_iso,
                    duration_seconds: duration,
                    recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
                  },
                  realtrust_link: realtrustLink,
                }),
              }).catch((e) => console.error("Make.com webhook failed:", e));

              await supabase.from("scraper_leads").update({
                followup_sent_at: new Date().toISOString(),
              }).eq("id", session.scraper_lead_id);
            }
          }
        }
      }
    }

    return new Response("ok");
  } catch (e: any) {
    console.error("voice-agent-status error:", e);
    return new Response("ok");
  }
});
