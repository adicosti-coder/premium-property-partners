import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* ──────────────────────────────────────────────────────────────
   Auto-Dial — reads from prospect_listings (lead_score>80, status=new).
   Can be triggered by:
     - cron (no body) → dials top 1 eligible lead per run
     - DB trigger ({triggered_prospect_id}) → dials specific prospect immediately
     - Manual UI ({prospect_id, manual: true}) → bypasses some quota checks
─────────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const triggeredId: string | undefined = body.triggered_prospect_id || body.prospect_id;
    const manual = body.manual === true;

    // Load settings
    const { data: settings } = await supabase
      .from("voice_agent_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!manual && (!settings || !settings.auto_dial_enabled)) {
      return new Response(JSON.stringify({ skipped: "auto_dial disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Time window check (Romania UTC+2)
    if (!manual && settings) {
      const nowUtc = new Date();
      const hourRo = (nowUtc.getUTCHours() + 2) % 24;
      if (hourRo < settings.allowed_hours_start || hourRo >= settings.allowed_hours_end) {
        return new Response(JSON.stringify({ skipped: `outside hours (RO hour ${hourRo})` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      return new Response(JSON.stringify({
        error: "Twilio not configured",
        missing: { LOVABLE_API_KEY: !LOVABLE_API_KEY, TWILIO_API_KEY: !TWILIO_API_KEY, TWILIO_FROM_NUMBER: !TWILIO_FROM_NUMBER },
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Daily quota check
    if (!manual && settings) {
      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: callsToday } = await supabase
        .from("voice_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("direction", "outbound")
        .gte("created_at", startOfDay.toISOString());
      if ((callsToday || 0) >= settings.max_calls_per_day) {
        return new Response(JSON.stringify({ skipped: `daily quota reached (${callsToday})` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Resolve prospect to call
    let prospect: any = null;
    if (triggeredId) {
      const { data } = await supabase
        .from("prospect_listings")
        .select("id, title, category, prospect_type, contact_name, contact_phone, phone_normalized, price, currency, location, zone, lead_score, ai_score_breakdown")
        .eq("id", triggeredId)
        .maybeSingle();
      prospect = data;
    } else {
      // Find top eligible
      const minScore = (settings?.min_lead_score ?? 81);
      const { data: leads } = await supabase
        .from("prospect_listings")
        .select("id, title, category, prospect_type, contact_name, contact_phone, phone_normalized, price, currency, location, zone, lead_score, ai_score_breakdown")
        .gt("lead_score", Math.max(80, minScore - 1))
        .eq("lifecycle_status", "new")
        .not("phone_normalized", "is", null)
        .is("auto_call_triggered_at", null)
        .order("lead_score", { ascending: false })
        .limit(1);
      prospect = leads?.[0];
    }

    if (!prospect) {
      return new Response(JSON.stringify({ skipped: "no eligible prospect" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toNumber = prospect.phone_normalized || prospect.contact_phone;
    if (!toNumber || !/^\+[1-9]\d{6,14}$/.test(toNumber)) {
      await supabase.from("prospect_listings").update({
        lifecycle_status: "rejected",
        admin_notes: `Auto-dial: invalid phone "${prospect.contact_phone}"`,
      }).eq("id", prospect.id);
      return new Response(JSON.stringify({ skipped: `invalid phone: ${prospect.contact_phone}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark prospect as calling (idempotent)
    await supabase.from("prospect_listings").update({
      lifecycle_status: "calling",
      auto_call_triggered_at: new Date().toISOString(),
    }).eq("id", prospect.id);

    // Create voice session
    const { data: session, error: sessErr } = await supabase
      .from("voice_call_sessions")
      .insert({
        to_number: toNumber,
        from_number: TWILIO_FROM_NUMBER,
        prospect_listing_id: prospect.id,
        status: "initiating",
        call_objective: settings?.default_objective || "qualify",
        direction: "outbound",
      })
      .select()
      .single();
    if (sessErr || !session) throw new Error(`DB insert: ${sessErr?.message}`);

    // Link back
    await supabase.from("prospect_listings").update({
      voice_call_session_id: session.id,
    }).eq("id", prospect.id);

    const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-agent-twiml?sessionId=${session.id}`;
    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-agent-status?sessionId=${session.id}`;

    const twRes = await fetch(`https://connector-gateway.lovable.dev/twilio/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNumber,
        From: TWILIO_FROM_NUMBER,
        Url: twimlUrl,
        StatusCallback: statusUrl,
        StatusCallbackEvent: "initiated ringing answered completed",
        Record: "true",
        RecordingStatusCallback: statusUrl,
      }),
    });
    const twData = await twRes.json();

    if (!twRes.ok) {
      await supabase.from("voice_call_sessions").update({
        status: "failed",
        error_message: `Twilio ${twRes.status}: ${JSON.stringify(twData).slice(0, 500)}`,
        ended_at: new Date().toISOString(),
      }).eq("id", session.id);
      // Re-open prospect for retry
      await supabase.from("prospect_listings").update({
        lifecycle_status: "new",
        auto_call_triggered_at: null,
        admin_notes: `Twilio failed: ${JSON.stringify(twData).slice(0, 200)}`,
      }).eq("id", prospect.id);
      return new Response(JSON.stringify({ error: "Twilio failed", details: twData }), {
        status: twRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("voice_call_sessions").update({
      twilio_call_sid: twData.sid,
      status: "queued",
      started_at: new Date().toISOString(),
    }).eq("id", session.id);

    return new Response(JSON.stringify({
      success: true,
      prospect_id: prospect.id,
      lead_score: prospect.lead_score,
      category: prospect.category,
      to: toNumber,
      session_id: session.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("voice-agent-auto-dial error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
