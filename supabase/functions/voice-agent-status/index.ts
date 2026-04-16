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
        .select("transcript, call_objective, scraper_lead_id, prospect_listing_id, to_number")
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
