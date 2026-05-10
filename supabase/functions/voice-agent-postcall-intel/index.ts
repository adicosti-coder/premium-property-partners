// Post-call intelligence for Andrei:
// Reads a finalized voice_call_sessions row, calls Gemini to produce
// a structured follow-up draft (WhatsApp + email + next-best-actions),
// and persists it on the session for admin one-click approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, force } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { data: session, error } = await supabase
      .from("voice_call_sessions")
      .select("id, to_number, transcript, ai_summary, ai_outcome, ai_sentiment, next_action, appointment_scheduled_at, prospect_listing_id, lead_id, followup_draft, call_objective, call_duration_seconds")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ────────────────────────────────────────────────────────────
    // DNC (Do Not Call) detection — runs BEFORE follow-up generation.
    // If the caller asked us to stop / explicitly irritated, mark the
    // prospect as DNC so autopilot skips them forever, and skip the
    // follow-up draft (we don't pester DNC people with WhatsApp/email).
    // ────────────────────────────────────────────────────────────
    const transcriptForDnc = Array.isArray(session.transcript)
      ? (session.transcript as any[]).map((t) => String(t?.text || "")).join(" ").toLowerCase()
      : "";
    const summaryLc = String(session.ai_summary || "").toLowerCase();
    const sentimentLc = String(session.ai_sentiment || "").toLowerCase();
    const DNC_PATTERNS = [
      /nu\s+mai\s+sun/i,
      /nu\s+m[ăa]\s+(mai\s+)?sun/i,
      /nu\s+sun(a|aț|ati)i/i,
      /[șs]terge(ț|t)?i?\s+num[ăa]rul/i,
      /scoate(ț|t)?i?\s+num[ăa]rul/i,
      /scoate(ț|t)?i?\s+m[ăa]\s+din/i,
      /opri(ț|t)?i\s+apel/i,
      /nu\s+mai\s+contacta/i,
      /nu\s+m[ăa]\s+(mai\s+)?contacta/i,
      /gdpr/i,
      /anpc/i,
    ];
    const blob = `${transcriptForDnc} ${summaryLc}`;
    const hitDncKeyword = DNC_PATTERNS.some((re) => re.test(blob));
    const isIrritated = /(very_?negative|negativ|iritat|suparat|supărat|nervos|angry)/.test(sentimentLc);
    const shouldDnc = hitDncKeyword || isIrritated;

    if (shouldDnc && session.prospect_listing_id) {
      const reason = hitDncKeyword
        ? "Cuvinte cheie de dezabonare detectate în apel (ex: „nu mai sunați", „ștergeți numărul")."
        : "Sentiment iritat / negativ detectat de AI în timpul apelului.";
      try {
        await supabase
          .from("prospect_listings")
          .update({
            do_not_call: true,
            do_not_call_at: new Date().toISOString(),
            do_not_call_reason: reason,
            lifecycle_status: "failed",
            auto_call_triggered_at: null,
            admin_notes: `DNC auto-marcat după apel ${sessionId}: ${reason}`,
          })
          .eq("id", session.prospect_listing_id);

        // Best-effort admin notification (table may or may not exist)
        try {
          const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
          for (const a of (admins as any[]) || []) {
            await supabase.from("user_notifications").insert({
              user_id: a.user_id,
              title: "🚫 Prospect marcat DNC (Do Not Call)",
              message: `Apel ${sessionId.slice(0, 8)} către ${session.to_number}: ${reason} Prospectul a fost scos din autopilot.`,
              type: "warning",
              action_url: "/admin",
              action_label: "Vezi prospect",
            });
          }
        } catch (_) { /* non-fatal */ }
      } catch (e) {
        console.error("[postcall-intel] DNC update failed", e);
      }

      // Don't generate a follow-up draft for DNC contacts.
      await supabase
        .from("voice_call_sessions")
        .update({ followup_status: "skipped_dnc" })
        .eq("id", sessionId);
      return new Response(JSON.stringify({ ok: true, dnc: true, reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.followup_draft && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect "successful call-back": prospect had a previous busy/no-answer
    // and this call actually connected (>15s OR has summary/outcome).
    let isSuccessfulCallback = false;
    let previousAttempt: { status: string; created_at: string } | null = null;
    if (session.prospect_listing_id) {
      const { data: prosp } = await supabase
        .from("prospect_listings")
        .select("callback_attempts, last_failure_reason")
        .eq("id", session.prospect_listing_id)
        .maybeSingle();
      const hadCallbacks = (prosp as any)?.callback_attempts > 0
        || /busy|no-answer/i.test(String((prosp as any)?.last_failure_reason || ""));
      if (hadCallbacks) {
        const { data: prev } = await supabase
          .from("voice_call_sessions")
          .select("status, created_at, call_duration_seconds")
          .eq("prospect_listing_id", session.prospect_listing_id)
          .neq("id", sessionId)
          .in("status", ["busy", "no-answer"])
          .order("created_at", { ascending: false })
          .limit(1);
        if (prev && prev.length > 0) {
          previousAttempt = { status: (prev[0] as any).status, created_at: (prev[0] as any).created_at };
        }
      }
    }
    const dur = (session as any).call_duration_seconds ?? 0;
    if (previousAttempt && (dur > 15 || session.ai_summary || session.ai_outcome === "interesat" || session.ai_outcome === "programare")) {
      isSuccessfulCallback = true;
    }

    const transcript = Array.isArray(session.transcript) ? session.transcript : [];
    const transcriptText = transcript
      .map((t: any) => `${t.role === "user" ? "Client" : "Andrei"}: ${t.text}`)
      .join("\n")
      .slice(0, 7000);

    const callbackInstructions = isSuccessfulCallback
      ? `\n\n🔁 IMPORTANT — APEL DE TIP "CALL BACK REUȘIT":
• Acesta este un re-apel reușit, după ce am încercat anterior și nu s-a putut prinde clientul.
• Mesajul WhatsApp ȘI body-ul email TREBUIE să înceapă obligatoriu cu propoziția:
  "Mă bucur că am reușit să luăm legătura..."
• Continuă apoi cu un rezumat scurt, concret, al detaliilor discutate (proprietate, preț, interes, întrebări specifice).
• Tonul: cald, recunoscător, profesionist.`
      : "";

    const systemPrompt = `Ești un asistent de top pentru o agenție imobiliară premium din Timișoara (RealTrust).
După apelul telefonic al lui Andrei (concierge vocal AI), generezi un PACHET DE FOLLOW-UP în română, cu diacritice, NICIODATĂ engleză.

REGULI:
• Toate textele sunt în română cu diacritice (ă, â, î, ș, ț).
• WhatsApp: cald, scurt (max 350 caractere), conversațional, cu 1-2 emoji discrete (🏡 ✅ 📞), fără markdown, fără linkuri inventate.
• Email: subiect clar (max 60 caractere) + body profesional dar prietenos (max 800 caractere), salutare "Bună ziua,", semnătură "Echipa RealTrust Timișoara".
• Next-best-actions: 3 acțiuni CONCRETE, fiecare pe sub 12 cuvinte, în ordinea priorității.
• Priority: "high" dacă outcome=interesat/programare, "medium" dacă callback, "low" altfel.
• Dacă transcript-ul e gol sau apelul a eșuat, generezi totuși un follow-up scurt de re-contactare.${callbackInstructions}`;

    const userMsg = `Apel:
- Outcome: ${session.ai_outcome || "necunoscut"}
- Sentiment: ${session.ai_sentiment || "neutru"}
- Sumar: ${session.ai_summary || "(fără sumar)"}
- Următoarea acțiune sugerată: ${session.next_action || "(nespecificată)"}
- Programare propusă: ${session.appointment_scheduled_at || "(niciuna)"}
${isSuccessfulCallback ? `- TIP APEL: CALL BACK REUȘIT (încercare anterioară: ${previousAttempt?.status} la ${previousAttempt?.created_at})` : ""}

Transcript (ultimele 7000 caractere):
${transcriptText || "(transcript indisponibil)"}

Generează acum pachetul de follow-up.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_followup_pack",
            description: "Returnează pachetul de follow-up structurat în română.",
            parameters: {
              type: "object",
              properties: {
                whatsapp_message: { type: "string", description: "Mesaj WhatsApp în română, max 350 caractere." },
                email_subject: { type: "string", description: "Subiect email max 60 caractere." },
                email_body: { type: "string", description: "Body email în română, max 800 caractere." },
                next_actions: {
                  type: "array",
                  items: { type: "string" },
                  description: "3 acțiuni concrete pentru tine, sub 12 cuvinte fiecare.",
                },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                recommended_callback_window: {
                  type: "string",
                  description: "Interval recomandat pentru re-contact, ex: 'mâine 10-12' sau 'în 3 zile'.",
                },
              },
              required: ["whatsapp_message", "email_subject", "email_body", "next_actions", "priority", "recommended_callback_window"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_followup_pack" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("[postcall-intel] AI error", aiRes.status, t.slice(0, 300));
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? "rate_limited" : "credits_exhausted" }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let draft: any = null;
    try {
      draft = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;
    } catch (e) {
      console.error("[postcall-intel] failed to parse tool_call args", e);
    }

    if (!draft) {
      return new Response(JSON.stringify({ error: "ai_no_draft" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    draft.generated_at = new Date().toISOString();
    draft.model = "google/gemini-2.5-flash";
    draft.is_callback_recovery = isSuccessfulCallback;
    if (isSuccessfulCallback && previousAttempt) {
      draft.previous_attempt = previousAttempt;
    }

    await supabase
      .from("voice_call_sessions")
      .update({ followup_draft: draft, followup_status: "pending_review" })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true, draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[postcall-intel] exception", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
