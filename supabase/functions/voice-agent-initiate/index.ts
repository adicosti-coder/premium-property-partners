import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ──────────────────────────────────────────────────────────────
   AI Voice Agent — initiate outbound call via Twilio
   Body: { toNumber, scraperLeadId?, leadId?, objective?, customPrompt? }
─────────────────────────────────────────────────────────────── */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      return new Response(JSON.stringify({
        error: "Twilio nu este conectat. Adaugă conectorul Twilio + secretul TWILIO_FROM_NUMBER (numărul tău Twilio E.164, ex: +14155551234).",
        missing: {
          LOVABLE_API_KEY: !LOVABLE_API_KEY,
          TWILIO_API_KEY: !TWILIO_API_KEY,
          TWILIO_FROM_NUMBER: !TWILIO_FROM_NUMBER,
        },
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is admin OR is an internal language-retry call (server-to-server)
    const authHeader = req.headers.get("Authorization");
    const languageRetryHeader = req.headers.get("x-language-retry");
    const isInternalRetry = !!languageRetryHeader && authHeader === `Bearer ${SERVICE_KEY}`;

    if (!isInternalRetry) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Auth required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      (globalThis as any).__initiator_user_id = user.id;
    }

    const body = await req.json();
    const { toNumber, scraperLeadId, leadId, objective = "qualify", customPrompt, languageRetryOf, forceElevenLabs } = body;
    const hasCustomPrompt = typeof customPrompt === "string" && customPrompt.trim().length > 0;
    const initiatorUserId: string | null = isInternalRetry
      ? null
      : (globalThis as any).__initiator_user_id || null;

    if (!toNumber || !/^\+[1-9]\d{6,14}$/.test(toNumber)) {
      return new Response(JSON.stringify({ error: "toNumber invalid (format E.164: +407...)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pre-flight: phone intelligence guard (skip voip/landline/unreachable) ──
    // Internal language-retry calls bypass this guard — same number, intentional re-dial.
    const { data: agentSettings } = await supabase
      .from("voice_agent_settings")
      .select("amd_enabled, amd_timeout_seconds, skip_voip, skip_landline, phone_lookup_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (!isInternalRetry && agentSettings?.phone_lookup_enabled !== false) {
      const { data: pi } = await supabase
        .from("phone_intelligence")
        .select("line_type, is_unreachable, is_blacklisted")
        .eq("phone_number", toNumber)
        .maybeSingle();

      const skipReason =
        pi?.is_blacklisted ? "phone_blacklisted" :
        pi?.is_unreachable ? "phone_unreachable" :
        (pi?.line_type === "voip" && agentSettings?.skip_voip !== false) ? "phone_voip_skipped" :
        (pi?.line_type === "landline" && agentSettings?.skip_landline === true) ? "phone_landline_skipped" :
        null;

      if (skipReason) {
        return new Response(JSON.stringify({ skipped: skipReason, line_type: pi?.line_type, message: `Apel blocat de pre-flight intelligence: ${skipReason}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch lead context for personalised prompt
    let leadContext = "";
    if (scraperLeadId) {
      const { data: lead } = await supabase
        .from("scraper_leads")
        .select("title, price, location, listing_type, prospect_category, agency_name")
        .eq("id", scraperLeadId)
        .maybeSingle();
      if (lead) {
        leadContext = `Lead context: ${lead.title || ""} - ${lead.location || ""} - preț ${lead.price || "?"} EUR - tip: ${lead.listing_type} - prospect: ${lead.prospect_category || "?"}.`;
      }
    } else if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, property_type, property_area, message")
        .eq("id", leadId)
        .maybeSingle();
      if (lead) {
        leadContext = `Lead context: ${lead.name} - ${lead.property_type} ${lead.property_area}mp. Mesaj: ${(lead.message || "").slice(0, 200)}`;
      }
    }

    const agentPrompt = hasCustomPrompt
      ? `__CUSTOM_PROMPT__\n${customPrompt.trim()}`
      : `Ești Andrei, concierge vocal RealTrust, agenție de imobiliare premium din Timișoara. Suni amabil un potențial client. ${leadContext} Obiectiv: ${objective === "qualify" ? "calificare interes (buget, timeline, tip proprietate)" : objective === "schedule" ? "programare vizionare/întâlnire" : "follow-up"}. Vorbești scurt, natural, în limba română. Maxim 2-3 propoziții per replică. Dacă nu răspunde sau pare deranjat, închizi politicos.`;

    // Create session row first (so webhook can find it via call_sid)
    const { data: session, error: sessErr } = await supabase
      .from("voice_call_sessions")
      .insert({
        to_number: toNumber,
        from_number: TWILIO_FROM_NUMBER,
        scraper_lead_id: scraperLeadId || null,
        lead_id: leadId || null,
        initiated_by: initiatorUserId,
        status: "initiating",
        call_objective: objective,
        voice_agent_prompt: agentPrompt,
        direction: "outbound",
        language_retry_of: languageRetryOf || null,
      })
      .select()
      .single();

    if (sessErr || !session) throw new Error(`DB insert failed: ${sessErr?.message}`);

    // Build TwiML webhook URL with session id
    const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${session.id}${forceElevenLabs ? "&forceElevenLabs=1" : ""}`;
    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-agent-status?sessionId=${session.id}`;

    // Initiate call via Twilio gateway
    const formBody = new URLSearchParams({
      To: toNumber,
      From: TWILIO_FROM_NUMBER,
      Url: twimlUrl,
      StatusCallback: statusUrl,
      StatusCallbackEvent: "initiated ringing answered completed",
      Record: "true",
      RecordingStatusCallback: statusUrl,
    });

    const twRes = await fetch(`${GATEWAY_URL}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const twData = await twRes.json();
    if (!twRes.ok) {
      await supabase.from("voice_call_sessions").update({
        status: "failed",
        error_message: `Twilio ${twRes.status}: ${JSON.stringify(twData).slice(0, 500)}`,
        ended_at: new Date().toISOString(),
      }).eq("id", session.id);
      return new Response(JSON.stringify({ error: "Twilio call failed", details: twData }), {
        status: twRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("voice_call_sessions").update({
      twilio_call_sid: twData.sid,
      status: "queued",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);

    return new Response(JSON.stringify({ success: true, sessionId: session.id, callSid: twData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("voice-agent-initiate error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
